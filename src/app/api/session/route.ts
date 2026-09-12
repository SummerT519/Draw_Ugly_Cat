import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUserId } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = getUserId(request);
  const user = getDb().prepare("SELECT nickname, created_at AS createdAt FROM anonymous_users WHERE id = ?").get(id);
  return NextResponse.json(user);
}

export async function PATCH(request: NextRequest) {
  const id = getUserId(request);
  const body = (await request.json()) as { nickname?: unknown };
  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
  if (nickname.length < 1 || nickname.length > 24) {
    return NextResponse.json({ error: "昵称需要 1–24 个字符。" }, { status: 400 });
  }
  getDb()
    .prepare("UPDATE anonymous_users SET nickname = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(nickname, id);
  return NextResponse.json({ nickname });
}
