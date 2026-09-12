import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const db = getDb();
  const stats = db.prepare(`
    SELECT (SELECT COUNT(*) FROM cats) AS cats,
           (SELECT COUNT(*) FROM drawings) AS drawings,
           (SELECT COUNT(*) FROM reports WHERE resolved_at IS NULL) AS catReports,
           (SELECT COUNT(*) FROM drawing_reports WHERE resolved_at IS NULL) AS drawingReports,
           (SELECT COUNT(*) FROM feedback WHERE status = 'new') AS feedback
  `).get();
  const cats = db.prepare(`
    SELECT c.id, c.image_url AS imageUrl, c.status, c.is_visible AS isVisible,
           c.is_my_cat AS isMyCat, c.created_at AS createdAt, c.source_url AS sourceUrl,
           COALESCE(u.nickname, '未命名用户') AS owner,
           (SELECT COUNT(*) FROM drawings d WHERE d.cat_id = c.id) AS drawingCount,
           (SELECT COUNT(*) FROM reports r WHERE r.cat_id = c.id AND r.resolved_at IS NULL) AS reportCount
    FROM cats c JOIN anonymous_users u ON u.id = c.uploader_id
    ORDER BY c.created_at DESC
  `).all();
  const drawings = db.prepare(`
    SELECT d.id, d.cat_id AS catId, d.image_url AS imageUrl, d.moderation_status AS moderationStatus,
           d.created_at AS createdAt, COALESCE(u.nickname, '未命名用户') AS artist,
           (SELECT COUNT(*) FROM drawing_reports r WHERE r.drawing_id = d.id AND r.resolved_at IS NULL) AS reportCount
    FROM drawings d JOIN anonymous_users u ON u.id = d.artist_id
    ORDER BY d.created_at DESC
  `).all();
  const catReports = db.prepare(`
    SELECT r.id, r.cat_id AS itemId, c.image_url AS imageUrl, r.reason, r.details, r.created_at AS createdAt,
           COALESCE(u.nickname, '未命名用户') AS reporter
    FROM reports r JOIN cats c ON c.id = r.cat_id JOIN anonymous_users u ON u.id = r.reporter_id
    WHERE r.resolved_at IS NULL ORDER BY r.created_at DESC
  `).all();
  const drawingReports = db.prepare(`
    SELECT r.id, r.drawing_id AS itemId, d.image_url AS imageUrl, r.reason, r.details, r.created_at AS createdAt,
           COALESCE(u.nickname, '未命名用户') AS reporter
    FROM drawing_reports r JOIN drawings d ON d.id = r.drawing_id JOIN anonymous_users u ON u.id = r.reporter_id
    WHERE r.resolved_at IS NULL ORDER BY r.created_at DESC
  `).all();
  const feedback = db.prepare(`
    SELECT f.id, f.type, f.message, f.page_url AS pageUrl, f.status, f.created_at AS createdAt,
           COALESCE(u.nickname, '未命名用户') AS nickname
    FROM feedback f JOIN anonymous_users u ON u.id = f.user_id
    ORDER BY CASE f.status WHEN 'new' THEN 0 ELSE 1 END, f.created_at DESC
  `).all();
  return NextResponse.json({ stats, cats, drawings, reports: { cats: catReports, drawings: drawingReports }, feedback });
}
