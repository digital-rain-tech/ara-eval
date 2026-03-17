"use client";

import ModelSelector from "./ModelSelector";

interface ContextControlsProps {
  personality: string;
  jurisdiction: string;
  rubric: string;
  model: string;
  defaultModel: string;
  personalities: Record<string, { label: string }>;
  onPersonalityChange: (v: string) => void;
  onJurisdictionChange: (v: string) => void;
  onRubricChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onNewSession: () => void;
}

const JURISDICTION_OPTIONS = [
  { id: "generic", label: "Generic" },
  { id: "hk", label: "HK" },
  { id: "hk-grounded", label: "HK Grounded" },
];

const RUBRIC_OPTIONS = [
  { id: "rubric.md", label: "Full" },
  { id: "rubric-compact.md", label: "Compact" },
  { id: "rubric-bare.md", label: "Bare" },
];

export default function ContextControls({
  personality,
  jurisdiction,
  rubric,
  model,
  defaultModel,
  personalities,
  onPersonalityChange,
  onJurisdictionChange,
  onRubricChange,
  onModelChange,
  onNewSession,
}: ContextControlsProps) {
  return (
    <div className="space-y-2 border-b border-gray-800 pb-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Personality */}
        <div className="flex items-center gap-1.5 text-sm">
          <label className="text-gray-500">Personality:</label>
          <select
            value={personality}
            onChange={(e) => onPersonalityChange(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-300"
          >
            {Object.entries(personalities).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </select>
        </div>

        {/* Jurisdiction */}
        <div className="flex items-center gap-1 text-sm">
          <label className="text-gray-500">Grounding:</label>
          {JURISDICTION_OPTIONS.map((j) => (
            <button
              key={j.id}
              onClick={() => onJurisdictionChange(j.id)}
              className={`rounded px-2 py-1 text-sm transition-colors ${
                jurisdiction === j.id
                  ? "bg-amber-800/40 text-amber-300"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>

        {/* Rubric */}
        <div className="flex items-center gap-1.5 text-sm">
          <label className="text-gray-500">Rubric:</label>
          <select
            value={rubric}
            onChange={(e) => onRubricChange(e.target.value)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-300"
          >
            {RUBRIC_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* New Session */}
        <button
          onClick={onNewSession}
          className="rounded border border-gray-700 px-2 py-1 text-sm text-gray-400 transition-colors hover:border-gray-500 hover:text-gray-200"
        >
          New Session
        </button>
      </div>

      {/* Model selector on second row */}
      <ModelSelector
        value={model}
        defaultModel={defaultModel}
        onChange={onModelChange}
      />
    </div>
  );
}
