import { NextResponse } from "next/server";
import { loadScenarios } from "@/lib/scenarios";
import { getPersonalities, getJurisdictions } from "@/lib/prompts";

export async function GET() {
  const scenarios = loadScenarios(true);
  const personalities = getPersonalities();
  const jurisdictions = getJurisdictions();

  return NextResponse.json({
    scenarios,
    personalities,
    jurisdictions,
  });
}
