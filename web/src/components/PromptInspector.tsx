"use client";

import { useState, useEffect, useRef } from "react";

interface PromptSection {
  text: string;
  label?: string;
  variant?: string;
}

interface PromptSections {
  personality: PromptSection;
  rubric: PromptSection;
  jurisdiction: PromptSection;
  outputFormat: PromptSection;
}

interface PromptInspectorProps {
  jurisdiction: string;
  personality: string;
  rubric?: string;
}

const SECTION_META: Record<string, { label: string; accent: string }> = {
  personality: { label: "Personality", accent: "text-blue-400" },
  rubric: { label: "Rubric", accent: "text-purple-400" },
  jurisdiction: { label: "Jurisdiction", accent: "text-amber-400" },
  outputFormat: { label: "Output Format", accent: "text-gray-500" },
};

function lineCount(text: string): number {
  return text.split("\n").length;
}

function SectionBlock({
  sectionKey,
  section,
  changed,
  collapsed,
  onToggle,
}: {
  sectionKey: string;
  section: PromptSection;
  changed: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const meta = SECTION_META[sectionKey];
  const lines = lineCount(section.text);

  return (
    <div
      className={`transition-colors duration-700 ${
        changed ? "bg-white/[0.03]" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-1.5 text-left text-xs"
      >
        <span className={`font-medium ${meta.accent}`}>{meta.label}</span>
        {section.label && (
          <span className="text-gray-500">{section.label}</span>
        )}
        {section.variant && (
          <span className="text-gray-600">({section.variant})</span>
        )}
        <span className="ml-auto text-gray-700">{lines}L</span>
        <span className="text-gray-700">{collapsed ? "+" : "\u2212"}</span>
      </button>
      {!collapsed && (
        <pre className="whitespace-pre-wrap border-l border-gray-800 pl-3 pb-3 text-xs leading-relaxed text-gray-400">
          {section.text}
        </pre>
      )}
    </div>
  );
}

export default function PromptInspector({
  jurisdiction,
  personality,
  rubric = "rubric.md",
}: PromptInspectorProps) {
  const [sections, setSections] = useState<PromptSections | null>(null);
  const [loading, setLoading] = useState(true);
  // All collapsed by default — only expand on change
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    personality: true,
    rubric: true,
    jurisdiction: true,
    outputFormat: true,
  });
  const [changedSections, setChangedSections] = useState<Set<string>>(
    new Set(),
  );

  const prevProps = useRef({ jurisdiction, personality, rubric });

  useEffect(() => {
    const prev = prevProps.current;
    const changed = new Set<string>();
    if (prev.personality !== personality) changed.add("personality");
    if (prev.rubric !== rubric) changed.add("rubric");
    if (prev.jurisdiction !== jurisdiction) changed.add("jurisdiction");
    prevProps.current = { jurisdiction, personality, rubric };

    setChangedSections(changed);

    if (changed.size > 0) {
      const timer = setTimeout(() => setChangedSections(new Set()), 1500);
      setCollapsed((prev) => {
        const next = { ...prev };
        for (const key of changed) {
          next[key] = false;
        }
        return next;
      });
      return () => clearTimeout(timer);
    }
  }, [jurisdiction, personality, rubric]);

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/prompt?personality=${encodeURIComponent(personality)}&jurisdiction=${encodeURIComponent(jurisdiction)}&rubric=${encodeURIComponent(rubric)}`,
    )
      .then((r) => r.json())
      .then((data) => {
        setSections(data.sections || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [jurisdiction, personality, rubric]);

  if (loading || !sections) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-600">
        Loading prompt...
      </div>
    );
  }

  const sectionOrder: { key: string; section: PromptSection }[] = [
    { key: "personality", section: sections.personality },
    { key: "rubric", section: sections.rubric },
    { key: "jurisdiction", section: sections.jurisdiction },
    { key: "outputFormat", section: sections.outputFormat },
  ];

  const totalLines = sectionOrder.reduce(
    (sum, s) => sum + lineCount(s.section.text),
    0,
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-2 text-xs text-gray-600">
        {totalLines} lines &middot; click to expand
      </div>
      <div className="divide-y divide-gray-800/50">
        {sectionOrder.map(({ key, section }) => (
          <SectionBlock
            key={key}
            sectionKey={key}
            section={section}
            changed={changedSections.has(key)}
            collapsed={collapsed[key] ?? true}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />
        ))}
      </div>
    </div>
  );
}
