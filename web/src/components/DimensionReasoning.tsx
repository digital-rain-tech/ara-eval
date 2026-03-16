"use client";

import { useState } from "react";
import {
  DIMENSIONS,
  DIMENSION_LABELS,
  LEVEL_TEXT_COLORS,
  type Dimension,
  type DimensionResult,
} from "@/lib/constants";

interface DimensionReasoningProps {
  results: Record<
    string,
    {
      label: string;
      dimensions: Record<Dimension, DimensionResult>;
    }
  >;
}

export default function DimensionReasoning({
  results,
}: DimensionReasoningProps) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const personalityIds = Object.keys(results);

  return (
    <div className="space-y-1">
      {DIMENSIONS.map((dim) => {
        const isExpanded = expandedDim === dim;
        return (
          <div key={dim} className="rounded border border-gray-800">
            <button
              onClick={() => setExpandedDim(isExpanded ? null : dim)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-800/50"
            >
              <span className="text-gray-300">{DIMENSION_LABELS[dim]}</span>
              <div className="flex items-center gap-2">
                {personalityIds.map((pid) => {
                  const level = results[pid].dimensions[dim].level;
                  return (
                    <span
                      key={pid}
                      className={`font-bold ${LEVEL_TEXT_COLORS[level]}`}
                    >
                      {level}
                    </span>
                  );
                })}
                <span className="text-gray-600">{isExpanded ? "\u25B2" : "\u25BC"}</span>
              </div>
            </button>
            {isExpanded && (
              <div className="border-t border-gray-800 px-3 py-2 space-y-2">
                {personalityIds.map((pid) => {
                  const d = results[pid].dimensions[dim];
                  return (
                    <div key={pid} className="text-sm">
                      <span className="font-medium text-gray-400">
                        {results[pid].label}
                      </span>
                      <span
                        className={`ml-2 font-bold ${LEVEL_TEXT_COLORS[d.level]}`}
                      >
                        {d.level}
                      </span>
                      <p className="mt-0.5 text-gray-500">{d.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
