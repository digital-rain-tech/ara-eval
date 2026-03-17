"use client";

import {
  DIMENSIONS,
  DIMENSION_LABELS,
  LEVEL_ORDER,
  LEVEL_TEXT_COLORS,
  type Dimension,
  type DimensionResult,
  type Level,
} from "@/lib/constants";

interface PersonalityDeltaProps {
  results: Record<
    string,
    {
      label: string;
      dimensions: Record<Dimension, DimensionResult>;
    }
  >;
}

interface DeltaInfo {
  dimension: string;
  spread: number;
  levels: Record<string, Level>;
}

export default function PersonalityDelta({ results }: PersonalityDeltaProps) {
  const personalityIds = Object.keys(results);
  if (personalityIds.length < 2) return null;

  const deltas: DeltaInfo[] = [];

  for (const dim of DIMENSIONS) {
    const levels: Record<string, Level> = {};
    for (const pid of personalityIds) {
      levels[results[pid].label] = results[pid].dimensions[dim].level;
    }

    const ordinals = Object.values(levels).map((l) => LEVEL_ORDER[l]);
    const spread = Math.max(...ordinals) - Math.min(...ordinals);

    if (spread > 0) {
      deltas.push({
        dimension: DIMENSION_LABELS[dim],
        spread,
        levels,
      });
    }
  }

  // Sort by spread descending
  deltas.sort((a, b) => b.spread - a.spread);

  if (deltas.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        All stakeholder perspectives agree on every dimension.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Disagreements on {deltas.length}/{DIMENSIONS.length} dimensions:
      </p>
      {deltas.map((delta) => (
        <div key={delta.dimension} className="rounded border border-gray-800 p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-200">
              {delta.dimension}
            </span>
            <span className="text-sm text-gray-500">
              spread: {delta.spread} level{delta.spread > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex gap-4 text-sm">
            {Object.entries(delta.levels).map(([personality, level]) => (
              <span key={personality} className="text-gray-400">
                {personality}:{" "}
                <span className={`font-bold ${LEVEL_TEXT_COLORS[level]}`}>
                  {level}
                </span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
