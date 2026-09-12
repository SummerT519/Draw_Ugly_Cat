import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { asBoolean, getUserId } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const rows = getDb()
    .prepare(`
      SELECT c.id, c.image_url AS imageUrl, c.is_my_cat AS isMyCat, c.is_visible AS isVisible,
             c.status, c.created_at AS createdAt,
             COUNT(DISTINCT r.id) AS reviewCount,
             COUNT(DISTINCT d.id) AS drawingCount
      FROM cats c
      LEFT JOIN reviews r ON r.cat_id = c.id
      LEFT JOIN drawings d ON d.cat_id = c.id AND d.moderation_status = 'visible'
      WHERE c.uploader_id = ?
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `)
    .all(userId) as Array<Record<string, unknown>>;

  return NextResponse.json({
    cats: rows.map((row) => ({ ...row, isMyCat: asBoolean(row.isMyCat), isVisible: asBoolean(row.isVisible) })),
  });
}
