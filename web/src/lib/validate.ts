/**
 * Server-side validation helpers for API routes.
 */

import { getPersonalities, getJurisdictions } from "./prompts";

const VALID_RUBRICS = new Set(["rubric.md", "rubric-compact.md", "rubric-bare.md"]);

/**
 * Approved non-free models. Kept to an explicit allowlist of cheap, vetted
 * models so a visitor can't select an expensive model via the custom field and
 * run up cost. The hosted demo runs on the paid DeepSeek V4 Flash endpoint
 * (set via ARA_MODEL) for reliability — free endpoints rate-limit under load.
 */
const ALLOWED_PAID_MODELS = new Set([
  "deepseek/deepseek-v4-flash",
  "qwen/qwen3-235b-a22b-2507",
]);

/**
 * Validate a model ID. Free models (:free suffix) plus the explicit paid
 * allowlist are permitted. Returns null if valid, error message if invalid.
 */
export function validateModel(model: string): string | null {
  if (!model) return "Model ID is required";
  if (model.endsWith(":free") || ALLOWED_PAID_MODELS.has(model)) return null;
  return `Model not allowed. Use a free model (':free' suffix) or an approved demo model (${[...ALLOWED_PAID_MODELS].join(", ")}).`;
}

/**
 * Validate personality ID against loaded index.
 */
export function validatePersonality(personality: string): string | null {
  const personalities = getPersonalities();
  if (personality in personalities) return null;
  return `Unknown personality '${personality}'. Valid: ${Object.keys(personalities).join(", ")}`;
}

/**
 * Validate jurisdiction ID against loaded index.
 */
export function validateJurisdiction(jurisdiction: string): string | null {
  const jurisdictions = getJurisdictions();
  if (jurisdiction in jurisdictions) return null;
  return `Unknown jurisdiction '${jurisdiction}'. Valid: ${Object.keys(jurisdictions).join(", ")}`;
}

/**
 * Validate rubric filename.
 */
export function validateRubric(rubric: string): string | null {
  if (VALID_RUBRICS.has(rubric)) return null;
  return `Unknown rubric '${rubric}'. Valid: ${[...VALID_RUBRICS].join(", ")}`;
}
