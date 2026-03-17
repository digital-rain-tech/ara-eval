import { NextRequest, NextResponse } from "next/server";
import { buildAgentPrompt } from "@/lib/agent-prompt";
import { validateJurisdiction } from "@/lib/validate";
import type { Scenario, GatingClassification } from "@/lib/constants";

/**
 * POST /api/agent-prompt
 *
 * Builds the agent persona system prompt from a scenario + fingerprint.
 * Returns the full prompt text for display in the prompt inspector.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    scenario,
    fingerprint,
    fingerprintString,
    classification,
    jurisdiction = "hk",
  } = body as {
    scenario: Scenario;
    fingerprint: Record<string, { level: string }>;
    fingerprintString: string;
    classification: GatingClassification;
    jurisdiction?: string;
  };

  if (!scenario || !fingerprint || !fingerprintString || !classification) {
    return NextResponse.json(
      { error: "Missing required fields: scenario, fingerprint, fingerprintString, classification" },
      { status: 400 },
    );
  }

  const jurisdictionErr = validateJurisdiction(jurisdiction);
  if (jurisdictionErr) {
    return NextResponse.json({ error: jurisdictionErr }, { status: 400 });
  }

  const prompt = buildAgentPrompt({
    scenario,
    fingerprint,
    fingerprintString,
    classification,
    jurisdiction,
  });

  return NextResponse.json({ prompt });
}
