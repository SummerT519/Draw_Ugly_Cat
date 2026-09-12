import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, inTransaction } from "@/lib/db";
import { getUserId, isSevereReason, isUniqueConstraint } from "@/lib/server";

export const runtime = "nodejs";

const reasons = ["not_cat", "animal_abuse", "sexual", "violence", "spam", "other"];

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const body = (await request.json()) as { catId?: unknown; reason?: unknown; details?: unknown };
  const catId = typeof body.catId === "string" ? body.catId : "";
  const reason = typeof body.reason === "string" ? body.reason : "";
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 500) : null;
  if (!catId || !reasons.includes(reason)) {
    return NextResponse.json({ error: "INVALID_REPORT" }, { status: 400 });
  }

  try {
    const status = inTransaction(() => {
      const db = getDb();
      const cat = db.prepare("SELECT status FROM cats WHERE id = ?").get(catId) as { status: string } | undefined;
      if (!cat) throw new Error("CAT_NOT_FOUND");
      db.prepare("INSERT INTO reports (id, cat_id, reporter_id, reason, details) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), catId, userId, reason, details);
      if (isSevereReason(reason) && cat.status === "approved") {
        db.prepare("UPDATE cats SET status = 'under_re_review' WHERE id = ?").run(catId);
        return "under_re_review";
      }
      return cat.status;
    });
    return NextResponse.json({ status }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraint(error)) return NextResponse.json({ error: "ALREADY_REPORTED" }, { status: 409 });
    if (error instanceof Error && error.message === "CAT_NOT_FOUND") {
      return NextResponse.json({ error: "CAT_NOT_FOUND" }, { status: 404 });
    }
    throw error;
  }
}
