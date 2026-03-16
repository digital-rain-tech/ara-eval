"use client";

import { useState, useEffect } from "react";

interface PromptInspectorProps {
  jurisdiction: string;
  personality: string;
}

export default function PromptInspector({
  jurisdiction,
  personality,
}: PromptInspectorProps) {
  const [fullPrompt, setFullPrompt] = useState<string>("");
  const [jurisdictionText, setJurisdictionText] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/prompt?personality=${encodeURIComponent(personality)}&jurisdiction=${encodeURIComponent(jurisdiction)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setFullPrompt(data.full_prompt || "");
        setJurisdictionText(data.jurisdiction_text || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jurisdiction, personality]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500">
        Loading prompt...
      </div>
    );
  }

  // Highlight the jurisdiction section within the full prompt
  const highlightedPrompt = jurisdictionText
    ? fullPrompt.replace(
        jurisdictionText.trim(),
        `%%HIGHLIGHT_START%%${jurisdictionText.trim()}%%HIGHLIGHT_END%%`,
      )
    : fullPrompt;

  const parts = highlightedPrompt.split(/%%HIGHLIGHT_START%%|%%HIGHLIGHT_END%%/);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
        <span className="inline-block h-3 w-3 rounded bg-amber-800/60" />
        Jurisdiction context (changes with grounding level)
      </div>
      <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-300">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            <span
              key={i}
              className="rounded bg-amber-800/40 px-0.5"
            >
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </pre>
    </div>
  );
}
