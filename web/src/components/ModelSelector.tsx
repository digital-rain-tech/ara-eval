"use client";

import { useState } from "react";
import { TESTED_MODELS } from "@/lib/constants";

interface ModelSelectorProps {
  value: string;
  defaultModel: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({
  value,
  defaultModel,
  onChange,
}: ModelSelectorProps) {
  const isCustom =
    value !== "" && !TESTED_MODELS.some((m) => m.id === value);
  const [showCustom, setShowCustom] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : "");

  const handleSelect = (selected: string) => {
    if (selected === "__custom__") {
      setShowCustom(true);
      if (customValue) {
        onChange(customValue);
      }
    } else {
      setShowCustom(false);
      onChange(selected);
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomValue(val);
    onChange(val);
  };

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <label htmlFor="model-select">Model:</label>
      <select
        id="model-select"
        value={showCustom ? "__custom__" : value}
        onChange={(e) => handleSelect(e.target.value)}
        className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
      >
        {TESTED_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — {m.note}
          </option>
        ))}
        <option value="__custom__">Custom...</option>
      </select>
      {showCustom && (
        <input
          value={customValue}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="e.g., meta-llama/llama-3.3-70b-instruct:free"
          className="w-64 rounded border border-gray-700 bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-300 placeholder-gray-600"
        />
      )}
      {value !== defaultModel && (
        <button
          onClick={() => {
            setShowCustom(false);
            onChange(defaultModel);
          }}
          className="text-gray-600 hover:text-gray-400"
        >
          reset
        </button>
      )}
    </div>
  );
}
