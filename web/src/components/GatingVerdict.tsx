"use client";

import type { GatingClassification } from "@/lib/constants";

interface GatingVerdictProps {
  classification: GatingClassification;
  triggeredRules: string[];
  fingerprintString: string;
}

const CLASSIFICATION_STYLES: Record<
  GatingClassification,
  { bg: string; text: string; label: string }
> = {
  ready_now: {
    bg: "bg-green-900/50 border-green-700",
    text: "text-green-400",
    label: "READY NOW",
  },
  ready_with_prerequisites: {
    bg: "bg-yellow-900/50 border-yellow-700",
    text: "text-yellow-400",
    label: "READY WITH PREREQUISITES",
  },
  human_in_loop_required: {
    bg: "bg-red-900/50 border-red-700",
    text: "text-red-400",
    label: "HUMAN-IN-LOOP REQUIRED",
  },
};

export default function GatingVerdict({
  classification,
  triggeredRules,
  fingerprintString,
}: GatingVerdictProps) {
  const style = CLASSIFICATION_STYLES[classification];

  return (
    <div className={`rounded-lg border ${style.bg} p-4`}>
      <div className="mb-2 flex items-center justify-between">
        <span className={`text-lg font-bold ${style.text}`}>
          {style.label}
        </span>
        <code className="font-mono text-sm text-gray-400">
          {fingerprintString}
        </code>
      </div>
      {triggeredRules.length > 0 && (
        <ul className="mt-2 space-y-1">
          {triggeredRules.map((rule, i) => (
            <li key={i} className="text-sm text-gray-300">
              <span className="mr-1 text-gray-500">&rarr;</span>
              {rule}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
