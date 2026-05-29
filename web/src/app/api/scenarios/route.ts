import { NextRequest, NextResponse } from "next/server";
import {
  loadScenarios,
  listScenarioSets,
  DEFAULT_SCENARIOS_FILE,
} from "@/lib/scenarios";
import { getPersonalities, getJurisdictions } from "@/lib/prompts";
import { getCurrentModel } from "@/lib/openrouter";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("set");
  const availableSets = listScenarioSets();
  const set =
    requested && availableSets.includes(requested)
      ? requested
      : DEFAULT_SCENARIOS_FILE;

  const scenarios = loadScenarios(true, set);
  const personalities = getPersonalities();
  const jurisdictions = getJurisdictions();
  const model = getCurrentModel();

  return NextResponse.json({
    scenarios,
    personalities,
    jurisdictions,
    model,
    set,
    availableSets,
  });
}
