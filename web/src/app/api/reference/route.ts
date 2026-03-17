import { NextRequest, NextResponse } from "next/server";
import { loadReferenceResults } from "@/lib/scenarios";

/**
 * GET /api/reference?scenario=insurance-claims-001
 *
 * Returns pre-computed reference results for a scenario.
 * Searches all model reference directories for lab-01 results.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get("scenario");

  const refs = loadReferenceResults();
  if (!refs) {
    return NextResponse.json({ results: null });
  }

  if (scenarioId) {
    // Find the first reference result that contains this scenario
    for (const [key, data] of Object.entries(refs)) {
      if (!key.includes("lab-01") || key.includes("v2")) continue;
      const results = data as Record<string, unknown>;
      if (scenarioId in results) {
        const scenarioData = results[scenarioId] as Record<string, unknown>;
        return NextResponse.json({ result: scenarioData, source: key });
      }
    }
    return NextResponse.json({ result: null });
  }

  // Return all reference data keyed by file
  return NextResponse.json({ references: refs });
}
