import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, inTransaction } from "@/lib/db";
import { DRAWING_REVIEW_TARGET, getUserId, isUniqueConstraint } from "@/lib/server";

export const runtime = "nodejs";

function exclusions(request: NextRequest) {
  return request.nextUrl.searchParams.get("exclude")?.split(",").filter((id) => /^[a-zA-Z0-9-]{1,64}$/.test(id)).slice(0, 20) ?? [];
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const excluded = exclusions(request);
  const excludeSql = excluded.length ? `AND d.id NOT IN (${excluded.map(() => "?").join(",")})` : "";
  const drawing = getDb().prepare(`
    SELECT d.id, d.image_url AS drawingImageUrl, d.created_at AS createdAt,
           c.image_url AS catImageUrl, COALESCE(artist.nickname, '神秘画手') AS nickname,
           COUNT(DISTINCT dv.id) AS reviewCount,
           GROUP_CONCAT(DISTINCT dr.reason) AS reportReasons
    FROM drawings d
    JOIN cats c ON c.id = d.cat_id
    JOIN anonymous_users artist ON artist.id = d.artist_id
    JOIN drawing_reports dr ON dr.drawing_id = d.id AND dr.resolved_at IS NULL
    LEFT JOIN drawing_reviews dv ON dv.drawing_id = d.id
    WHERE d.moderation_status = 'under_review' AND d.artist_id <> ?
      AND NOT EXISTS (SELECT 1 FROM drawing_reviews mine WHERE mine.drawing_id = d.id AND mine.reviewer_id = ?)
      ${excludeSql}
    GROUP BY d.id
    ORDER BY COUNT(DISTINCT dv.id) ASC, MIN(dr.created_at) ASC
    LIMIT 1
  `).get(userId, userId, ...excluded) as Record<string, unknown> | undefined;
  return NextResponse.json({ drawing: drawing ?? null, target: DRAWING_REVIEW_TARGET });
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const body = (await request.json()) as { drawingId?: unknown; decision?: unknown };
  const drawingId = typeof body.drawingId === "string" ? body.drawingId : "";
  const decision = body.decision === "keep" || body.decision === "remove" ? body.decision : "";
  if (!drawingId || !decision) return NextResponse.json({ error: "INVALID_REVIEW" }, { status: 400 });

  try {
    const result = inTransaction(() => {
      const db = getDb();
      const drawing = db.prepare("SELECT artist_id AS artistId, moderation_status AS status FROM drawings WHERE id = ?").get(drawingId) as { artistId: string; status: string } | undefined;
      const unresolved = db.prepare("SELECT 1 FROM drawing_reports WHERE drawing_id = ? AND resolved_at IS NULL").get(drawingId);
      if (!drawing || drawing.artistId === userId || drawing.status !== "under_review" || !unresolved) throw new Error("NOT_REVIEWABLE");
      db.prepare("INSERT INTO drawing_reviews (id, drawing_id, reviewer_id, decision) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), drawingId, userId, decision);
      const totals = db.prepare(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN decision = 'keep' THEN 1 ELSE 0 END) AS keepCount,
               SUM(CASE WHEN decision = 'remove' THEN 1 ELSE 0 END) AS removeCount
        FROM drawing_reviews WHERE drawing_id = ?
      `).get(drawingId) as { total: number; keepCount: number; removeCount: number };
      let status = "under_review";
      if (totals.total >= DRAWING_REVIEW_TARGET && totals.keepCount !== totals.removeCount) {
        status = totals.keepCount > totals.removeCount ? "visible" : "hidden";
        db.prepare("UPDATE drawings SET moderation_status = ? WHERE id = ?").run(status, drawingId);
        db.prepare("UPDATE drawing_reports SET resolved_at = CURRENT_TIMESTAMP WHERE drawing_id = ? AND resolved_at IS NULL").run(drawingId);
      }
      return { status, reviewCount: totals.total, resolved: status !== "under_review" };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isUniqueConstraint(error)) return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
    if (error instanceof Error && error.message === "NOT_REVIEWABLE") return NextResponse.json({ error: "NOT_REVIEWABLE" }, { status: 409 });
    throw error;
  }
}
