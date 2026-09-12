import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDb, inTransaction } from "@/lib/db";
import { getUserId, isUniqueConstraint, NORMAL_REVIEW_TARGET, RE_REVIEW_TARGET } from "@/lib/server";

export const runtime = "nodejs";

function exclusions(request: NextRequest) {
  return request.nextUrl.searchParams
    .get("exclude")
    ?.split(",")
    .filter((id) => /^[a-zA-Z0-9-]{1,64}$/.test(id))
    .slice(0, 20) ?? [];
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const mode = request.nextUrl.searchParams.get("mode") === "rereview" ? "rereview" : "normal";
  const excluded = exclusions(request);
  const excludeSql = excluded.length ? `AND c.id NOT IN (${excluded.map(() => "?").join(",")})` : "";
  const db = getDb();

  if (mode === "rereview") {
    const cat = db
      .prepare(`
        SELECT c.id, c.image_url AS imageUrl, c.created_at AS createdAt,
               COUNT(DISTINCT rr.id) AS reviewCount,
               GROUP_CONCAT(DISTINCT reports.reason) AS reportReasons
        FROM cats c
        JOIN reports ON reports.cat_id = c.id AND reports.resolved_at IS NULL
        LEFT JOIN re_reviews rr ON rr.cat_id = c.id
        WHERE c.status IN ('approved', 'under_re_review') AND c.is_visible = 1
          AND c.uploader_id <> ?
          AND NOT EXISTS (SELECT 1 FROM re_reviews mine WHERE mine.cat_id = c.id AND mine.reviewer_id = ?)
          ${excludeSql}
        GROUP BY c.id
        ORDER BY CASE WHEN c.status = 'under_re_review' THEN 0 ELSE 1 END,
                 COUNT(DISTINCT rr.id) ASC, c.created_at ASC
        LIMIT 1
      `)
      .get(userId, userId, ...excluded) as Record<string, unknown> | undefined;
    return NextResponse.json({ cat: cat ?? null, target: RE_REVIEW_TARGET });
  }

  const cat = db
    .prepare(`
      SELECT c.id, c.image_url AS imageUrl, c.created_at AS createdAt,
             COUNT(r.id) AS reviewCount
      FROM cats c LEFT JOIN reviews r ON r.cat_id = c.id
      WHERE c.status = 'pending' AND c.is_visible = 1 AND c.uploader_id <> ?
        AND NOT EXISTS (SELECT 1 FROM reviews mine WHERE mine.cat_id = c.id AND mine.reviewer_id = ?)
        ${excludeSql}
      GROUP BY c.id
      ORDER BY CASE
        WHEN COUNT(r.id) >= ? AND
             SUM(CASE WHEN r.decision = 'approve' THEN 1 ELSE 0 END) =
             SUM(CASE WHEN r.decision = 'reject' THEN 1 ELSE 0 END)
        THEN 0 ELSE 1 END,
        COUNT(r.id) ASC, c.created_at ASC
      LIMIT 1
    `)
    .get(userId, userId, ...excluded, NORMAL_REVIEW_TARGET) as Record<string, unknown> | undefined;
  return NextResponse.json({ cat: cat ?? null, target: NORMAL_REVIEW_TARGET });
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const body = (await request.json()) as { catId?: unknown; mode?: unknown; decision?: unknown };
  const catId = typeof body.catId === "string" ? body.catId : "";
  const mode = body.mode === "rereview" ? "rereview" : "normal";
  const allowed = mode === "rereview" ? ["keep", "remove"] : ["approve", "reject"];
  if (!catId || !allowed.includes(String(body.decision))) {
    return NextResponse.json({ error: "INVALID_REVIEW" }, { status: 400 });
  }

  try {
    const result = inTransaction(() => {
      const db = getDb();
      const cat = db.prepare("SELECT uploader_id AS uploaderId, status FROM cats WHERE id = ?").get(catId) as
        | { uploaderId: string; status: string }
        | undefined;
      if (!cat || cat.uploaderId === userId) throw new Error("NOT_REVIEWABLE");

      if (mode === "normal") {
        if (cat.status !== "pending") throw new Error("NOT_REVIEWABLE");
        db.prepare("INSERT INTO reviews (id, cat_id, reviewer_id, decision) VALUES (?, ?, ?, ?)")
          .run(randomUUID(), catId, userId, String(body.decision));
        const totals = db.prepare(`
          SELECT COUNT(*) AS total,
                 SUM(CASE WHEN decision = 'approve' THEN 1 ELSE 0 END) AS approve,
                 SUM(CASE WHEN decision = 'reject' THEN 1 ELSE 0 END) AS reject
          FROM reviews WHERE cat_id = ?
        `).get(catId) as { total: number; approve: number; reject: number };
        let status = "pending";
        if (totals.total >= NORMAL_REVIEW_TARGET && totals.approve !== totals.reject) {
          status = totals.approve > totals.reject ? "approved" : "rejected";
          db.prepare("UPDATE cats SET status = ? WHERE id = ?").run(status, catId);
        }
        return { status, reviewCount: totals.total, resolved: status !== "pending" };
      }

      if (!['approved', 'under_re_review'].includes(cat.status)) throw new Error("NOT_REVIEWABLE");
      const unresolved = db.prepare("SELECT 1 FROM reports WHERE cat_id = ? AND resolved_at IS NULL").get(catId);
      if (!unresolved) throw new Error("NOT_REVIEWABLE");
      db.prepare("INSERT INTO re_reviews (id, cat_id, reviewer_id, decision) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), catId, userId, String(body.decision));
      const totals = db.prepare(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN decision = 'keep' THEN 1 ELSE 0 END) AS keep,
               SUM(CASE WHEN decision = 'remove' THEN 1 ELSE 0 END) AS remove
        FROM re_reviews WHERE cat_id = ?
      `).get(catId) as { total: number; keep: number; remove: number };
      let status = cat.status;
      if (totals.total >= RE_REVIEW_TARGET && totals.keep !== totals.remove) {
        status = totals.keep > totals.remove ? "approved" : "removed";
        db.prepare("UPDATE cats SET status = ? WHERE id = ?").run(status, catId);
        db.prepare("UPDATE reports SET resolved_at = CURRENT_TIMESTAMP WHERE cat_id = ? AND resolved_at IS NULL").run(catId);
      }
      return { status, reviewCount: totals.total, resolved: status === "removed" || (status === "approved" && totals.total >= RE_REVIEW_TARGET) };
    });
    return NextResponse.json(result);
  } catch (error) {
    if (isUniqueConstraint(error)) return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
    if (error instanceof Error && error.message === "NOT_REVIEWABLE") {
      return NextResponse.json({ error: "NOT_REVIEWABLE" }, { status: 409 });
    }
    throw error;
  }
}
