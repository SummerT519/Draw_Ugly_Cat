PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS anonymous_users (
  id TEXT PRIMARY KEY,
  nickname TEXT CHECK (nickname IS NULL OR length(nickname) BETWEEN 1 AND 24),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cats (
  id TEXT PRIMARY KEY,
  uploader_id TEXT NOT NULL REFERENCES anonymous_users(id),
  image_url TEXT NOT NULL,
  source_url TEXT,
  source_label TEXT,
  source_author TEXT,
  license_name TEXT,
  is_my_cat INTEGER NOT NULL DEFAULT 0 CHECK (is_my_cat IN (0, 1)),
  is_visible INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'under_re_review', 'removed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  cat_id TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approve', 'reject')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cat_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS drawings (
  id TEXT PRIMARY KEY,
  cat_id TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  moderation_status TEXT NOT NULL DEFAULT 'visible'
    CHECK (moderation_status IN ('visible', 'under_review', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cat_id, artist_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  cat_id TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('not_cat', 'animal_abuse', 'sexual', 'violence', 'spam', 'other')),
  details TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cat_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS re_reviews (
  id TEXT PRIMARY KEY,
  cat_id TEXT NOT NULL REFERENCES cats(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('keep', 'remove')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (cat_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS drawing_reports (
  id TEXT PRIMARY KEY,
  drawing_id TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('sexual', 'violence', 'hate', 'harassment', 'spam', 'other')),
  details TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (drawing_id, reporter_id)
);

CREATE TABLE IF NOT EXISTS drawing_reviews (
  id TEXT PRIMARY KEY,
  drawing_id TEXT NOT NULL REFERENCES drawings(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('keep', 'remove')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (drawing_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug', 'suggestion')),
  message TEXT NOT NULL CHECK (length(message) BETWEEN 5 AND 2000),
  page_url TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'resolved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cats_status_created ON cats(status, created_at);
CREATE INDEX IF NOT EXISTS idx_reviews_cat ON reviews(cat_id);
CREATE INDEX IF NOT EXISTS idx_drawings_cat ON drawings(cat_id);
CREATE INDEX IF NOT EXISTS idx_reports_cat ON reports(cat_id);
CREATE INDEX IF NOT EXISTS idx_re_reviews_cat ON re_reviews(cat_id);
CREATE INDEX IF NOT EXISTS idx_drawing_reports_drawing ON drawing_reports(drawing_id);
CREATE INDEX IF NOT EXISTS idx_drawing_reviews_drawing ON drawing_reviews(drawing_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status_created ON feedback(status, created_at);
