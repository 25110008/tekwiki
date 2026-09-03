CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  requires_approval INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL CHECK (role IN ('member', 'admin')),
  created_at TEXT NOT NULL
);

CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id),
  parent_id TEXT REFERENCES pages(id),
  title TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  is_private INTEGER NOT NULL DEFAULT 0,
  body TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_pages_category ON pages(category_id);
CREATE INDEX idx_pages_parent ON pages(parent_id);

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id),
  file_name TEXT NOT NULL,
  kv_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  uploaded_at TEXT NOT NULL
);
CREATE INDEX idx_attachments_page ON attachments(page_id);

CREATE TABLE history (
  id TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id),
  edited_by TEXT NOT NULL,
  edited_at TEXT NOT NULL,
  summary TEXT NOT NULL,
  body_snapshot TEXT NOT NULL
);
CREATE INDEX idx_history_page ON history(page_id);

CREATE TABLE approvals (
  id TEXT PRIMARY KEY,
  page_id TEXT,
  title TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  author TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  new_data_json TEXT NOT NULL
);

CREATE TABLE glossary (
  term TEXT PRIMARY KEY,
  page_id TEXT NOT NULL REFERENCES pages(id)
);

CREATE TABLE faq (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  page_id TEXT REFERENCES pages(id),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE guidelines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE templates (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  hint TEXT NOT NULL,
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL
);

CREATE TABLE inquiries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE page_embeddings (
  page_id TEXT PRIMARY KEY REFERENCES pages(id),
  vector_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
