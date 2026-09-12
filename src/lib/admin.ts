import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE = "ugly_cat_admin";

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export function adminConfigured() {
  return typeof process.env.ADMIN_ACCESS_KEY === "string" && process.env.ADMIN_ACCESS_KEY.length >= 20;
}

export function validAdminKey(candidate: string) {
  const secret = process.env.ADMIN_ACCESS_KEY;
  if (!secret || secret.length < 20) return false;
  return timingSafeEqual(digest(candidate), digest(secret));
}

export function adminSessionToken() {
  const secret = process.env.ADMIN_ACCESS_KEY;
  if (!secret) return "";
  return createHmac("sha256", secret).update("ugly-cat-admin-session-v1").digest("hex");
}

export function isAdminRequest(request: NextRequest) {
  if (!adminConfigured()) return false;
  const token = request.cookies.get(ADMIN_COOKIE)?.value ?? "";
  return timingSafeEqual(digest(token), digest(adminSessionToken()));
}
