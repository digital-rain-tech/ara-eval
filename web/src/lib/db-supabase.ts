/**
 * Supabase-backed persistence driver. Mirrors db-sqlite.ts signatures.
 *
 * Every write is scoped to the current authenticated Supabase user (anonymous
 * sessions count). Reads rely on RLS policies (auth.uid() = user_id) installed
 * in supabase/migrations/20260420225001_ara_eval_enable_rls.sql — unauthenticated
 * requests see empty results, never other users' rows.
 */

import type { EvaluationResult } from "./constants";
import { createServerClient } from "./supabase-server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// --- Types (mirror db-sqlite.ts) ---

export interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string | null;
  model_requested: string;
  scenario_count: number;
  personality_count: number;
  total_calls: number;
  successful_calls: number;
  failed_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  total_duration_ms: number;
  metadata: string | null;
}

export interface RequestRow {
  id: string;
  created_at: string;
  run_id: string;
  request_id: string;
  model_requested: string;
  model_used: string | null;
  scenario_id: string | null;
  personality: string | null;
  response_status: number | null;
  error_message: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  response_time_ms: number | null;
  fingerprint_string: string | null;
  gating_classification: string | null;
  gating_rules_triggered: string | null;
  raw_request: string | null;
  raw_response: string | null;
  parsed_result: string | null;
  jurisdiction: string | null;
  rubric: string | null;
}

export interface ChatSession {
  session_id: string;
  started_at: string;
  model: string;
  initial_personality: string;
  initial_jurisdiction: string;
  initial_rubric: string;
  message_count: number;
  context_changes: number;
  metadata: string | null;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  created_at: string;
  role: string;
  content: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  response_time_ms: number | null;
}

// --- Helpers ---

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("No authenticated user (anonymous session missing).");
  }
  return user.id;
}

function metadataToString(
  m: Record<string, unknown> | null,
): string | null {
  return m ? JSON.stringify(m) : null;
}

// --- Eval runs ---

export async function createRun(
  model: string,
  scenarioCount: number,
  personalityCount: number,
  totalCalls: number,
  metadata?: Record<string, unknown>,
): Promise<string> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);
  const runId = randomUUID();

  const { error } = await supabase.from("ara_eval_runs").insert({
    run_id: runId,
    user_id: userId,
    model_requested: model,
    scenario_count: scenarioCount,
    personality_count: personalityCount,
    total_calls: totalCalls,
    metadata: metadata ?? null,
  });
  if (error) throw new Error(`createRun: ${error.message}`);
  return runId;
}

export async function updateRun(
  runId: string,
  updates: {
    finished_at?: string;
    successful_calls?: number;
    failed_calls?: number;
    total_input_tokens?: number;
    total_output_tokens?: number;
    total_cost_usd?: number;
    total_duration_ms?: number;
  },
): Promise<void> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("ara_eval_runs")
    .update(updates)
    .eq("run_id", runId);
  if (error) throw new Error(`updateRun: ${error.message}`);
}

export async function listRuns(limit: number = 50): Promise<RunSummary[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_eval_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listRuns: ${error.message}`);
  return (data ?? []).map(rowToRunSummary);
}

export async function getRun(runId: string): Promise<RunSummary | undefined> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_eval_runs")
    .select("*")
    .eq("run_id", runId)
    .maybeSingle();
  if (error) throw new Error(`getRun: ${error.message}`);
  return data ? rowToRunSummary(data) : undefined;
}

function rowToRunSummary(row: Record<string, unknown>): RunSummary {
  return {
    run_id: row.run_id as string,
    started_at: row.started_at as string,
    finished_at: (row.finished_at as string | null) ?? null,
    model_requested: row.model_requested as string,
    scenario_count: row.scenario_count as number,
    personality_count: row.personality_count as number,
    total_calls: row.total_calls as number,
    successful_calls: row.successful_calls as number,
    failed_calls: row.failed_calls as number,
    total_input_tokens: row.total_input_tokens as number,
    total_output_tokens: row.total_output_tokens as number,
    total_cost_usd: row.total_cost_usd as number,
    total_duration_ms: row.total_duration_ms as number,
    metadata: metadataToString(
      row.metadata as Record<string, unknown> | null,
    ),
  };
}

// --- Request log ---

export async function logRequest(params: {
  runId: string;
  requestId: string;
  scenarioId: string;
  personality: string;
  model: string;
  responseStatus: number | null;
  errorMessage: string | null;
  result: EvaluationResult | null;
  rawRequest: unknown;
  rawResponse: unknown;
  jurisdiction: string;
  rubric: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);
  const r = params.result;

  const { error } = await supabase.from("ara_ai_provider_requests").insert({
    run_id: params.runId,
    user_id: userId,
    request_id: params.requestId,
    provider: "openrouter",
    model_requested: params.model,
    model_used: r?.model_used ?? null,
    actual_provider: null,
    use_case: "risk_fingerprinting",
    scenario_id: params.scenarioId,
    personality: params.personality,
    response_status: params.responseStatus,
    error_message: params.errorMessage,
    input_tokens: r?.usage.input_tokens ?? null,
    output_tokens: r?.usage.output_tokens ?? null,
    total_tokens: r?.usage.total_tokens ?? null,
    cost_usd: r?.cost ?? null,
    response_time_ms: r?.response_time_ms ?? null,
    fingerprint_string: r?.gating.fingerprint_string ?? null,
    gating_classification: r?.gating.classification ?? null,
    gating_rules_triggered: r?.gating.triggered_rules ?? null,
    raw_request: params.rawRequest,
    raw_response: params.rawResponse ?? null,
    parsed_result: r?.parsed ?? null,
    openrouter_id: null,
    system_fingerprint: null,
    jurisdiction: params.jurisdiction,
    rubric: params.rubric,
  });
  if (error) throw new Error(`logRequest: ${error.message}`);
}

export async function listRequests(filters?: {
  runId?: string;
  scenarioId?: string;
  personality?: string;
  limit?: number;
}): Promise<RequestRow[]> {
  const supabase = await createServerClient();
  let q = supabase.from("ara_ai_provider_requests").select("*");
  if (filters?.runId) q = q.eq("run_id", filters.runId);
  if (filters?.scenarioId) q = q.eq("scenario_id", filters.scenarioId);
  if (filters?.personality) q = q.eq("personality", filters.personality);
  q = q.order("created_at", { ascending: false }).limit(filters?.limit ?? 100);

  const { data, error } = await q;
  if (error) throw new Error(`listRequests: ${error.message}`);
  return (data ?? []).map(rowToRequestRow);
}

export async function getRequest(
  id: string,
): Promise<RequestRow | undefined> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_ai_provider_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`getRequest: ${error.message}`);
  return data ? rowToRequestRow(data) : undefined;
}

export async function getRunRequests(runId: string): Promise<RequestRow[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_ai_provider_requests")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getRunRequests: ${error.message}`);
  return (data ?? []).map(rowToRequestRow);
}

function rowToRequestRow(row: Record<string, unknown>): RequestRow {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    run_id: row.run_id as string,
    request_id: row.request_id as string,
    model_requested: row.model_requested as string,
    model_used: (row.model_used as string | null) ?? null,
    scenario_id: (row.scenario_id as string | null) ?? null,
    personality: (row.personality as string | null) ?? null,
    response_status: (row.response_status as number | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    input_tokens: (row.input_tokens as number | null) ?? null,
    output_tokens: (row.output_tokens as number | null) ?? null,
    total_tokens: (row.total_tokens as number | null) ?? null,
    cost_usd: (row.cost_usd as number | null) ?? null,
    response_time_ms: (row.response_time_ms as number | null) ?? null,
    fingerprint_string: (row.fingerprint_string as string | null) ?? null,
    gating_classification:
      (row.gating_classification as string | null) ?? null,
    gating_rules_triggered: row.gating_rules_triggered
      ? JSON.stringify(row.gating_rules_triggered)
      : null,
    raw_request: row.raw_request ? JSON.stringify(row.raw_request) : null,
    raw_response: row.raw_response ? JSON.stringify(row.raw_response) : null,
    parsed_result: row.parsed_result
      ? JSON.stringify(row.parsed_result)
      : null,
    jurisdiction: (row.jurisdiction as string | null) ?? null,
    rubric: (row.rubric as string | null) ?? null,
  };
}

// --- Chat ---

export async function createChatSession(params: {
  sessionId: string;
  model: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
}): Promise<void> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);

  const { error } = await supabase.from("ara_chat_sessions").insert({
    session_id: params.sessionId,
    user_id: userId,
    model: params.model,
    initial_personality: params.personality,
    initial_jurisdiction: params.jurisdiction,
    initial_rubric: params.rubric,
  });
  if (error) throw new Error(`createChatSession: ${error.message}`);
}

export async function addChatMessage(params: {
  sessionId: string;
  role: string;
  content: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  responseTimeMs?: number | null;
}): Promise<string> {
  const supabase = await createServerClient();
  const userId = await requireUserId(supabase);
  const id = randomUUID();

  const { error: insErr } = await supabase.from("ara_chat_messages").insert({
    id,
    session_id: params.sessionId,
    user_id: userId,
    role: params.role,
    content: params.content,
    personality: params.personality,
    jurisdiction: params.jurisdiction,
    rubric: params.rubric,
    model: params.model,
    input_tokens: params.inputTokens ?? null,
    output_tokens: params.outputTokens ?? null,
    response_time_ms: params.responseTimeMs ?? null,
  });
  if (insErr) throw new Error(`addChatMessage: ${insErr.message}`);

  // Update session message_count (exclude system messages, matching SQLite).
  const { count } = await supabase
    .from("ara_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", params.sessionId)
    .neq("role", "system");

  if (count !== null) {
    await supabase
      .from("ara_chat_sessions")
      .update({ message_count: count })
      .eq("session_id", params.sessionId);
  }

  return id;
}

export async function updateSessionContextChanges(
  sessionId: string,
): Promise<void> {
  const supabase = await createServerClient();

  const { count } = await supabase
    .from("ara_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("role", "system");

  const { error } = await supabase
    .from("ara_chat_sessions")
    .update({ context_changes: count ?? 0 })
    .eq("session_id", sessionId);
  if (error) throw new Error(`updateSessionContextChanges: ${error.message}`);
}

export async function listChatSessions(
  limit: number = 50,
): Promise<ChatSession[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_chat_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`listChatSessions: ${error.message}`);
  return (data ?? []).map(rowToChatSession);
}

export async function getChatSession(
  sessionId: string,
): Promise<ChatSession | undefined> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_chat_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw new Error(`getChatSession: ${error.message}`);
  return data ? rowToChatSession(data) : undefined;
}

export async function getChatMessages(
  sessionId: string,
): Promise<ChatMessage[]> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from("ara_chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`getChatMessages: ${error.message}`);
  return (data ?? []).map(rowToChatMessage);
}

function rowToChatSession(row: Record<string, unknown>): ChatSession {
  return {
    session_id: row.session_id as string,
    started_at: row.started_at as string,
    model: row.model as string,
    initial_personality: row.initial_personality as string,
    initial_jurisdiction: row.initial_jurisdiction as string,
    initial_rubric: row.initial_rubric as string,
    message_count: row.message_count as number,
    context_changes: row.context_changes as number,
    metadata: metadataToString(
      row.metadata as Record<string, unknown> | null,
    ),
  };
}

function rowToChatMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    session_id: row.session_id as string,
    created_at: row.created_at as string,
    role: row.role as string,
    content: row.content as string,
    personality: row.personality as string,
    jurisdiction: row.jurisdiction as string,
    rubric: row.rubric as string,
    model: row.model as string,
    input_tokens: (row.input_tokens as number | null) ?? null,
    output_tokens: (row.output_tokens as number | null) ?? null,
    response_time_ms: (row.response_time_ms as number | null) ?? null,
  };
}
