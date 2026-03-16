"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Nav from "@/components/Nav";
import PromptInspector from "@/components/PromptInspector";
import ContextControls from "@/components/ContextControls";
import ChatMessages, { type ChatMessage } from "@/components/ChatMessages";
import ChatInput from "@/components/ChatInput";
import type { PersonalityMeta } from "@/lib/constants";

export default function ChatPage() {
  const [personalities, setPersonalities] = useState<
    Record<string, PersonalityMeta>
  >({});
  const [personality, setPersonality] = useState("compliance_officer");
  const [jurisdiction, setJurisdiction] = useState("hk");
  const [rubric, setRubric] = useState("rubric.md");
  const [model, setModel] = useState("");
  const [defaultModel, setDefaultModel] = useState("");

  const [sessionId, setSessionId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track previous context for change detection
  const prevContext = useRef({ personality, jurisdiction, rubric, model });
  const isNewSession = useRef(true);
  const msgCounter = useRef(0);

  // Load metadata
  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((data) => {
        setPersonalities(data.personalities || {});
        setModel(data.model || "");
        setDefaultModel(data.model || "");
      });
  }, []);

  // Generate session ID on mount
  useEffect(() => {
    setSessionId(crypto.randomUUID());
  }, []);

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setError(null);
    isNewSession.current = true;
    msgCounter.current = 0;
    prevContext.current = { personality, jurisdiction, rubric, model };
  }, [personality, jurisdiction, rubric, model]);

  // Detect context changes
  const detectContextChange = useCallback((): string | null => {
    const prev = prevContext.current;
    const changes: string[] = [];

    if (prev.personality !== personality) {
      const prevLabel =
        personalities[prev.personality]?.label || prev.personality;
      const newLabel = personalities[personality]?.label || personality;
      changes.push(`personality ${prevLabel} \u2192 ${newLabel}`);
    }
    if (prev.jurisdiction !== jurisdiction) {
      changes.push(`jurisdiction ${prev.jurisdiction} \u2192 ${jurisdiction}`);
    }
    if (prev.rubric !== rubric) {
      changes.push(`rubric ${prev.rubric} \u2192 ${rubric}`);
    }
    if (prev.model !== model) {
      changes.push(`model ${prev.model} \u2192 ${model}`);
    }

    prevContext.current = { personality, jurisdiction, rubric, model };

    if (changes.length === 0) return null;
    return `Context changed: ${changes.join(", ")}`;
  }, [personality, jurisdiction, rubric, model, personalities]);

  const handleSend = useCallback(
    async (message: string) => {
      setLoading(true);
      setError(null);

      // Check for context changes since last message
      const contextChange =
        messages.length > 0 ? detectContextChange() : null;

      // Add context change marker to local messages
      if (contextChange) {
        const sysMsg: ChatMessage = {
          id: `sys-${++msgCounter.current}`,
          role: "system",
          content: contextChange,
        };
        setMessages((prev) => [...prev, sysMsg]);
      }

      // Add user message to local state optimistically
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
    ],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

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
          <div className="h-[calc(100vh-130px)] overflow-y-auto rounded border border-gray-800 bg-gray-900 p-3">
            <PromptInspector
              jurisdiction={jurisdiction}
              personality={personality}
              rubric={rubric}
            />
          </div>
        </div>

        {/* Right pane — Chat */}
        <div className="flex w-3/5 flex-col">
          <div className="p-4 pb-0">
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
            <ChatInput onSend={handleSend} disabled={loading} />
          </div>

          {/* Session info */}
          <div className="border-t border-gray-800 px-4 py-1 text-xs text-gray-600">
            Session: {sessionId.slice(0, 8)} | Messages:{" "}
            {messages.filter((m) => m.role !== "system").length}
          </div>
        </div>
      </div>
    </div>
  );
}
