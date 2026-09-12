import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { dataPath, getDb } from "@/lib/db";
import { getUserId, isUniqueConstraint } from "@/lib/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  const { id } = await context.params;
  const db = getDb();
  const access = db.prepare(`
    SELECT CASE WHEN uploader_id = ? THEN 1 ELSE 0 END AS isUploader,
           EXISTS(SELECT 1 FROM drawings WHERE cat_id = cats.id AND artist_id = ?) AS hasDrawn
    FROM cats WHERE id = ? AND status = 'approved' AND is_visible = 1
  `).get(userId, userId, id) as { isUploader: number; hasDrawn: number } | undefined;
  if (!access) return NextResponse.json({ error: "CAT_NOT_FOUND" }, { status: 404 });
  if (access.isUploader !== 1 && access.hasDrawn !== 1) {
    return NextResponse.json({ error: "DRAW_FIRST" }, { status: 403 });
  }

  const drawings = db
    .prepare(`
      SELECT d.id, d.image_url AS imageUrl, d.created_at AS createdAt,
             COALESCE(u.nickname, '神秘画手') AS nickname,
             CASE WHEN d.artist_id = ? THEN 1 ELSE 0 END AS isMine
      FROM drawings d JOIN anonymous_users u ON u.id = d.artist_id
      WHERE d.cat_id = ? AND d.moderation_status = 'visible'
      ORDER BY isMine DESC, d.created_at DESC
    `)
    .all(userId, id) as Array<Record<string, unknown>>;
  return NextResponse.json({
    drawings: drawings.map((drawing) => ({ ...drawing, isMine: drawing.isMine === 1 })),
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = getUserId(request);
  const { id: catId } = await context.params;
  const db = getDb();
  const cat = db.prepare("SELECT status, is_visible AS isVisible FROM cats WHERE id = ?").get(catId) as { status: string; isVisible: number } | undefined;
  if (!cat || cat.status !== "approved" || cat.isVisible !== 1) {
    return NextResponse.json({ error: "CAT_NOT_AVAILABLE" }, { status: 409 });
  }

  const form = await request.formData();
  const image = form.get("image");
  if (!(image instanceof File) || image.type !== "image/png") {
    return NextResponse.json({ error: "绘画必须为 PNG 图片。" }, { status: 400 });
  }
  if (image.size > 6 * 1024 * 1024) {
    return NextResponse.json({ error: "绘画文件过大。" }, { status: 413 });
  }

  const drawingId = randomUUID();
  const filename = `${drawingId}.png`;
  const filePath = dataPath("uploads", "drawings", filename);
  await writeFile(filePath, Buffer.from(await image.arrayBuffer()));
  try {
    db.prepare("INSERT INTO drawings (id, cat_id, artist_id, image_url) VALUES (?, ?, ?, ?)")
      .run(drawingId, catId, userId, `/api/media/drawings/${filename}`);
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    if (isUniqueConstraint(error)) {
      return NextResponse.json({ error: "ALREADY_DRAWN" }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ id: drawingId, galleryUrl: `/cat/${catId}` }, { status: 201 });
}
