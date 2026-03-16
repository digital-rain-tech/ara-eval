/**
 * Shared constants — loaded from shared/dimensions.json (single source of truth).
 *
 * Both Python (ara_eval/core.py) and TypeScript read from the same JSON files
 * in the shared/ directory. UI-only constants (colors) are defined here.
 */

import dimensionsConfig from "../../../shared/dimensions.json";
import modelsConfig from "../../../shared/models.json";

export const DIMENSIONS = dimensionsConfig.dimensions as readonly string[] as readonly Dimension[];

export type Dimension =
  | "decision_reversibility"
  | "failure_blast_radius"
  | "regulatory_exposure"
  | "human_override_latency"
  | "data_confidence"
  | "accountability_chain"
  | "graceful_degradation";

export const DIMENSION_LABELS = dimensionsConfig.dimension_labels as Record<
  Dimension,
  string
>;

export type Level = "A" | "B" | "C" | "D";

export const LEVEL_ORDER = dimensionsConfig.level_order as Record<Level, number>;

// UI-only constants (not shared with Python)
export const LEVEL_COLORS: Record<Level, string> = {
  A: "bg-red-600",
  B: "bg-orange-500",
  C: "bg-yellow-500",
  D: "bg-green-600",
};

export const LEVEL_TEXT_COLORS: Record<Level, string> = {
  A: "text-red-400",
  B: "text-orange-400",
  C: "text-yellow-400",
  D: "text-green-400",
};

// Model list from shared/models.json
export interface ModelInfo {
  id: string;
  label: string;
  note: string;
  success_rate: string;
  is_default: boolean;
}

export const TESTED_MODELS: ModelInfo[] = modelsConfig as ModelInfo[];
export const DEFAULT_MODEL =
  TESTED_MODELS.find((m) => m.is_default)?.id || TESTED_MODELS[0]?.id || "";

export type GatingClassification =
  | "ready_now"
  | "ready_with_prerequisites"
  | "human_in_loop_required";

export interface DimensionResult {
  level: Level;
  reasoning: string;
}

export interface GatingResult {
  classification: GatingClassification;
  triggered_rules: string[];
  fingerprint_string: string;
}

export interface EvaluationResult {
  parsed: {
    dimensions: Record<Dimension, DimensionResult>;
    interpretation?: string;
  };
  gating: GatingResult;
  usage: {
    input_tokens: number | null;
    output_tokens: number | null;
    total_tokens: number | null;
  };
  cost: number | null;
  response_time_ms: number;
  model_used: string | null;
}

export interface Scenario {
  id: string;
  core?: boolean;
  domain: string;
  industry: string;
  risk_tier: string;
  scenario: string;
  reference_fingerprint: Record<string, string>;
  reference_interpretation: string;
  jurisdiction_notes: string;
  structured_context?: {
    subject: string;
    object: string;
    action: string;
    regulatory_triggers: string[];
    time_pressure: string;
    confidence_signal: string;
    reversibility: string;
    blast_radius: string;
  };
}

export interface PersonalityMeta {
  file: string;
  label: string;
}

export interface JurisdictionMeta {
  file: string;
  label: string;
  description: string;
}
