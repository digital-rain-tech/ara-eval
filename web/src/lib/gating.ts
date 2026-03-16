/**
 * Deterministic gating rules — mirrors ara_eval/core.py apply_gating_rules().
 *
 * Gating rules are always applied in code, never delegated to the LLM.
 */

import {
  DIMENSIONS,
  DIMENSION_LABELS,
  type Dimension,
  type DimensionResult,
  type GatingClassification,
  type GatingResult,
  type Level,
} from "./constants";

export function applyGatingRules(
  dimensions: Record<Dimension, DimensionResult>,
): GatingResult {
  const levels: Record<string, Level> = {};
  for (const dim of DIMENSIONS) {
    levels[dim] = dimensions[dim].level;
  }

  const triggered: string[] = [];

  // Hard gates
  if (levels.regulatory_exposure === "A") {
    triggered.push(
      "HARD GATE: Regulatory Exposure = A \u2192 autonomy not permitted",
    );
  }
  if (levels.failure_blast_radius === "A") {
    triggered.push(
      "HARD GATE: Failure Blast Radius = A \u2192 human oversight required",
    );
  }

  // Soft gates — any other dimension at Level A
  for (const dim of DIMENSIONS) {
    if (
      levels[dim] === "A" &&
      dim !== "regulatory_exposure" &&
      dim !== "failure_blast_radius"
    ) {
      triggered.push(
        `SOFT GATE: ${DIMENSION_LABELS[dim]} = A \u2192 requires documented risk acceptance`,
      );
    }
  }

  // Determine classification
  let classification: GatingClassification;
  if (triggered.some((t) => t.includes("HARD GATE"))) {
    classification = "human_in_loop_required";
  } else if (triggered.some((t) => t.includes("SOFT GATE"))) {
    classification = "ready_with_prerequisites";
  } else if (
    DIMENSIONS.every((d) => levels[d] === "C" || levels[d] === "D")
  ) {
    classification = "ready_now";
  } else {
    classification = "ready_with_prerequisites";
  }

  const fingerprint_string = DIMENSIONS.map((d) => levels[d]).join("-");

  return { classification, triggered_rules: triggered, fingerprint_string };
}
