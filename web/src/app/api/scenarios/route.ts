import { NextResponse } from "next/server";
import { loadScenarios } from "@/lib/scenarios";
import { getPersonalities, getJurisdictions } from "@/lib/prompts";
import { getCurrentModel } from "@/lib/openrouter";

export async function GET() {
  const scenarios = loadScenarios(true);
  const personalities = getPersonalities();
  const jurisdictions = getJurisdictions();
  const model = getCurrentModel();

  return NextResponse.json({
    scenarios,
    personalities,
    jurisdictions,
    model,
  });
}
