/**
 * Challenge generation from fingerprints — reads shared/challenges.json.
 */

import challengesData from "../../../shared/challenges.json";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  type Level,
  type GatingClassification,
} from "./constants";

interface ChallengeEntry {
  constraint: string;
  challenge: string | null;
}

const CHALLENGES = challengesData as Record<
  string,
  Record<string, ChallengeEntry>
>;

export interface AgentChallenge {
  dimension: string;
  dimensionLabel: string;
  level: Level;
  challenge: string;
}

export interface AgentConstraint {
  dimension: string;
  dimensionLabel: string;
  level: Level;
  constraint: string;
}

/**
 * Generate challenges (attack targets) from A-rated dimensions in a fingerprint.
 */
export function generateChallenges(
  fingerprint: Record<string, { level: string }>,
): AgentChallenge[] {
  const challenges: AgentChallenge[] = [];

  for (const dim of DIMENSIONS) {
    const level = fingerprint[dim]?.level as Level;
    if (level !== "A") continue;

    const entry = CHALLENGES[dim]?.[level];
    if (entry?.challenge) {
      challenges.push({
        dimension: dim,
        dimensionLabel: DIMENSION_LABELS[dim],
        level,
        challenge: entry.challenge,
      });
    }
  }

  return challenges;
}

/**
 * Generate all constraints (CAN/CANNOT rules) from a fingerprint.
 */
export function generateConstraints(
  fingerprint: Record<string, { level: string }>,
): AgentConstraint[] {
  const constraints: AgentConstraint[] = [];

  for (const dim of DIMENSIONS) {
    const level = (fingerprint[dim]?.level || "C") as Level;
    const entry = CHALLENGES[dim]?.[level];
    if (entry?.constraint) {
      constraints.push({
        dimension: dim,
        dimensionLabel: DIMENSION_LABELS[dim],
        level,
        constraint: entry.constraint,
      });
    }
  }

  return constraints;
}

/**
 * Format a classification for display.
 */
export function formatClassification(classification: GatingClassification): string {
  switch (classification) {
    case "ready_now":
      return "READY NOW";
    case "ready_with_prerequisites":
      return "READY WITH PREREQUISITES";
    case "human_in_loop_required":
      return "HUMAN-IN-LOOP REQUIRED";
  }
}
