import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { dataPath } from "@/lib/db";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await context.params;
  if (parts.length !== 2 || !["cats", "drawings"].includes(parts[0]) || !/^[a-zA-Z0-9.-]+$/.test(parts[1])) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const filePath = dataPath("uploads", parts[0], parts[1]);
  const extension = path.extname(filePath).toLowerCase();
  try {
    const file = await readFile(filePath);
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentTypes[extension] || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
}
