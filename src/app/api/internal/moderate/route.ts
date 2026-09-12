import path from "node:path";
import { unlink } from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin";
import { dataPath, getDb, inTransaction } from "@/lib/db";

export const runtime = "nodejs";

function mediaFile(imageUrl: string) {
  const prefix = "/api/media/";
  if (!imageUrl.startsWith(prefix)) return null;
  const relative = imageUrl.slice(prefix.length).split("/").filter(Boolean);
  if (relative.length !== 2 || relative.some((segment) => segment === "." || segment === "..")) return null;
  const root = path.resolve(dataPath("uploads"));
  const target = path.resolve(root, ...relative);
  return target.startsWith(`${root}${path.sep}`) ? target : null;
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = (await request.json()) as { entity?: unknown; id?: unknown; action?: unknown };
  const entity = typeof body.entity === "string" ? body.entity : "";
  const id = typeof body.id === "string" ? body.id : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!id || !["cat", "drawing", "feedback"].includes(entity)) return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  const db = getDb();
  const files: string[] = [];

  if (entity === "cat" && ["hide", "restore"].includes(action)) {
    const result = inTransaction(() => {
      const updated = action === "restore"
        ? db.prepare("UPDATE cats SET is_visible = 1, status = CASE WHEN status IN ('under_re_review', 'removed') THEN 'approved' ELSE status END WHERE id = ?").run(id)
        : db.prepare("UPDATE cats SET is_visible = 0 WHERE id = ?").run(id);
      db.prepare("UPDATE reports SET resolved_at = CURRENT_TIMESTAMP WHERE cat_id = ? AND resolved_at IS NULL").run(id);
      return updated;
    });
    if (result.changes === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } else if (entity === "drawing" && ["hide", "restore"].includes(action)) {
    const status = action === "restore" ? "visible" : "hidden";
    const result = inTransaction(() => {
      const updated = db.prepare("UPDATE drawings SET moderation_status = ? WHERE id = ?").run(status, id);
      db.prepare("UPDATE drawing_reports SET resolved_at = CURRENT_TIMESTAMP WHERE drawing_id = ? AND resolved_at IS NULL").run(id);
      return updated;
    });
    if (result.changes === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } else if (entity === "feedback" && ["resolve", "reopen"].includes(action)) {
    const result = db.prepare("UPDATE feedback SET status = ? WHERE id = ?").run(action === "resolve" ? "resolved" : "new", id);
    if (result.changes === 0) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } else if (action === "delete" && entity === "drawing") {
    const drawing = db.prepare("SELECT image_url AS imageUrl FROM drawings WHERE id = ?").get(id) as { imageUrl: string } | undefined;
    if (!drawing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const file = mediaFile(drawing.imageUrl);
    if (file) files.push(file);
    db.prepare("DELETE FROM drawings WHERE id = ?").run(id);
  } else if (action === "delete" && entity === "cat") {
    const cat = db.prepare("SELECT image_url AS imageUrl FROM cats WHERE id = ?").get(id) as { imageUrl: string } | undefined;
    if (!cat) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    const drawingImages = db.prepare("SELECT image_url AS imageUrl FROM drawings WHERE cat_id = ?").all(id) as Array<{ imageUrl: string }>;
    for (const imageUrl of [cat.imageUrl, ...drawingImages.map((row) => row.imageUrl)]) {
      const file = mediaFile(imageUrl);
      if (file) files.push(file);
    }
    db.prepare("DELETE FROM cats WHERE id = ?").run(id);
  } else {
    return NextResponse.json({ error: "INVALID_ACTION" }, { status: 400 });
  }

  await Promise.all(files.map((file) => unlink(file).catch(() => undefined)));
  return NextResponse.json({ ok: true });
}
