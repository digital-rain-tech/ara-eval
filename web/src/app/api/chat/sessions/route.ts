import { NextRequest, NextResponse } from "next/server";
import { listChatSessions, getChatSession, getChatMessages } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const session = getChatSession(id);
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 },
      );
    }
    const messages = getChatMessages(id);
    return NextResponse.json({ session, messages });
  }

  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const sessions = listChatSessions(limit);
  return NextResponse.json({ sessions });
}
