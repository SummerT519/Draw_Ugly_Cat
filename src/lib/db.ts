import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

type DbGlobal = typeof globalThis & { uglyCatDb?: DatabaseSync };

const demoCats = [
  ["demo-approved-orange", "/demo/cat-orange.svg", "approved", "2026-01-01T09:00:00Z"],
  ["demo-approved-grey", "/demo/cat-grey.svg", "approved", "2026-01-02T09:00:00Z"],
  ["demo-pending-tuxedo", "/demo/cat-tuxedo.svg", "pending", "2026-01-03T09:00:00Z"],
  ["demo-pending-white", "/demo/cat-white.svg", "pending", "2026-01-04T09:00:00Z"],
  ["demo-rereview-calico", "/demo/cat-calico.svg", "under_re_review", "2026-01-05T09:00:00Z"],
] as const;

function seed(db: DatabaseSync) {
  const count = db.prepare("SELECT COUNT(*) AS count FROM cats").get() as { count: number };
  if (count.count > 0) return;

  const addUser = db.prepare("INSERT OR IGNORE INTO anonymous_users (id, nickname) VALUES (?, ?)");
  addUser.run("demo-uploader", "猫片供应商");
  for (let i = 1; i <= 12; i += 1) addUser.run(`demo-reviewer-${i}`, `审核猫${i}号`);
  for (let i = 1; i <= 6; i += 1) addUser.run(`demo-artist-${i}`, `乱画选手${i}号`);

  const addCat = db.prepare(
    "INSERT INTO cats (id, uploader_id, image_url, is_my_cat, status, created_at) VALUES (?, 'demo-uploader', ?, 1, ?, ?)",
  );
  for (const cat of demoCats) addCat.run(...cat);

  const addReview = db.prepare(
    "INSERT INTO reviews (id, cat_id, reviewer_id, decision) VALUES (?, ?, ?, ?)",
  );
  for (let i = 1; i <= 9; i += 1) {
    addReview.run(`seed-review-a-${i}`, "demo-pending-tuxedo", `demo-reviewer-${i}`, i <= 5 ? "approve" : "reject");
    addReview.run(`seed-review-b-${i}`, "demo-pending-white", `demo-reviewer-${i}`, i <= 4 ? "approve" : "reject");
  }

  const addDrawing = db.prepare(
    "INSERT INTO drawings (id, cat_id, artist_id, image_url, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  for (let i = 1; i <= 3; i += 1) {
    addDrawing.run(`seed-orange-${i}`, "demo-approved-orange", `demo-artist-${i}`, `/demo/drawing-orange-${i}.svg`, `2026-01-0${i}T10:00:00Z`);
    addDrawing.run(`seed-grey-${i}`, "demo-approved-grey", `demo-artist-${i + 3}`, `/demo/drawing-grey-${i}.svg`, `2026-01-0${i}T11:00:00Z`);
  }

  db.prepare(
    "INSERT INTO reports (id, cat_id, reporter_id, reason, details) VALUES ('seed-report-1', 'demo-rereview-calico', 'demo-reviewer-10', 'other', 'Needs a second look')",
  ).run();
  const addReReview = db.prepare(
    "INSERT INTO re_reviews (id, cat_id, reviewer_id, decision) VALUES (?, 'demo-rereview-calico', ?, ?)",
  );
  for (let i = 1; i <= 4; i += 1) {
    addReReview.run(`seed-rereview-${i}`, `demo-reviewer-${i}`, i <= 2 ? "keep" : "remove");
  }
}

function ensureCatMetadataColumns(db: DatabaseSync) {
  const columns = db.prepare("PRAGMA table_info(cats)").all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  const additions = [
    ["source_url", "TEXT"],
    ["source_label", "TEXT"],
    ["source_author", "TEXT"],
    ["license_name", "TEXT"],
    ["is_visible", "INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1))"],
  ];
  for (const [name, type] of additions) {
    if (!names.has(name)) db.exec(`ALTER TABLE cats ADD COLUMN ${name} ${type}`);
  }
}

function ensureDrawingModerationColumn(db: DatabaseSync) {
  const columns = db.prepare("PRAGMA table_info(drawings)").all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === "moderation_status")) {
    db.exec("ALTER TABLE drawings ADD COLUMN moderation_status TEXT NOT NULL DEFAULT 'visible' CHECK (moderation_status IN ('visible', 'under_review', 'hidden'))");
  }
}

export function getDb() {
  const globalDb = globalThis as DbGlobal;
  if (globalDb.uglyCatDb) return globalDb.uglyCatDb;

  const dataDir = process.env.UGLY_CAT_DATA_DIR || path.join(process.cwd(), "data");
  mkdirSync(path.join(dataDir, "uploads", "cats"), { recursive: true });
  mkdirSync(path.join(dataDir, "uploads", "drawings"), { recursive: true });

  const schemaPath = path.join(process.cwd(), "database", "schema.sql");
  if (!existsSync(schemaPath)) throw new Error(`Database schema not found at ${schemaPath}`);
  const db = new DatabaseSync(path.join(dataDir, "ugly-cat.sqlite"));
  db.exec(readFileSync(schemaPath, "utf8"));
  ensureCatMetadataColumns(db);
  ensureDrawingModerationColumn(db);
  seed(db);
  globalDb.uglyCatDb = db;
  return db;
}

export function dataPath(...segments: string[]) {
  const dataDir = process.env.UGLY_CAT_DATA_DIR || path.join(process.cwd(), "data");
  return path.join(/* turbopackIgnore: true */ dataDir, ...segments);
}

export function inTransaction<T>(operation: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
