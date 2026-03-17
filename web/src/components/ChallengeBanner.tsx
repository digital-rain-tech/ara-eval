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
    bg: "bg-green-900/20",
    border: "border-green-800",
    text: "text-green-400",
    label: "READY NOW",
  },
  ready_with_prerequisites: {
    bg: "bg-yellow-900/20",
    border: "border-yellow-800",
    text: "text-yellow-400",
    label: "READY WITH PREREQUISITES",
  },
  human_in_loop_required: {
    bg: "bg-red-900/20",
    border: "border-red-800",
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
  const [expanded, setExpanded] = useState(false);
  const style = CLASSIFICATION_STYLES[classification];

  return (
    <div className={`rounded border ${style.border} ${style.bg}`}>
      {/* Collapsed: just badge + challenge count */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span className={`text-sm font-bold ${style.text}`}>
          {style.label}
        </span>
        <code className="font-mono text-sm text-gray-600">
          {fingerprintString}
        </code>
        {challenges.length > 0 && (
          <span className="text-sm text-gray-500">
            {challenges.length} target{challenges.length !== 1 ? "s" : ""}
          </span>
        )}
        <span className="ml-auto text-sm text-gray-700">
          {expanded ? "\u2212" : "+"}
        </span>
      </button>

      {/* Expanded: challenges + fingerprint */}
      {expanded && (
        <div className="border-t border-gray-800/50 px-3 pb-3 pt-2">
          {challenges.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-sm text-gray-500">
                Can you get the agent to:
              </p>
              <ol className="space-y-1">
                {challenges.map((c, i) => (
                  <li
                    key={c.dimension}
                    className="flex items-start gap-2 text-sm"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-900/40 text-[10px] font-bold text-red-400">
                      {i + 1}
                    </span>
                    <span className="text-gray-300">{c.challenge}?</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {triggeredRules.length > 0 && (
            <div className="mb-3 space-y-0.5 text-sm text-gray-600">
              {triggeredRules.map((rule, i) => (
                <div key={i}>&rarr; {rule}</div>
              ))}
            </div>
          )}

          {/* Fingerprint grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {DIMENSIONS.map((dim) => {
              const level = (fingerprint[dim]?.level || "?") as Level;
              return (
                <div key={dim} className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] font-bold text-white ${LEVEL_COLORS[level] || "bg-gray-700"}`}
                  >
                    {level}
                  </span>
                  <span className="text-gray-500">
                    {DIMENSION_LABELS[dim as Dimension]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
