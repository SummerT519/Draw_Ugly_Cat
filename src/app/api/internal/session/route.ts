import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, adminConfigured, adminSessionToken, isAdminRequest, validAdminKey } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: isAdminRequest(request), configured: adminConfigured() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { accessKey?: unknown };
  const accessKey = typeof body.accessKey === "string" ? body.accessKey : "";
  if (!validAdminKey(accessKey)) return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_COOKIE, adminSessionToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_COOKIE, "", { httpOnly: true, sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
