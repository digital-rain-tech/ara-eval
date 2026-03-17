"use client";

import { useState, useEffect, useCallback } from "react";
import Nav from "@/components/Nav";
import ScenarioInput from "@/components/ScenarioInput";
import FingerprintMatrix from "@/components/FingerprintMatrix";
import GatingVerdict from "@/components/GatingVerdict";
import PersonalityDelta from "@/components/PersonalityDelta";
import DimensionReasoning from "@/components/DimensionReasoning";
import PromptInspector from "@/components/PromptInspector";
import ModelSelector from "@/components/ModelSelector";
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

type PageState = "loading" | "ready" | "error";

export default function EvaluatePage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [personalities, setPersonalities] = useState<
    Record<string, PersonalityMeta>
  >({});
  const [jurisdiction, setJurisdiction] = useState<JurisdictionId>("hk");
  const [loading, setLoading] = useState(false);
  const [evalResult, setEvalResult] = useState<ApiEvalResult | null>(null);
  const [isReference, setIsReference] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspectorPersonality, setInspectorPersonality] =
    useState("compliance_officer");
  const [model, setModel] = useState<string>("");
  const [defaultModel, setDefaultModel] = useState<string>("");

  // Load scenarios and metadata
  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data) => {
        setScenarios(data.scenarios || []);
        setModel(data.model || "");
        setDefaultModel(data.model || "");
        setPersonalities(data.personalities || {});
        setPageState("ready");
      })
      .catch(() => setPageState("error"));
  }, []);

  // Moved below all hooks — guard is in the JSX return

  const loadReference = useCallback(async (scenarioId: string) => {
    try {
      const resp = await fetch(
        `/api/reference?scenario=${encodeURIComponent(scenarioId)}`,
      );
      if (!resp.ok) return;
      const data = await resp.json();
      if (!data.result?.evaluations) return;

      // Convert reference format to ApiEvalResult format
      const evals = data.result.evaluations as Record<
        string,
        {
          personality: string;
          fingerprint: Record<string, { level: string; reasoning: string }>;
          gating: { classification: string; triggered_rules: string[]; fingerprint_string: string };
        }
      >;
      const results: ApiEvalResult["results"] = {};
      for (const [pid, ev] of Object.entries(evals)) {
        results[pid] = {
          personality: ev.personality,
          result: {
            parsed: { dimensions: ev.fingerprint as EvaluationResult["parsed"]["dimensions"] },
            gating: ev.gating as EvaluationResult["gating"],
            usage: { input_tokens: null, output_tokens: null, total_tokens: null },
            cost: null,
            response_time_ms: 0,
            model_used: null,
          },
          error: null,
        };
      }
      setEvalResult({
        run_id: "reference",
        model: data.source || "reference",
        scenario_id: scenarioId,
        jurisdiction: "hk",
        structured: false,
        results,
      });
      setIsReference(true);
    } catch {
      // Silently fail — reference results are optional
    }
  }, []);

  const handleEvaluate = useCallback(
    async (scenario: Scenario, structured: boolean) => {
      setLoading(true);
      setError(null);
      setEvalResult(null);
      setIsReference(false);

      try {
        const resp = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scenario,
            jurisdiction,
            structured,
            model: model !== defaultModel ? model : undefined,
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
    [jurisdiction, model, defaultModel],
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

  if (pageState !== "ready") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-gray-950">
        {pageState === "loading" ? (
          <>
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-blue-400" />
            <p className="text-sm text-gray-500">Loading ARA-Eval...</p>
          </>
        ) : (
          <p className="text-sm text-red-400">
            Failed to load. Check that the server is running.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Nav />

      {/* Jurisdiction tabs */}
      <div className="shrink-0 border-b border-gray-800 bg-gray-900/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1">
            <span className="mr-3 text-sm font-medium text-gray-500">
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
          <ModelSelector
            value={model}
            defaultModel={defaultModel}
            onChange={setModel}
          />
        </div>
      </div>

      {/* Split pane */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 overflow-hidden">
        {/* Left pane — Prompt Inspector */}
        <div className="flex w-2/5 flex-col border-r border-gray-800 p-4 overflow-hidden">
          <h2 className="mb-3 text-sm font-medium text-gray-400">
            System Prompt
            <span className="ml-2 text-sm text-gray-600">
              (what the model sees)
            </span>
          </h2>
          <div className="mb-3">
            <select
              value={inspectorPersonality}
              onChange={(e) => setInspectorPersonality(e.target.value)}
              className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-300"
            >
              {Object.entries(personalities).map(([id, meta]) => (
                <option key={id} value={id}>
                  {meta.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto rounded border border-gray-800 bg-gray-900 p-3">
            <PromptInspector
              jurisdiction={jurisdiction}
              personality={inspectorPersonality}
            />
          </div>
        </div>

        {/* Right pane — Input & Results (scrolls independently) */}
        <div className="w-3/5 overflow-y-auto p-4">
          <h2 className="mb-3 text-sm font-medium text-gray-400">
            Scenario & Results
            <span className="ml-2 text-sm text-gray-600">
              (what the model concludes)
            </span>
          </h2>

          <ScenarioInput
            scenarios={scenarios}
            onSubmit={handleEvaluate}
            loading={loading}
            onScenarioSelect={loadReference}
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
            <div className="mt-8 space-y-8">
              {/* Reference indicator */}
              {isReference && (
                <div className="rounded bg-blue-900/10 px-3 py-2 text-sm text-blue-400">
                  Pre-computed reference results. Click Evaluate for a
                  live run.
                </div>
              )}

              {/* ── Verdict zone ── */}
              <div className="space-y-4">
                {/* Gating verdict */}
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
                <FingerprintMatrix results={matrixResults} />

                {/* Red Team This Agent — primary next action */}
                {(() => {
                  const firstFp = Object.values(evalResult!.results).find(
                    (v) => v.result !== null,
                  )?.result?.gating.fingerprint_string;
                  return firstFp ? (
                    <a
                      href={`/chat?scenario=${encodeURIComponent(evalResult!.scenario_id)}&fingerprint=${encodeURIComponent(firstFp)}`}
                      className="block rounded bg-red-800/30 px-4 py-3 text-center text-sm font-medium text-red-300 transition-colors hover:bg-red-800/50"
                    >
                      Red Team This Agent &rarr;
                    </a>
                  ) : null;
                })()}
              </div>

              {/* ── Details zone ── */}
              <div className="space-y-6 border-t border-gray-800 pt-6">
                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">
                    Stakeholder Disagreements
                  </h3>
                  <PersonalityDelta results={matrixResults} />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium text-gray-500">
                    Dimension Reasoning
                  </h3>
                  <DimensionReasoning results={matrixResults} />
                </div>

                {/* Run metadata — minimal */}
                <div className="text-sm text-gray-600">
                  {evalResult!.model} &middot; {evalResult!.jurisdiction}
                  {evalResult!.structured && " \u00b7 structured"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
