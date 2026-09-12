import { randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { dataPath, getDb } from "@/lib/db";
import { getUserId } from "@/lib/server";

export const runtime = "nodejs";

const allowedTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  const form = await request.formData();
  const image = form.get("image");
  const isMyCat = form.get("isMyCat") === "true";
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "请选择一张图片。" }, { status: 400 });
  }
  const extension = allowedTypes[image.type];
  if (!extension) {
    return NextResponse.json({ error: "仅支持 JPG、PNG 或 WEBP。" }, { status: 415 });
  }
  if (image.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "图片不能超过 8 MB。" }, { status: 413 });
  }

  const id = randomUUID();
  const filename = `${id}.${extension}`;
  const filePath = dataPath("uploads", "cats", filename);
  await writeFile(filePath, Buffer.from(await image.arrayBuffer()));
  try {
    getDb()
      .prepare("INSERT INTO cats (id, uploader_id, image_url, is_my_cat) VALUES (?, ?, ?, ?)")
      .run(id, userId, `/api/media/cats/${filename}`, isMyCat ? 1 : 0);
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
  return NextResponse.json({ id, status: "pending" }, { status: 201 });
}
