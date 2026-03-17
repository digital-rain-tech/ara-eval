"use client";

import { useState } from "react";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  LEVEL_COLORS,
  type Dimension,
  type Level,
  type GatingClassification,
} from "@/lib/constants";

interface Challenge {
  dimension: string;
  dimensionLabel: string;
  level: Level;
  challenge: string;
}

interface ChallengeBannerProps {
  classification: GatingClassification;
  fingerprintString: string;
  fingerprint: Record<string, { level: string }>;
  challenges: Challenge[];
  triggeredRules: string[];
}

const CLASSIFICATION_STYLES: Record<
  GatingClassification,
  { bg: string; border: string; text: string; label: string }
> = {
  ready_now: {
    bg: "bg-green-900/30",
    border: "border-green-700",
    text: "text-green-400",
    label: "READY NOW",
  },
  ready_with_prerequisites: {
    bg: "bg-yellow-900/30",
    border: "border-yellow-700",
    text: "text-yellow-400",
    label: "READY WITH PREREQUISITES",
  },
  human_in_loop_required: {
    bg: "bg-red-900/30",
    border: "border-red-700",
    text: "text-red-400",
    label: "HUMAN-IN-LOOP REQUIRED",
  },
};

export default function ChallengeBanner({
  classification,
  fingerprintString,
  fingerprint,
  challenges,
  triggeredRules,
}: ChallengeBannerProps) {
  const [showFingerprint, setShowFingerprint] = useState(false);
  const style = CLASSIFICATION_STYLES[classification];

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      {/* Classification header */}
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-sm font-bold ${style.text}`}>
          {style.label}
        </span>
        <code className="font-mono text-xs text-gray-500">
          {fingerprintString}
        </code>
      </div>

      {/* Challenges */}
      {challenges.length > 0 ? (
        <div className="mb-3">
          <p className="mb-2 text-xs font-medium text-gray-400">
            Your targets — can you get the agent to:
          </p>
          <ol className="space-y-1.5">
            {challenges.map((c, i) => (
              <li key={c.dimension} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-800/50 text-xs font-bold text-red-300">
                  {i + 1}
                </span>
                <span className="text-gray-300">{c.challenge}?</span>
                <span className="ml-auto shrink-0 text-xs text-gray-600">
                  {c.dimensionLabel} = {c.level}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="mb-3 text-sm text-gray-400">
          No hard constraints to attack — this agent has wide operational
          freedom. Try finding edge cases in its B/C-level constraints.
        </p>
      )}

      {/* Triggered rules */}
      {triggeredRules.length > 0 && (
        <div className="mb-3 text-xs text-gray-500">
          {triggeredRules.map((rule, i) => (
            <div key={i}>
              <span className="mr-1">&rarr;</span>
              {rule}
            </div>
          ))}
        </div>
      )}

      {/* Collapsible fingerprint */}
      <button
        onClick={() => setShowFingerprint(!showFingerprint)}
        className="text-xs text-gray-600 hover:text-gray-400"
      >
        {showFingerprint ? "Hide" : "Show"} full fingerprint
      </button>
      {showFingerprint && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          {DIMENSIONS.map((dim) => {
            const level = (fingerprint[dim]?.level || "?") as Level;
            return (
              <div key={dim} className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-5 rounded text-center text-[10px] font-bold leading-[10px] text-white ${LEVEL_COLORS[level] || "bg-gray-700"}`}
                >
                  {level}
                </span>
                <span className="text-gray-400">
                  {DIMENSION_LABELS[dim as Dimension]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
