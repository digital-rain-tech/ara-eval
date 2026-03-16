/**
 * Prompt template composition — mirrors ara_eval/core.py build_system_prompt().
 *
 * Reads the same Mustache template files from ../prompts/ that the Python labs use.
 */

import fs from "fs";
import path from "path";
import Mustache from "mustache";
import type {
  JurisdictionMeta,
  PersonalityMeta,
  Scenario,
} from "./constants";

const PROMPTS_DIR = path.resolve(process.cwd(), "..", "prompts");

function loadPrompt(relativePath: string): string {
  const resolved = path.resolve(PROMPTS_DIR, relativePath);
  // Path traversal protection
  if (!resolved.startsWith(path.resolve(PROMPTS_DIR))) {
    throw new Error(`Prompt path escapes prompts directory: ${relativePath}`);
  }
  return fs.readFileSync(resolved, "utf-8");
}

function loadIndex<T>(subdir: string): Record<string, T> {
  const indexPath = path.join(PROMPTS_DIR, subdir, "_index.json");
  return JSON.parse(fs.readFileSync(indexPath, "utf-8"));
}

export function getPersonalities(): Record<string, PersonalityMeta> {
  return loadIndex<PersonalityMeta>("personalities");
}

export function getJurisdictions(): Record<string, JurisdictionMeta> {
  return loadIndex<JurisdictionMeta>("jurisdictions");
}

export function buildSystemPrompt(
  personalityId: string,
  jurisdiction: string = "hk",
  rubric: string = "rubric.md",
): string {
  const jurisdictions = getJurisdictions();
  const personalities = getPersonalities();

  const jurisdictionLabel = jurisdictions[jurisdiction].label;
  const jurisdictionContent = loadPrompt(
    `jurisdictions/${jurisdictions[jurisdiction].file}`,
  );

  // Render personality with jurisdiction label
  const personalityTemplate = loadPrompt(
    `personalities/${personalities[personalityId].file}`,
  );
  const personalityRendered = Mustache.render(personalityTemplate, {
    jurisdiction_label: jurisdictionLabel,
  });

  // Render rubric with jurisdiction as a partial
  const rubricTemplate = loadPrompt(rubric);
  const rubricRendered = Mustache.render(rubricTemplate, {}, {
    jurisdiction: jurisdictionContent,
  });

  const outputFormat = loadPrompt("output_format.md");

  return (
    personalityRendered.trim() +
    "\n\n" +
    rubricRendered.trim() +
    "\n\n" +
    outputFormat.trim()
  );
}

export function buildUserPrompt(
  scenario: Scenario,
  structured: boolean = false,
): string {
  const sc = scenario.structured_context;
  if (structured && sc) {
    const template = loadPrompt("user_prompt_structured.md");
    return Mustache.render(template, {
      scenario: scenario.scenario || "",
      domain: scenario.domain || "",
      industry: scenario.industry || "",
      jurisdiction_notes: scenario.jurisdiction_notes || "N/A",
      subject: sc.subject || "",
      object: sc.object || "",
      action: sc.action || "",
      regulatory_triggers: (sc.regulatory_triggers || []).join(", "),
      time_pressure: sc.time_pressure || "",
      confidence_signal: sc.confidence_signal || "",
      reversibility: sc.reversibility || "",
      blast_radius: sc.blast_radius || "",
    }).trim();
  }

  const template = loadPrompt("user_prompt.md");
  return Mustache.render(template, {
    scenario: scenario.scenario || "",
    domain: scenario.domain || "",
    industry: scenario.industry || "",
    jurisdiction_notes: scenario.jurisdiction_notes || "N/A",
  }).trim();
}

/**
 * Return the raw jurisdiction prompt text for display in the prompt inspector.
 */
export function getJurisdictionPromptText(jurisdiction: string): string {
  const jurisdictions = getJurisdictions();
  if (!jurisdictions[jurisdiction]) return "";
  return loadPrompt(`jurisdictions/${jurisdictions[jurisdiction].file}`);
}

/**
 * Return the full assembled system prompt for display in the prompt inspector.
 */
export function getFullSystemPrompt(
  personalityId: string,
  jurisdiction: string,
  rubric: string = "rubric.md",
): string {
  return buildSystemPrompt(personalityId, jurisdiction, rubric);
}

/**
 * Return prompt sections separately for the inspector's segmented display.
 */
export function getPromptSections(
  personalityId: string,
  jurisdiction: string,
  rubric: string = "rubric.md",
): {
  personality: { text: string; label: string };
  rubric: { text: string; variant: string };
  jurisdiction: { text: string; label: string };
  outputFormat: { text: string };
} {
  const jurisdictions = getJurisdictions();
  const personalities = getPersonalities();

  const jurisdictionLabel = jurisdictions[jurisdiction]?.label || jurisdiction;
  const jurisdictionContent = loadPrompt(
    `jurisdictions/${jurisdictions[jurisdiction].file}`,
  );

  const personalityTemplate = loadPrompt(
    `personalities/${personalities[personalityId].file}`,
  );
  const personalityRendered = Mustache.render(personalityTemplate, {
    jurisdiction_label: jurisdictionLabel,
  });

  const rubricTemplate = loadPrompt(rubric);
  const rubricRendered = Mustache.render(rubricTemplate, {}, {
    jurisdiction: jurisdictionContent,
  });

  const rubricVariantLabel =
    rubric === "rubric.md"
      ? "Full"
      : rubric === "rubric-compact.md"
        ? "Compact"
        : "Bare";

  const outputFormat = loadPrompt("output_format.md");

  return {
    personality: {
      text: personalityRendered.trim(),
      label: personalities[personalityId]?.label || personalityId,
    },
    rubric: {
      text: rubricRendered.trim(),
      variant: rubricVariantLabel,
    },
    jurisdiction: {
      text: jurisdictionContent.trim(),
      label: `${jurisdictionLabel} (${jurisdiction})`,
    },
    outputFormat: {
      text: outputFormat.trim(),
    },
  };
}
