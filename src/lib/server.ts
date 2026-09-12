import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export const USER_COOKIE = "ugly_cat_user";
export const NORMAL_REVIEW_TARGET = 10;
export const RE_REVIEW_TARGET = 5;
export const DRAWING_REVIEW_TARGET = 5;

export function getUserId(request: NextRequest) {
  const id = request.cookies.get(USER_COOKIE)?.value;
  if (!id || !/^[a-zA-Z0-9-]{8,64}$/.test(id)) {
    throw new Error("SESSION_REQUIRED");
  }
  getDb().prepare("INSERT OR IGNORE INTO anonymous_users (id) VALUES (?)").run(id);
  return id;
}

export function createSessionId() {
  return randomUUID();
}

export function asBoolean(value: unknown) {
  return value === 1 || value === true;
}

export function isUniqueConstraint(error: unknown) {
  return error instanceof Error && error.message.includes("UNIQUE constraint failed");
}

export function isSevereReason(reason: string) {
  return ["animal_abuse", "sexual", "violence"].includes(reason);
}
