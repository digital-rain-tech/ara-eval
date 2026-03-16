"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "@/components/Nav";
import ScenarioInput from "@/components/ScenarioInput";
import FingerprintMatrix from "@/components/FingerprintMatrix";
import GatingVerdict from "@/components/GatingVerdict";
import PersonalityDelta from "@/components/PersonalityDelta";
import DimensionReasoning from "@/components/DimensionReasoning";
import PromptInspector from "@/components/PromptInspector";
import type {
  Scenario,
  EvaluationResult,
  PersonalityMeta,
} from "@/lib/constants";

type JurisdictionId = string;

interface ApiEvalResult {
  run_id: string;
  model: string;
  scenario_id: string;
  jurisdiction: string;
  structured: boolean;
  results: Record<
    string,
    {
      personality: string;
      result: EvaluationResult | null;
      error: string | null;
    }
  >;
}

const JURISDICTION_TABS: { id: JurisdictionId; label: string; short: string }[] =
  [
    { id: "generic", label: "Generic (no context)", short: "Generic" },
    { id: "hk", label: "HK (framework names)", short: "HK" },
    { id: "hk-grounded", label: "HK Grounded (full regulatory text)", short: "HK Grounded" },
  ];

export default function EvaluatePage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [personalities, setPersonalities] = useState<
    Record<string, PersonalityMeta>
  >({});
  const [jurisdiction, setJurisdiction] = useState<JurisdictionId>("hk");
  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<ApiEvalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inspectorPersonality, setInspectorPersonality] =
    useState("compliance_officer");

  // Load scenarios and metadata
  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data) => {
        setScenarios(data.scenarios || []);
        setPersonalities(data.personalities || {});
      });
  }, []);

  const handleEvaluate = useCallback(
    async (scenario: Scenario, structured: boolean) => {
      setLoading(true);
      setError(null);
      setEvalResult(null);

      try {
        const resp = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            jurisdiction,
            structured,
          }),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${resp.status}`);
        }

        const data: ApiEvalResult = await resp.json();
        setEvalResult(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [jurisdiction],
  );

  // Build results for display components
  const matrixResults = evalResult
    ? Object.fromEntries(
        Object.entries(evalResult.results)
          .filter(([, v]) => v.result !== null)
          .map(([pid, v]) => [
            pid,
            {
              label: v.personality,
              dimensions: v.result!.parsed.dimensions,
            },
          ]),
      )
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      {/* Jurisdiction tabs */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 py-2">
          <span className="mr-3 text-xs font-medium text-gray-500">
            Grounding Level:
          </span>
          {JURISDICTION_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setJurisdiction(tab.id)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                jurisdiction === tab.id
                  ? "bg-amber-800/40 text-amber-300"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {tab.short}
            </button>
          ))}
        </div>
      </div>

      {/* Split pane */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0">
        {/* Left pane — Prompt Inspector */}
        <div className="w-2/5 border-r border-gray-800 p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-400">
            System Prompt
            <span className="ml-2 text-xs text-gray-600">
              (what the model sees)
            </span>
          </h2>
          <div className="mb-3">
            <select
              value={inspectorPersonality}
              onChange={(e) => setInspectorPersonality(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-300"
            >
              {Object.entries(personalities).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-[calc(100vh-200px)] overflow-y-auto rounded border border-gray-800 bg-gray-900 p-3">
            <PromptInspector
              jurisdiction={jurisdiction}
              personality={inspectorPersonality}
            />
          </div>
        </div>

        {/* Right pane — Input & Results */}
        <div className="w-3/5 overflow-y-auto p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-400">
            Scenario & Results
            <span className="ml-2 text-xs text-gray-600">
              (what the model concludes)
            </span>
          </h2>

          <ScenarioInput
            scenarios={scenarios}
            onSubmit={handleEvaluate}
            loading={loading}
          />

          {/* Loading indicator */}
          {loading && (
            <div className="mt-6 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-blue-400" />
              <p className="mt-2 text-sm text-gray-500">
                Evaluating across 3 stakeholder perspectives...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded border border-red-800 bg-red-900/30 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Results */}
          {matrixResults && Object.keys(matrixResults).length > 0 && (
            <div className="mt-6 space-y-6">
              {/* Gating verdict — show one per personality */}
              {Object.entries(evalResult!.results)
                .filter(([, v]) => v.result !== null)
                .map(([pid, v]) => (
                  <GatingVerdict
                    key={pid}
                    classification={v.result!.gating.classification}
                    triggeredRules={v.result!.gating.triggered_rules}
                    fingerprintString={v.result!.gating.fingerprint_string}
                  />
                ))
                .slice(0, 1)}

              {/* Fingerprint matrix */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-400">
                  Risk Fingerprint Matrix
                </h3>
                <FingerprintMatrix results={matrixResults} />
              </div>

              {/* Personality delta */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-400">
                  Stakeholder Disagreements
                </h3>
                <PersonalityDelta results={matrixResults} />
              </div>

              {/* Per-dimension reasoning */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-400">
                  Dimension Reasoning
                </h3>
                <DimensionReasoning results={matrixResults} />
              </div>

              {/* Run metadata */}
              <div className="rounded border border-gray-800 p-3 text-xs text-gray-500">
                <span>Model: {evalResult!.model}</span>
                <span className="mx-2">|</span>
                <span>Run: {evalResult!.run_id.slice(0, 8)}</span>
                <span className="mx-2">|</span>
                <span>Jurisdiction: {evalResult!.jurisdiction}</span>
                {evalResult!.structured && (
                  <>
                    <span className="mx-2">|</span>
                    <span>Structured input</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
