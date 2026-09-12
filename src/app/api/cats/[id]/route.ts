import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { asBoolean, getUserId } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  getUserId(request);
  const { id } = await context.params;
  const row = getDb()
    .prepare(`
      SELECT c.id, c.image_url AS imageUrl, c.source_url AS sourceUrl,
             c.source_label AS sourceLabel, c.source_author AS sourceAuthor,
             c.license_name AS licenseName, c.is_my_cat AS isMyCat, c.is_visible AS isVisible, c.status,
             c.created_at AS createdAt, COUNT(d.id) AS drawingCount
      FROM cats c LEFT JOIN drawings d ON d.cat_id = c.id AND d.moderation_status = 'visible'
      WHERE c.id = ? AND c.status = 'approved' AND c.is_visible = 1 GROUP BY c.id
    `)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return NextResponse.json({ error: "CAT_NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ cat: { ...row, isMyCat: asBoolean(row.isMyCat), isVisible: asBoolean(row.isVisible) } });
}
