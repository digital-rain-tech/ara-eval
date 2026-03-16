/**
 * Shared constants — mirrors ara_eval/core.py DIMENSIONS, LEVEL_ORDER, etc.
 */

export const DIMENSIONS = [
  "decision_reversibility",
  "failure_blast_radius",
  "regulatory_exposure",
  "human_override_latency",
  "data_confidence",
  "accountability_chain",
  "graceful_degradation",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  decision_reversibility: "Decision Reversibility",
  failure_blast_radius: "Failure Blast Radius",
  regulatory_exposure: "Regulatory Exposure",
  human_override_latency: "Decision Time Pressure",
  data_confidence: "Data Confidence",
  accountability_chain: "Accountability Chain",
  graceful_degradation: "Graceful Degradation",
};

export type Level = "A" | "B" | "C" | "D";

export const LEVEL_ORDER: Record<Level, number> = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
};

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
