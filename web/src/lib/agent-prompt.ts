/**
 * Build agent persona system prompt from a scenario + fingerprint.
 *
 * Uses the agent_persona.md Mustache template with CAN/CANNOT constraints
 * derived from the fingerprint levels via shared/challenges.json.
 */

import Mustache from "mustache";
import type { Scenario, GatingClassification } from "./constants";
import { generateConstraints, formatClassification } from "./challenges";
import { PROMPT_FILES } from "../generated/shared-data";

function loadPrompt(relativePath: string): string {
  const content = PROMPT_FILES[relativePath];
  if (content === undefined) {
    throw new Error(`Prompt not found: ${relativePath}`);
  }
  return content;
}

function loadJurisdictions(): Record<string, { file: string; label: string }> {
  return JSON.parse(loadPrompt("jurisdictions/_index.json"));
}

export function buildAgentPrompt(params: {
  scenario: Scenario;
  fingerprint: Record<string, { level: string }>;
  fingerprintString: string;
  classification: GatingClassification;
  jurisdiction: string;
}): string {
  const jurisdictions = loadJurisdictions();
  const jurisdictionLabel = jurisdictions[params.jurisdiction]?.label || params.jurisdiction;
  const jurisdictionContent = loadPrompt(
    `jurisdictions/${jurisdictions[params.jurisdiction].file}`,
  );

  const constraints = generateConstraints(params.fingerprint);
  const constraintTexts = constraints.map(
    (c) => `**${c.dimensionLabel}** (Level ${c.level}): ${c.constraint}`,
  );

  const template = loadPrompt("agent_persona.md");

  return Mustache.render(
    template,
    {
      domain: params.scenario.domain || "Financial Services",
      industry: params.scenario.industry || "Banking",
      jurisdiction_label: jurisdictionLabel,
      scenario: params.scenario.scenario,
      fingerprint_string: params.fingerprintString,
      classification: formatClassification(params.classification),
      constraints: constraintTexts,
    },
    { jurisdiction: jurisdictionContent },
  ).trim();
}
