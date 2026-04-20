"use client";

import {
  DIMENSIONS,
  DIMENSION_LABELS,
  LEVEL_COLORS,
  type Dimension,
  type DimensionResult,
  type Level,
} from "@/lib/constants";
import HelpTip from "./HelpTip";
import { HELP } from "@/lib/help-content";

interface PersonalityResult {
  label: string;
  dimensions: Record<Dimension, DimensionResult>;
}

interface FingerprintMatrixProps {
  results: Record<string, PersonalityResult>;
  referenceFingerprint?: Record<string, string>;
}

function LevelCell({ level }: { level: Level }) {
  return (
    <div
      className={`${LEVEL_COLORS[level]} rounded px-3 py-1.5 text-center text-sm font-bold text-white`}
    >
      {level}
    </div>
  );
}

export default function FingerprintMatrix({
  results,
  referenceFingerprint,
}: FingerprintMatrixProps) {
  const personalityIds = Object.keys(results);

  if (personalityIds.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="py-2 pr-4 text-left font-medium text-gray-400">
              Dimension
            </th>
            {personalityIds.map((pid) => (
              <th
                key={pid}
                className="px-2 py-2 text-center font-medium text-gray-400"
              >
                {results[pid].label}
              </th>
            ))}
            {referenceFingerprint && (
              <th className="px-2 py-2 text-center font-medium text-gray-400">
                Reference
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((dim) => (
            <tr key={dim} className="border-b border-gray-800">
              <td className="py-2 pr-4 text-gray-300">
                <span className="flex items-center gap-1.5">
                  {DIMENSION_LABELS[dim]}
                  {HELP.dimensions[dim] && (
                    <HelpTip content={HELP.dimensions[dim]} align="start" />
                  )}
                </span>
              </td>
              {personalityIds.map((pid) => (
                <td key={pid} className="px-2 py-2 text-center">
                  <LevelCell level={results[pid].dimensions[dim].level} />
                </td>
              ))}
              {referenceFingerprint && (
                <td className="px-2 py-2 text-center">
                  {referenceFingerprint[dim] &&
                  referenceFingerprint[dim] !== "?" ? (
                    <LevelCell
                      level={referenceFingerprint[dim] as Level}
                    />
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
