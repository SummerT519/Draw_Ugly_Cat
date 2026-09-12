import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const TARGET_COUNT = 10;
const CATEGORY = "Category:Lolcats";
const blockedWords = /(?:dead|death|gore|blood|wound|injur|abuse|corpse|kill|hitler|toilet|newcomers|punishing|rally)/i;
const blockedPageIds = new Set([3156680, 10330972, 11943716]);
const mimeExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const projectDir = process.cwd();
const dataDir = process.env.UGLY_CAT_DATA_DIR || path.join(projectDir, "data");
const catDir = path.join(dataDir, "uploads", "cats");
mkdirSync(catDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "ugly-cat.sqlite"));
db.exec(readFileSync(path.join(projectDir, "database", "schema.sql"), "utf8"));
for (const [name, type] of [["source_url", "TEXT"], ["source_label", "TEXT"], ["source_author", "TEXT"], ["license_name", "TEXT"]]) {
  const columns = db.prepare("PRAGMA table_info(cats)").all();
  if (!columns.some((column) => column.name === name)) db.exec(`ALTER TABLE cats ADD COLUMN ${name} ${type}`);
}
db.prepare("INSERT OR IGNORE INTO anonymous_users (id, nickname) VALUES ('internet-meme-library', '网络猫 Meme 馆')").run();
for (const pageId of blockedPageIds) {
  const id = `commons-${pageId}`;
  const row = db.prepare("SELECT image_url AS imageUrl FROM cats WHERE id = ? AND uploader_id = 'internet-meme-library'").get(id);
  if (!row) continue;
  db.prepare("DELETE FROM cats WHERE id = ?").run(id);
  const filename = path.basename(row.imageUrl);
  try { unlinkSync(path.join(catDir, filename)); } catch { /* already absent */ }
}

const api = new URL("https://commons.wikimedia.org/w/api.php");
for (const [key, value] of Object.entries({
  action: "query",
  generator: "categorymembers",
  gcmtitle: CATEGORY,
  gcmtype: "file",
  gcmlimit: "50",
  prop: "imageinfo",
  iiprop: "url|mime|extmetadata",
  iiurlwidth: "1200",
  format: "json",
  formatversion: "2",
  origin: "*",
})) api.searchParams.set(key, value);

const response = await fetch(api, { headers: { "User-Agent": "UglyCatStudio/0.1 (local content import)" } });
if (!response.ok) throw new Error(`Wikimedia API returned ${response.status}`);
const payload = await response.json();
const pages = (payload.query?.pages || [])
  .filter((page) => page.imageinfo?.[0] && mimeExtensions[page.imageinfo[0].mime] && !blockedWords.test(page.title) && !blockedPageIds.has(page.pageid))
  .sort((a, b) => a.pageid - b.pageid);

const clean = (value = "") => value
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 300);

const existing = db.prepare("SELECT COUNT(*) AS count FROM cats WHERE uploader_id = 'internet-meme-library'").get().count;
let remaining = Math.max(0, TARGET_COUNT - existing);
const imported = [];
const insert = db.prepare(`
  INSERT OR IGNORE INTO cats (
    id, uploader_id, image_url, source_url, source_label, source_author,
    license_name, is_my_cat, status
  ) VALUES (?, 'internet-meme-library', ?, ?, ?, ?, ?, 0, 'approved')
`);

for (const page of pages) {
  if (remaining === 0) break;
  const info = page.imageinfo[0];
  const id = `commons-${page.pageid}`;
  if (db.prepare("SELECT 1 FROM cats WHERE id = ?").get(id)) continue;
  const extension = mimeExtensions[info.mime];
  const filename = `${id}.${extension}`;
  const filePath = path.join(catDir, filename);
  const imageResponse = await fetch(info.thumburl || info.url, { headers: { "User-Agent": "UglyCatStudio/0.1 (local content import)" } });
  if (!imageResponse.ok) continue;
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) continue;
  writeFileSync(filePath, bytes);

  const metadata = info.extmetadata || {};
  const sourceUrl = info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`;
  const result = insert.run(
    id,
    `/api/media/cats/${filename}`,
    sourceUrl,
    page.title.replace(/^File:/, ""),
    clean(metadata.Artist?.value || metadata.Credit?.value || "Wikimedia Commons contributor"),
    clean(metadata.LicenseShortName?.value || metadata.UsageTerms?.value || "See source"),
  );
  if (result.changes === 0) {
    unlinkSync(filePath);
    continue;
  }
  imported.push({ id, title: page.title.replace(/^File:/, ""), sourceUrl, license: clean(metadata.LicenseShortName?.value || "See source") });
  remaining -= 1;
}

const total = db.prepare("SELECT COUNT(*) AS count FROM cats WHERE uploader_id = 'internet-meme-library'").get().count;
console.log(JSON.stringify({ category: CATEGORY, imported, existingBefore: existing, total }, null, 2));
if (total < TARGET_COUNT) throw new Error(`Only ${total}/${TARGET_COUNT} meme images were imported.`);
