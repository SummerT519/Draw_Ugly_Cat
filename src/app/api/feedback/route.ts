import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const body = (await request.json()) as { type?: unknown; message?: unknown; pageUrl?: unknown };
  const type = body.type === "bug" || body.type === "suggestion" ? body.type : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const pageUrl = typeof body.pageUrl === "string" ? body.pageUrl.trim().slice(0, 500) : null;
  if (!type || message.length < 5 || message.length > 2000) {
    return NextResponse.json({ error: "INVALID_FEEDBACK" }, { status: 400 });
  }
  const id = randomUUID();
  getDb().prepare("INSERT INTO feedback (id, user_id, type, message, page_url) VALUES (?, ?, ?, ?, ?)")
    .run(id, userId, type, message, pageUrl);
  return NextResponse.json({ id }, { status: 201 });
}
