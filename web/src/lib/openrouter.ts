/**
 * OpenRouter API interaction — mirrors ara_eval/core.py evaluate_scenario().
 */

import "./env";
import {
  DIMENSIONS,
  LEVEL_ORDER,
  DEFAULT_MODEL,
  type Dimension,
  type DimensionResult,
  type EvaluationResult,
  type Level,
  type Scenario,
} from "./constants";
import { applyGatingRules } from "./gating";
import { parseLlmJson } from "./parse";
import { buildSystemPrompt, buildUserPrompt } from "./prompts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function getModel(): string {
  return process.env.ARA_MODEL || DEFAULT_MODEL;
}

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY not set in .env.local");
  return key;
}

export async function evaluateScenario(
  scenario: Scenario,
  personalityId: string,
  jurisdiction: string = "hk",
  rubric: string = "rubric.md",
  structured: boolean = false,
  modelOverride?: string,
): Promise<EvaluationResult> {
  const model = modelOverride || getModel();
  const apiKey = getApiKey();

  const systemPrompt = buildSystemPrompt(personalityId, jurisdiction, rubric);
  const userContent = buildUserPrompt(scenario, structured);

  const requestBody = {
    model,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
  };

  const start = performance.now();

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/digital-rain-tech/ara-eval",
      "X-Title": "ARA-Eval (Agentic Readiness Assessment)",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  const elapsedMs = Math.round(performance.now() - start);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter returned ${response.status}: ${errorText.slice(0, 200)}`,
    );
  }

  const data = await response.json();

  // Extract content
  const content = data.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error("LLM returned empty content");
  }

  // Parse JSON response
  const parsed = parseLlmJson(content.trim());

  // Validate structure
  if (!parsed.dimensions || typeof parsed.dimensions !== "object") {
    throw new Error(
      `LLM response missing 'dimensions' key. Got: ${Object.keys(parsed).join(", ")}`,
    );
  }

  const dims = parsed.dimensions as Record<string, unknown>;
  const validLevels = new Set(Object.keys(LEVEL_ORDER));

  for (const dim of DIMENSIONS) {
    if (!(dim in dims)) {
      throw new Error(`Missing dimension: ${dim}`);
    }
    const d = dims[dim] as Record<string, unknown>;
    if (!d || typeof d !== "object" || !("level" in d)) {
      throw new Error(`Dimension '${dim}' malformed: expected {level, reasoning}`);
    }
    if (!validLevels.has(d.level as string)) {
      throw new Error(
        `Dimension '${dim}' has invalid level '${d.level}', expected A-D`,
      );
    }
  }

  const validatedDimensions = {} as Record<Dimension, DimensionResult>;
  for (const dim of DIMENSIONS) {
    const d = dims[dim] as { level: string; reasoning?: string };
    validatedDimensions[dim] = {
      level: d.level as Level,
      reasoning: d.reasoning || "",
    };
  }

  const gating = applyGatingRules(validatedDimensions);

  // Extract usage
  const usage = data.usage || {};
  const modelUsed = data.model || model;

  // Extract cost
  let cost: number | null = null;
  if (usage.total_cost !== undefined) {
    cost = usage.total_cost;
  } else if (model.endsWith(":free")) {
    cost = 0.0;
  }

  return {
    parsed: {
      dimensions: validatedDimensions,
      interpretation: (parsed.interpretation as string) || undefined,
    },
    gating,
    usage: {
      input_tokens: usage.prompt_tokens ?? null,
      output_tokens: usage.completion_tokens ?? null,
      total_tokens: usage.total_tokens ?? null,
    },
    cost,
    response_time_ms: elapsedMs,
    model_used: modelUsed,
  };
}

export function getCurrentModel(): string {
  return getModel();
}
