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

const SECTION_STYLES: Record<
  string,
  { border: string; bg: string; label: string; badgeColor: string }
> = {
  personality: {
    border: "border-l-blue-500",
    bg: "bg-blue-900/10",
    label: "Personality",
    badgeColor: "bg-blue-800/60 text-blue-300",
  },
  rubric: {
    border: "border-l-purple-500",
    bg: "bg-purple-900/10",
    label: "Rubric",
    badgeColor: "bg-purple-800/60 text-purple-300",
  },
  jurisdiction: {
    border: "border-l-amber-500",
    bg: "bg-amber-900/10",
    label: "Jurisdiction",
    badgeColor: "bg-amber-800/60 text-amber-300",
  },
  outputFormat: {
    border: "border-l-gray-600",
    bg: "bg-gray-900/30",
    label: "Output Format",
    badgeColor: "bg-gray-700/60 text-gray-400",
  },
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
  const style = SECTION_STYLES[sectionKey];
  const lines = lineCount(section.text);

  return (
    <div
      className={`border-l-2 ${style.border} ${style.bg} rounded-r transition-colors duration-500 ${
        changed ? "ring-1 ring-white/20" : ""
      }`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
      >
        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${style.badgeColor}`}>
          {style.label}
        </span>
        {section.label && (
          <span className="text-xs text-gray-400">{section.label}</span>
        )}
        {section.variant && (
          <span className="text-xs text-gray-500">({section.variant})</span>
        )}
        <span className="ml-auto text-xs text-gray-600">
          {lines} lines
        </span>
        <span className="text-xs text-gray-600">
          {collapsed ? "\u25BC" : "\u25B2"}
        </span>
      </button>
      {!collapsed && (
        <pre className="whitespace-pre-wrap px-3 pb-2 text-xs leading-relaxed text-gray-300">
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    outputFormat: true,
  });
  const [changedSections, setChangedSections] = useState<Set<string>>(
    new Set(),
  );

  // Track previous props to detect which section changed
  const prevProps = useRef({ jurisdiction, personality, rubric });

  useEffect(() => {
    // Detect which sections changed
    const prev = prevProps.current;
    const changed = new Set<string>();
    if (prev.personality !== personality) changed.add("personality");
    if (prev.rubric !== rubric) changed.add("rubric");
    if (prev.jurisdiction !== jurisdiction) changed.add("jurisdiction");
    prevProps.current = { jurisdiction, personality, rubric };

    setChangedSections(changed);

    // Clear change highlights after animation
    if (changed.size > 0) {
      const timer = setTimeout(() => setChangedSections(new Set()), 1500);
      // Auto-expand changed sections
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
      <div className="flex h-full items-center justify-center text-gray-500">
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
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        {Object.entries(SECTION_STYLES).map(([key, style]) => (
          <span key={key} className="flex items-center gap-1">
            <span
              className={`inline-block h-2.5 w-2.5 rounded-sm ${style.badgeColor.split(" ")[0]}`}
            />
            {style.label}
          </span>
        ))}
        <span className="ml-auto text-gray-600">{totalLines} lines total</span>
      </div>

      {/* Sections */}
      <div className="space-y-2">
        {sectionOrder.map(({ key, section }) => (
          <SectionBlock
            key={key}
            sectionKey={key}
            section={section}
            changed={changedSections.has(key)}
            collapsed={collapsed[key] ?? false}
            onToggle={() =>
              setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
            }
          />
        ))}
      </div>
    </div>
  );
}
