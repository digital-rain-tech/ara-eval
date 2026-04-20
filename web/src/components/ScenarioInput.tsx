"use client";

import { useState, useEffect } from "react";
import type { Scenario } from "@/lib/constants";

type InputMode =
  | "preloaded"
  | "preloaded-structured"
  | "freetext"
  | "structured-form";

const INPUT_MODE_LABELS: Record<InputMode, string> = {
  preloaded: "Pre-loaded Scenario (Unstructured)",
  "preloaded-structured": "Pre-loaded Scenario (Structured)",
  freetext: "Free Text",
  "structured-form": "Structured Form",
};

// Example placeholder text from insurance-claims-001
const EXAMPLE = {
  subject: "e.g., AI claims processing agent (AIA)",
  object:
    "e.g., health insurance claim, HK$180,000, cross-border (Shenzhen policyholder)",
  action: "e.g., approve and disburse payment without human review",
  regulatory_triggers: "e.g., PIPL cross-border data, IA claims requirements",
  time_pressure: "e.g., 48-hour claim SLA, but no hard regulatory deadline",
  confidence_signal: "e.g., 94% historical approval rate, complete documentation",
  reversibility: "e.g., Payment recall possible within 24h, partial recovery after",
  blast_radius: "e.g., Single policyholder, HK$180,000 financial exposure",
};

interface ScenarioInputProps {
  scenarios: Scenario[];
  onSubmit: (scenario: Scenario, structured: boolean) => void;
  loading: boolean;
  onScenarioSelect?: (scenarioId: string) => void;
}

export default function ScenarioInput({
  scenarios,
  onSubmit,
  loading,
  onScenarioSelect,
}: ScenarioInputProps) {
  const [mode, setMode] = useState<InputMode>("preloaded");
  const [selectedId, setSelectedId] = useState<string>("");
  const [freetext, setFreetext] = useState("");
  const [formData, setFormData] = useState({
    domain: "",
    industry: "",
    scenario: "",
    subject: "",
    object: "",
    action: "",
    regulatory_triggers: "",
    time_pressure: "",
    confidence_signal: "",
    reversibility: "",
    blast_radius: "",
    jurisdiction_notes: "",
  });

  // Set default selection when scenarios load
  useEffect(() => {
    if (scenarios.length > 0 && !selectedId) {
      setSelectedId(scenarios[0].id);
      onScenarioSelect?.(scenarios[0].id);
    }
  }, [scenarios, selectedId, onScenarioSelect]);

  const handleSubmit = () => {
    switch (mode) {
      case "preloaded": {
        const s = scenarios.find((sc) => sc.id === selectedId);
        if (s) onSubmit(s, false);
        break;
      }
      case "preloaded-structured": {
        const s = scenarios.find((sc) => sc.id === selectedId);
        if (s) onSubmit(s, true);
        break;
      }
      case "freetext": {
        if (!freetext.trim()) return;
        onSubmit(
          {
            id: `custom-${Date.now()}`,
            domain: "Custom",
            industry: "Custom",
            risk_tier: "medium",
            scenario: freetext,
            reference_fingerprint: {},
            reference_interpretation: "",
            jurisdiction_notes: "",
          },
          false,
        );
        break;
      }
      case "structured-form": {
        if (!formData.scenario.trim()) return;
        onSubmit(
          {
            id: `custom-${Date.now()}`,
            domain: formData.domain || "Custom",
            industry: formData.industry || "Custom",
            risk_tier: "medium",
            scenario: formData.scenario,
            reference_fingerprint: {},
            reference_interpretation: "",
            jurisdiction_notes: formData.jurisdiction_notes,
            structured_context: {
              subject: formData.subject,
              object: formData.object,
              action: formData.action,
              regulatory_triggers: formData.regulatory_triggers
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
              time_pressure: formData.time_pressure,
              confidence_signal: formData.confidence_signal,
              reversibility: formData.reversibility,
              blast_radius: formData.blast_radius,
            },
          },
          true,
        );
        break;
      }
    }
  };

  const selectedScenario = scenarios.find((s) => s.id === selectedId);
  const hasStructuredContext = selectedScenario?.structured_context != null;

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-400">
          Input Mode
        </label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as InputMode)}
          className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
        >
          {Object.entries(INPUT_MODE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Pre-loaded scenario selector */}
      {(mode === "preloaded" || mode === "preloaded-structured") && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-400">
            Scenario
          </label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              onScenarioSelect?.(e.target.value);
            }}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.domain} ({s.industry})
                {s.core ? " *" : ""}
              </option>
            ))}
          </select>
          {selectedScenario && (
            <div className="mt-2 rounded border border-gray-800 bg-gray-900 p-3 text-sm text-gray-400">
              {selectedScenario.scenario}
            </div>
          )}
          {mode === "preloaded-structured" && !hasStructuredContext && (
            <p className="mt-1 text-sm text-yellow-500">
              This scenario has no structured context. Will fall back to
              unstructured.
            </p>
          )}
        </div>
      )}

      {/* Free text input */}
      {mode === "freetext" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-400">
            Scenario Description
          </label>
          <textarea
            value={freetext}
            onChange={(e) => setFreetext(e.target.value)}
            placeholder="Describe an AI agent deployment scenario. Include: what the agent does, what data it uses, what the stakes are, and what alternatives exist..."
            rows={5}
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
          />
        </div>
      )}

      {/* Structured form */}
      {mode === "structured-form" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Domain
              </label>
              <input
                value={formData.domain}
                onChange={(e) =>
                  setFormData({ ...formData, domain: e.target.value })
                }
                placeholder="e.g., Fraud Detection"
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Industry
              </label>
              <input
                value={formData.industry}
                onChange={(e) =>
                  setFormData({ ...formData, industry: e.target.value })
                }
                placeholder="e.g., Banking"
                className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Scenario Narrative
            </label>
            <textarea
              value={formData.scenario}
              onChange={(e) =>
                setFormData({ ...formData, scenario: e.target.value })
              }
              placeholder="Write 3-5 sentences describing the situation..."
              rows={3}
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
            />
          </div>

          <div className="border-t border-gray-800 pt-3">
            <p className="mb-2 text-sm font-medium text-gray-400">
              Structured Context
            </p>
            <div className="space-y-2">
              {(
                [
                  ["subject", "Subject (who acts)"],
                  ["object", "Object (acted upon)"],
                  ["action", "Action (what the agent does)"],
                  ["regulatory_triggers", "Regulatory Triggers (comma-separated)"],
                  ["time_pressure", "Time Pressure"],
                  ["confidence_signal", "Confidence Signal"],
                  ["reversibility", "Reversibility"],
                  ["blast_radius", "Blast Radius"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <label className="mb-0.5 block text-sm text-gray-500">
                    {label}
                  </label>
                  <input
                    value={formData[field]}
                    onChange={(e) =>
                      setFormData({ ...formData, [field]: e.target.value })
                    }
                    placeholder={EXAMPLE[field as keyof typeof EXAMPLE] || ""}
                    className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 placeholder-gray-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Jurisdiction Notes
            </label>
            <input
              value={formData.jurisdiction_notes}
              onChange={(e) =>
                setFormData({ ...formData, jurisdiction_notes: e.target.value })
              }
              placeholder="e.g., HKMA AML/CFT, PIPL cross-border data"
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-600"
            />
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full rounded bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Evaluating..." : "Evaluate"}
      </button>
    </div>
  );
}
