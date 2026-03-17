/**
 * Build agent persona system prompt from a scenario + fingerprint.
 *
 * Uses the agent_persona.md Mustache template with CAN/CANNOT constraints
 * derived from the fingerprint levels via shared/challenges.json.
 */

import fs from "fs";
import path from "path";
import Mustache from "mustache";
import type { Scenario, GatingClassification } from "./constants";
import { generateConstraints, formatClassification } from "./challenges";

const PROMPTS_DIR = path.resolve(process.cwd(), "..", "prompts");

function loadPrompt(relativePath: string): string {
  return fs.readFileSync(path.join(PROMPTS_DIR, relativePath), "utf-8");
}

function loadJurisdictions(): Record<string, { file: string; label: string }> {
  return JSON.parse(
    fs.readFileSync(
      path.join(PROMPTS_DIR, "jurisdictions", "_index.json"),
      "utf-8",
    ),
  );
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
