CREATE TABLE chat_feedback (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('up', 'down')),
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);
