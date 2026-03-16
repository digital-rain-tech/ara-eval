import { NextRequest, NextResponse } from "next/server";
import { listRequests, getRequest } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const row = getRequest(id);
    if (!row) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ request: row });
  }

  const filters = {
    runId: searchParams.get("runId") || undefined,
    scenarioId: searchParams.get("scenarioId") || undefined,
    personality: searchParams.get("personality") || undefined,
    limit: parseInt(searchParams.get("limit") || "100", 10),
  };

  const requests = listRequests(filters);
  return NextResponse.json({ requests });
}
