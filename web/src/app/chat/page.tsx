"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import PromptInspector from "@/components/PromptInspector";
import ContextControls from "@/components/ContextControls";
import ChallengeBanner from "@/components/ChallengeBanner";
import ChatMessages, { type ChatMessage } from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import ModelSelector from "@/components/ModelSelector";
import type {
  Scenario,
  PersonalityMeta,
  GatingClassification,
  Dimension,
} from "@/lib/constants";
import { generateChallenges } from "@/lib/challenges";
import { applyGatingRules } from "@/lib/gating";

type ChatMode = "agent" | "judge";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-500">Loading...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const searchParams = useSearchParams();

  const [personalities, setPersonalities] = useState<
    Record<string, PersonalityMeta>
  >({});
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [personality, setPersonality] = useState("compliance_officer");
  const [jurisdiction, setJurisdiction] = useState("hk");
  const [rubric, setRubric] = useState("rubric.md");
  const [model, setModel] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const [mode, setMode] = useState<ChatMode>("agent");
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  // Agent mode state
  const [agentPrompt, setAgentPrompt] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<Record<
    string,
    { level: string }
  > | null>(null);
  const [gatingClassification, setGatingClassification] =
    useState<GatingClassification | null>(null);
  const [fingerprintString, setFingerprintString] = useState("");
  const [triggeredRules, setTriggeredRules] = useState<string[]>([]);

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const prevContext = useRef({ personality, jurisdiction, rubric, model });
  const isNewSession = useRef(true);
  const msgCounter = useRef(0);

  // Load metadata
  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data) => {
        setPersonalities(data.personalities || {});
        setScenarios(data.scenarios || []);
        setModel(data.model || "");
        setDefaultModel(data.model || "");
      });
  }, []);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  // Check for URL params (from "Red Team This" button on evaluate page)
  useEffect(() => {
    const scenarioId = searchParams.get("scenario");
    const fp = searchParams.get("fingerprint");
    if (scenarioId && fp && scenarios.length > 0) {
      setSelectedScenarioId(scenarioId);
      setMode("agent");
      // Parse fingerprint string like "C-B-A-A-C-B-C"
      loadAgentFromFingerprint(scenarioId, fp);
    }
  }, [searchParams, scenarios]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAgentFromFingerprint = useCallback(
    async (scenarioId: string, fpString: string) => {
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (!scenario) return;

      // Build fingerprint object from string
      const dims = [
        "decision_reversibility",
        "failure_blast_radius",
        "regulatory_exposure",
        "human_override_latency",
        "data_confidence",
        "accountability_chain",
        "graceful_degradation",
      ];
      const levels = fpString.split("-");
      if (levels.length !== 7) return;

      const fp: Record<string, { level: string; reasoning: string }> = {};
      dims.forEach((d, i) => {
        fp[d] = { level: levels[i], reasoning: "" };
      });

      // Cast for gating rules (levels are validated A-D from fingerprint string)
      const gating = applyGatingRules(
        fp as unknown as Record<Dimension, { level: "A" | "B" | "C" | "D"; reasoning: string }>,
      );

      setFingerprint(fp);
      setGatingClassification(gating.classification);
      setFingerprintString(gating.fingerprint_string);
      setTriggeredRules(gating.triggered_rules);

      // Fetch agent prompt from API
      const resp = await fetch("/api/agent-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          fingerprint: fp,
          fingerprintString: gating.fingerprint_string,
          classification: gating.classification,
          jurisdiction,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAgentPrompt(data.prompt);
      }
    },
    [scenarios, jurisdiction],
  );

  // Load agent when scenario selection changes
  const handleScenarioSelect = useCallback(
    (scenarioId: string) => {
      setSelectedScenarioId(scenarioId);
      const scenario = scenarios.find((s) => s.id === scenarioId);
      if (!scenario?.reference_fingerprint) return;

      const fpString = Object.values(scenario.reference_fingerprint).join("-");
      loadAgentFromFingerprint(scenarioId, fpString);

      // Reset chat
      setSessionId(crypto.randomUUID());
      setMessages([]);
      setError(null);
      isNewSession.current = true;
      msgCounter.current = 0;
    },
    [scenarios, loadAgentFromFingerprint],
  );

  // Reload agent prompt when jurisdiction changes in agent mode
  useEffect(() => {
    if (mode === "agent" && selectedScenarioId && fingerprint) {
      const scenario = scenarios.find((s) => s.id === selectedScenarioId);
      if (!scenario) return;

      fetch("/api/agent-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          fingerprint,
          fingerprintString,
          classification: gatingClassification,
          jurisdiction,
        }),
      })
        .then((r) => r.json())
        .then((data) => setAgentPrompt(data.prompt));
    }
  }, [jurisdiction, mode, selectedScenarioId, fingerprint, fingerprintString, gatingClassification, scenarios]);

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setError(null);
    isNewSession.current = true;
    msgCounter.current = 0;
    prevContext.current = { personality, jurisdiction, rubric, model };
  }, [personality, jurisdiction, rubric, model]);

  const detectContextChange = useCallback((): string | null => {
    const prev = prevContext.current;
    const changes: string[] = [];
    if (prev.personality !== personality) {
      const prevLabel =
        personalities[prev.personality]?.label || prev.personality;
      const newLabel = personalities[personality]?.label || personality;
      changes.push(`personality ${prevLabel} \u2192 ${newLabel}`);
    }
    if (prev.jurisdiction !== jurisdiction)
      changes.push(
        `jurisdiction ${prev.jurisdiction} \u2192 ${jurisdiction}`,
      );
    if (prev.rubric !== rubric)
      changes.push(`rubric ${prev.rubric} \u2192 ${rubric}`);
    if (prev.model !== model)
      changes.push(`model ${prev.model} \u2192 ${model}`);
    prevContext.current = { personality, jurisdiction, rubric, model };
    if (changes.length === 0) return null;
    return `Context changed: ${changes.join(", ")}`;
  }, [personality, jurisdiction, rubric, model, personalities]);

  const handleSend = useCallback(
    async (message: string) => {
      setLoading(true);
      setError(null);

      const contextChange =
        messages.length > 0 ? detectContextChange() : null;

      if (contextChange) {
        const sysMsg: ChatMessage = {
          id: `sys-${++msgCounter.current}`,
          role: "system",
          content: contextChange,
        };
        setMessages((prev) => [...prev, sysMsg]);
      }

      const userMsg: ChatMessage = {
        id: `user-${++msgCounter.current}`,
        role: "user",
        content: message,
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            message,
            personality,
            jurisdiction,
            rubric,
            model,
            history: messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role, content: m.content })),
            isNewSession: isNewSession.current,
            contextChange,
            mode,
            agentPrompt: mode === "agent" ? agentPrompt : undefined,
          }),
        });

        isNewSession.current = false;

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        const assistantMsg: ChatMessage = {
          id: `asst-${++msgCounter.current}`,
          role: "assistant",
          content: data.content,
          input_tokens: data.input_tokens,
          output_tokens: data.output_tokens,
          response_time_ms: data.response_time_ms,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [
      sessionId,
      personality,
      jurisdiction,
      rubric,
      model,
      messages,
      detectContextChange,
      mode,
      agentPrompt,
    ],
  );

  const challenges =
    fingerprint && mode === "agent" ? generateChallenges(fingerprint) : [];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Nav />

      {/* Split pane — fills remaining height */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-0 overflow-hidden">
        {/* Left pane — Prompt Inspector */}
        <div className="flex w-2/5 flex-col border-r border-gray-800 p-4 overflow-hidden">
          <h2 className="mb-3 shrink-0 text-sm font-medium text-gray-400">
            {mode === "agent" ? "Agent System Prompt" : "Judge System Prompt"}
            <span className="ml-2 text-sm text-gray-600">
              (what the model sees)
            </span>
          </h2>
          <div className="flex-1 overflow-y-auto rounded border border-gray-800 bg-gray-900 p-3">
            {mode === "agent" && agentPrompt ? (
              <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                {agentPrompt}
              </pre>
            ) : (
              <PromptInspector
                jurisdiction={jurisdiction}
                personality={personality}
                rubric={rubric}
              />
            )}
          </div>
        </div>

        {/* Right pane — Chat */}
        <div className="flex w-3/5 flex-col overflow-hidden">
          <div className="shrink-0 space-y-3 p-4 pb-0">
            {/* Mode toggle */}
            <div className="flex items-center gap-4">
              <div className="flex rounded border border-gray-700">
                <button
                  onClick={() => setMode("agent")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    mode === "agent"
                      ? "bg-red-800/40 text-red-300"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Agent Mode
                </button>
                <button
                  onClick={() => setMode("judge")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    mode === "judge"
                      ? "bg-blue-800/40 text-blue-300"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Judge Mode
                </button>
              </div>
              <span className="text-sm text-gray-600">
                {mode === "agent"
                  ? "Red-team the agent\u2019s guardrails"
                  : "Probe the evaluation judge\u2019s reasoning"}
              </span>
            </div>

            {/* Agent mode: scenario selector + challenge banner */}
            {mode === "agent" && (
              <>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-500">Scenario:</label>
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => handleScenarioSelect(e.target.value)}
                    className="flex-1 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-sm text-gray-300"
                  >
                    <option value="">Select a scenario...</option>
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} — {s.domain} ({s.industry})
                      </option>
                    ))}
                  </select>
                  <ModelSelector
                    value={model}
                    defaultModel={defaultModel}
                    onChange={setModel}
                  />
                </div>

                {fingerprint && gatingClassification && (
                  <ChallengeBanner
                    classification={gatingClassification}
                    fingerprintString={fingerprintString}
                    fingerprint={fingerprint}
                    challenges={challenges}
                    triggeredRules={triggeredRules}
                  />
                )}
              </>
            )}

            {/* Judge mode: full context controls */}
            {mode === "judge" && (
              <ContextControls
                personality={personality}
                jurisdiction={jurisdiction}
                rubric={rubric}
                model={model}
                defaultModel={defaultModel}
                personalities={personalities}
                onPersonalityChange={setPersonality}
                onJurisdictionChange={setJurisdiction}
                onRubricChange={setRubric}
                onModelChange={setModel}
                onNewSession={startNewSession}
              />
            )}

            {/* Agent mode: jurisdiction selector (simplified) */}
            {mode === "agent" && selectedScenarioId && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Grounding:</span>
                {["generic", "hk", "hk-grounded"].map((j) => (
                  <button
                    key={j}
                    onClick={() => setJurisdiction(j)}
                    className={`rounded px-2 py-1 transition-colors ${
                      jurisdiction === j
                        ? "bg-amber-800/40 text-amber-300"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {j === "generic"
                      ? "Generic"
                      : j === "hk"
                        ? "HK"
                        : "HK Grounded"}
                  </button>
                ))}
                <button
                  onClick={startNewSession}
                  className="ml-auto rounded border border-gray-700 px-2 py-1 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                >
                  New Session
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mx-4 mt-2 rounded border border-red-800 bg-red-900/30 p-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Messages */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <ChatMessages messages={messages} loading={loading} />
            <ChatInput
              onSend={handleSend}
              disabled={
                loading || (mode === "agent" && !agentPrompt)
              }
            />
          </div>

        </div>
      </div>
    </div>
  );
}
