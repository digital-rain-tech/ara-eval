/**
 * SQLite persistence — mirrors ara_eval/core.py init_db() and log_request().
 *
 * Writes to the same results/ara-eval.db that the Python labs use.
 */

import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { EvaluationResult } from "./constants";

const DB_PATH = path.resolve(process.cwd(), "..", "results", "ara-eval.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure results directory exists
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  initDb(_db);
  return _db;
}

function initDb(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS eval_runs (
      run_id TEXT PRIMARY KEY,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      model_requested TEXT NOT NULL,
      scenario_count INTEGER NOT NULL,
      personality_count INTEGER NOT NULL,
      total_calls INTEGER NOT NULL DEFAULT 0,
      successful_calls INTEGER NOT NULL DEFAULT 0,
      failed_calls INTEGER NOT NULL DEFAULT 0,
      total_input_tokens INTEGER NOT NULL DEFAULT 0,
      total_output_tokens INTEGER NOT NULL DEFAULT 0,
      total_cost_usd REAL NOT NULL DEFAULT 0.0,
      total_duration_ms INTEGER NOT NULL DEFAULT 0,
      python_version TEXT,
      metadata TEXT
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_provider_requests (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      run_id TEXT NOT NULL,
      request_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      model_requested TEXT NOT NULL,
      model_used TEXT,
      actual_provider TEXT,
      use_case TEXT NOT NULL,
      scenario_id TEXT,
      personality TEXT,
      response_status INTEGER,
      error_message TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      total_tokens INTEGER,
      cost_usd REAL,
      response_time_ms INTEGER,
      fingerprint_string TEXT,
      gating_classification TEXT,
      gating_rules_triggered TEXT,
      raw_request TEXT,
      raw_response TEXT,
      parsed_result TEXT,
      openrouter_id TEXT,
      system_fingerprint TEXT,
      jurisdiction TEXT,
      rubric TEXT,
      FOREIGN KEY (run_id) REFERENCES eval_runs(run_id)
    )
  `);

  // Idempotent column migration (matches Python)
  for (const col of ["jurisdiction", "rubric"]) {
    try {
      db.exec(
        `ALTER TABLE ai_provider_requests ADD COLUMN ${col} TEXT`,
      );
    } catch {
      // column already exists
    }
  }

  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_run_id ON ai_provider_requests(run_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_request_id ON ai_provider_requests(request_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_scenario_id ON ai_provider_requests(scenario_id)",
  );
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_scenario_personality ON ai_provider_requests(scenario_id, personality)",
  );
}

export function createRun(
  model: string,
  scenarioCount: number,
  personalityCount: number,
  totalCalls: number,
  metadata?: Record<string, unknown>,
): string {
  const db = getDb();
  const runId = randomUUID();
  db.prepare(
    `INSERT INTO eval_runs
     (run_id, started_at, model_requested, scenario_count, personality_count, total_calls, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    runId,
    new Date().toISOString(),
    model,
    scenarioCount,
    personalityCount,
    totalCalls,
    metadata ? JSON.stringify(metadata) : null,
  );
  return runId;
}

export function updateRun(
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
): void {
  const db = getDb();
  const sets = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(", ");
  const values = Object.values(updates);
  db.prepare(`UPDATE eval_runs SET ${sets} WHERE run_id = ?`).run(
    ...values,
    runId,
  );
}

export function logRequest(params: {
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
}): void {
  const db = getDb();
  const r = params.result;

  db.prepare(
    `INSERT INTO ai_provider_requests
     (id, created_at, run_id, request_id, provider, model_requested,
      model_used, actual_provider, use_case, scenario_id, personality,
      response_status, error_message, input_tokens, output_tokens,
      total_tokens, cost_usd, response_time_ms, fingerprint_string,
      gating_classification, gating_rules_triggered,
      raw_request, raw_response, parsed_result,
      openrouter_id, system_fingerprint, jurisdiction, rubric)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    randomUUID(),
    new Date().toISOString(),
    params.runId,
    params.requestId,
    "openrouter",
    params.model,
    r?.model_used ?? null,
    null,
    "risk_fingerprinting",
    params.scenarioId,
    params.personality,
    params.responseStatus ?? null,
    params.errorMessage,
    r?.usage.input_tokens ?? null,
    r?.usage.output_tokens ?? null,
    r?.usage.total_tokens ?? null,
    r?.cost ?? null,
    r?.response_time_ms ?? null,
    r?.gating.fingerprint_string ?? null,
    r?.gating.classification ?? null,
    r?.gating.triggered_rules
      ? JSON.stringify(r.gating.triggered_rules)
      : null,
    JSON.stringify(params.rawRequest),
    params.rawResponse ? JSON.stringify(params.rawResponse) : null,
    r?.parsed ? JSON.stringify(r.parsed) : null,
    null,
    null,
    params.jurisdiction,
    params.rubric,
  );
}

// --- Query helpers for history/inspector pages ---

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

export function listRuns(limit: number = 50): RunSummary[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT ?",
    )
    .all(limit) as RunSummary[];
}

export function getRun(runId: string): RunSummary | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM eval_runs WHERE run_id = ?")
    .get(runId) as RunSummary | undefined;
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

export function listRequests(filters?: {
  runId?: string;
  scenarioId?: string;
  personality?: string;
  limit?: number;
}): RequestRow[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters?.runId) {
    conditions.push("run_id = ?");
    params.push(filters.runId);
  }
  if (filters?.scenarioId) {
    conditions.push("scenario_id = ?");
    params.push(filters.scenarioId);
  }
  if (filters?.personality) {
    conditions.push("personality = ?");
    params.push(filters.personality);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters?.limit ?? 100;

  return db
    .prepare(
      `SELECT * FROM ai_provider_requests ${where} ORDER BY created_at DESC LIMIT ?`,
    )
    .all(...params, limit) as RequestRow[];
}

export function getRequest(id: string): RequestRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM ai_provider_requests WHERE id = ?")
    .get(id) as RequestRow | undefined;
}

export function getRunRequests(runId: string): RequestRow[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM ai_provider_requests WHERE run_id = ? ORDER BY created_at ASC",
    )
    .all(runId) as RequestRow[];
}
