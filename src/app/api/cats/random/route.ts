import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { asBoolean, getUserId } from "@/lib/server";

export const runtime = "nodejs";

type CatRow = Record<string, unknown> & { id: string };

function normalise(row: CatRow, repeat = false) {
  return { ...row, isMyCat: asBoolean(row.isMyCat), repeat };
}

export async function GET(request: NextRequest) {
  const userId = getUserId(request);
  const requestedId = request.nextUrl.searchParams.get("id");
  const db = getDb();

  if (requestedId) {
    const requested = db
      .prepare(`
        SELECT c.id, c.image_url AS imageUrl, c.is_my_cat AS isMyCat, c.status,
               c.created_at AS createdAt, COUNT(d.id) AS drawingCount
        FROM cats c LEFT JOIN drawings d ON d.cat_id = c.id AND d.moderation_status = 'visible'
        WHERE c.id = ? AND c.status = 'approved' AND c.is_visible = 1 GROUP BY c.id
      `)
      .get(requestedId) as CatRow | undefined;
    return requested
      ? NextResponse.json({ cat: normalise(requested) })
      : NextResponse.json({ error: "CAT_NOT_AVAILABLE" }, { status: 404 });
  }

  const baseQuery = `
    SELECT c.id, c.image_url AS imageUrl, c.is_my_cat AS isMyCat, c.status,
           c.created_at AS createdAt, COUNT(all_drawings.id) AS drawingCount
    FROM cats c
    LEFT JOIN drawings all_drawings ON all_drawings.cat_id = c.id AND all_drawings.moderation_status = 'visible'
    WHERE c.status = 'approved' AND c.is_visible = 1 AND c.uploader_id <> ?
      AND %DRAWN_FILTER%
    GROUP BY c.id
    ORDER BY RANDOM() LIMIT 1
  `;
  let row = db
    .prepare(baseQuery.replace("%DRAWN_FILTER%", "NOT EXISTS (SELECT 1 FROM drawings mine WHERE mine.cat_id = c.id AND mine.artist_id = ?)"))
    .get(userId, userId) as CatRow | undefined;
  if (row) return NextResponse.json({ cat: normalise(row) });

  row = db
    .prepare(baseQuery.replace("%DRAWN_FILTER%", "1 = 1"))
    .get(userId) as CatRow | undefined;
  return NextResponse.json({ cat: row ? normalise(row, true) : null });
}
