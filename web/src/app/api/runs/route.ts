import { NextRequest, NextResponse } from "next/server";
import { listRuns, getRun, getRunRequests } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("id");

  if (runId) {
    const run = getRun(runId);
    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    const requests = getRunRequests(runId);
    return NextResponse.json({ run, requests });
  }

  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const runs = listRuns(limit);
  return NextResponse.json({ runs });
}
