import { NextRequest, NextResponse } from "next/server";
import {
  getFullSystemPrompt,
  getJurisdictionPromptText,
  getPersonalities,
  getPromptSections,
} from "@/lib/prompts";

/**
 * GET /api/prompt?personality=compliance_officer&jurisdiction=hk&rubric=rubric.md
 *
 * Returns the full assembled system prompt and individual sections for the inspector.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const personality = searchParams.get("personality") || "compliance_officer";
  const jurisdiction = searchParams.get("jurisdiction") || "hk";
  const rubric = searchParams.get("rubric") || "rubric.md";

  const personalities = getPersonalities();
  const personalityLabel =
    personalities[personality]?.label || personality;

  const fullPrompt = getFullSystemPrompt(personality, jurisdiction, rubric);
  const jurisdictionText = getJurisdictionPromptText(jurisdiction);
  const sections = getPromptSections(personality, jurisdiction, rubric);

  return NextResponse.json({
    personality,
    personality_label: personalityLabel,
    jurisdiction,
    rubric,
    full_prompt: fullPrompt,
    jurisdiction_text: jurisdictionText,
    sections,
  });
}
