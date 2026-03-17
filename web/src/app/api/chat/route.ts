import { NextRequest, NextResponse } from "next/server";
import "@/lib/env";
import { DEFAULT_MODEL } from "@/lib/constants";
import { buildSystemPrompt } from "@/lib/prompts";
import {
  createChatSession,
  addChatMessage,
  updateSessionContextChanges,
} from "@/lib/db";
import {
  validateModel,
  validatePersonality,
  validateJurisdiction,
  validateRubric,
} from "@/lib/validate";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set in .env.local");
  return key;
}

interface ChatRequestBody {
  sessionId: string;
  message: string;
  personality: string;
  jurisdiction: string;
  rubric: string;
  model?: string;
  history: { role: string; content: string }[];
  isNewSession?: boolean;
  contextChange?: string;
  mode?: "judge" | "agent";
  agentPrompt?: string; // pre-built agent system prompt (agent mode only)
}

export async function POST(request: NextRequest) {
  const body: ChatRequestBody = await request.json();
  const {
    sessionId,
    message,
    personality,
    jurisdiction,
    rubric = "rubric.md",
    history,
    isNewSession,
    contextChange,
    mode = "judge",
    agentPrompt,
  } = body;
  const model = body.model || process.env.ARA_MODEL || DEFAULT_MODEL;

  if (!sessionId || !message) {
    return NextResponse.json(
      { error: "Missing sessionId or message" },
      { status: 400 },
    );
  }

  // Validate model always
  const modelErr = validateModel(model);
  if (modelErr) {
    return NextResponse.json({ error: modelErr }, { status: 400 });
  }

  // Validate judge-mode params (agent mode uses agentPrompt directly)
  if (mode === "judge") {
    for (const [err] of [
      [validatePersonality(personality)],
      [validateJurisdiction(jurisdiction)],
      [validateRubric(rubric)],
    ]) {
      if (err) {
        return NextResponse.json({ error: err }, { status: 400 });
      }
    }
  }

  if (mode === "agent" && !agentPrompt) {
    return NextResponse.json(
      { error: "Agent mode requires agentPrompt" },
      { status: 400 },
    );
  }

  const apiKey = getApiKey();

  // Create session if new
  if (isNewSession) {
    createChatSession({
      sessionId,
      model,
      personality: mode === "agent" ? `agent:${personality}` : personality,
      jurisdiction,
      rubric,
    });
  }

  // Log context change as system message if applicable
  if (contextChange) {
    addChatMessage({
      sessionId,
      role: "system",
      content: contextChange,
      personality,
      jurisdiction,
      rubric,
      model,
    });
    updateSessionContextChanges(sessionId);
  }

  // Log user message
  addChatMessage({
    sessionId,
    role: "user",
    content: message,
    personality,
    jurisdiction,
    rubric,
    model,
  });

  // Build system prompt based on mode
  const systemPrompt =
    mode === "agent"
      ? agentPrompt!
      : buildSystemPrompt(personality, jurisdiction, rubric);

  // Build messages array for OpenRouter
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...history
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    { role: "user" as const, content: message },
  ];

  const start = performance.now();

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://github.com/digital-rain-tech/ara-eval",
        "X-Title": "ARA-Eval (Agentic Readiness Assessment)",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages,
      }),
    });

    const elapsedMs = Math.round(performance.now() - start);

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `OpenRouter returned ${response.status}: ${errorText.slice(0, 200)}`,
        },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const usage = data.usage || {};

    // Log assistant message
    addChatMessage({
      sessionId,
      role: "assistant",
      content,
      personality,
      jurisdiction,
      rubric,
      model,
      inputTokens: usage.prompt_tokens ?? null,
      outputTokens: usage.completion_tokens ?? null,
      responseTimeMs: elapsedMs,
    });

    return NextResponse.json({
      content,
      input_tokens: usage.prompt_tokens ?? null,
      output_tokens: usage.completion_tokens ?? null,
      response_time_ms: elapsedMs,
      model_used: data.model || model,
    });
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
