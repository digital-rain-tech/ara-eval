/**
 * Multi-strategy JSON parser — mirrors ara_eval/core.py parse_llm_json().
 *
 * Strategies (in order):
 *   1. Strip thinking tags and markdown fences, then direct parse
 *   2. jsonrepair for truncated/malformed output
 *   3. Fix common syntax issues (trailing commas, double commas)
 *   4. Brace-counting extraction (handles preamble/postamble text)
 */

import { jsonrepair } from "jsonrepair";

export function parseLlmJson(text: string): Record<string, unknown> {
  let cleaned = text;

  // Pre-processing: strip <think>...</think> tags
  if (cleaned.includes("<think>")) {
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  }

  // Pre-processing: strip markdown code fences
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      const lastFence = cleaned.lastIndexOf("```");
      if (lastFence > firstNewline) {
        cleaned = cleaned.slice(firstNewline + 1, lastFence).trim();
      }
    }
  }

  // Strategy 1: Direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
      return parsed;
  } catch {
    // continue to next strategy
  }

  // Strategy 2: jsonrepair
  try {
    const repaired = jsonrepair(cleaned);
    const parsed = JSON.parse(repaired);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
      return parsed;
  } catch {
    // continue
  }

  // Strategy 3: Fix common syntax issues, then repair
  let syntaxFixed = cleaned;
  syntaxFixed = syntaxFixed.replace(/,,+/g, ","); // double commas
  syntaxFixed = syntaxFixed.replace(/,(\s*[}\]])/g, "$1"); // trailing commas
  try {
    const repaired = jsonrepair(syntaxFixed);
    const parsed = JSON.parse(repaired);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed))
      return parsed;
  } catch {
    // continue
  }

  // Strategy 4: Brace-counting extraction
  const start = cleaned.indexOf("{");
  if (start !== -1) {
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === "{") depth++;
      else if (cleaned[i] === "}") {
        depth--;
        if (depth === 0) {
          const candidate = cleaned.slice(start, i + 1);
          try {
            const repaired = jsonrepair(candidate);
            const parsed = JSON.parse(repaired);
            if (
              typeof parsed === "object" &&
              parsed !== null &&
              !Array.isArray(parsed)
            )
              return parsed;
          } catch {
            // continue
          }
          break;
        }
      }
    }
  }

  throw new Error(
    `All JSON parsing strategies failed. Response preview: ${text.slice(0, 200)}`,
  );
}
