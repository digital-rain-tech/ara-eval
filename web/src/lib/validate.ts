/**
 * Server-side validation helpers for API routes.
 */

import { TESTED_MODELS } from "./constants";
import { getPersonalities, getJurisdictions } from "./prompts";

const VALID_RUBRICS = new Set(["rubric.md", "rubric-compact.md", "rubric-bare.md"]);

/**
 * Validate a model ID. Accepts tested models and any model ending with :free.
 * Returns null if valid, error message if invalid.
 */
export function validateModel(model: string): string | null {
  if (!model) return "Model ID is required";
  if (TESTED_MODELS.some((m) => m.id === model)) return null;
  if (model.endsWith(":free")) return null;
  return `Model '${model}' is not in the tested model list and is not a free model. Only free models (:free suffix) or tested models are allowed.`;
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
