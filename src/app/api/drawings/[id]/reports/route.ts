import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, inTransaction } from "@/lib/db";
import { getUserId, isUniqueConstraint } from "@/lib/server";

export const runtime = "nodejs";

const reasons = ["sexual", "violence", "hate", "harassment", "spam", "other"];

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  const { id: drawingId } = await context.params;
  const body = (await request.json()) as { reason?: unknown; details?: unknown };
  const reason = typeof body.reason === "string" ? body.reason : "";
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 500) : null;
  if (!reasons.includes(reason)) return NextResponse.json({ error: "INVALID_REPORT" }, { status: 400 });

  try {
    inTransaction(() => {
      const db = getDb();
      const drawing = db.prepare("SELECT artist_id AS artistId FROM drawings WHERE id = ?").get(drawingId) as { artistId: string } | undefined;
      if (!drawing) throw new Error("DRAWING_NOT_FOUND");
      if (drawing.artistId === userId) throw new Error("CANNOT_REPORT_OWN");
      db.prepare("INSERT INTO drawing_reports (id, drawing_id, reporter_id, reason, details) VALUES (?, ?, ?, ?, ?)")
        .run(randomUUID(), drawingId, userId, reason, details);
      db.prepare("UPDATE drawings SET moderation_status = 'under_review' WHERE id = ?").run(drawingId);
    });
    return NextResponse.json({ status: "under_review" }, { status: 201 });
  } catch (error) {
    if (isUniqueConstraint(error)) return NextResponse.json({ error: "ALREADY_REPORTED" }, { status: 409 });
    if (error instanceof Error && error.message === "DRAWING_NOT_FOUND") return NextResponse.json({ error: "DRAWING_NOT_FOUND" }, { status: 404 });
    if (error instanceof Error && error.message === "CANNOT_REPORT_OWN") return NextResponse.json({ error: "CANNOT_REPORT_OWN" }, { status: 403 });
    throw error;
  }
}
