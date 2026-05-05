-- src/workers/api/db/migrations/0002_fts5.sql
-- FTS5 virtual table over prompts. Maintained outside drizzle-kit because
-- drizzle-kit cannot introspect/alter virtual tables (Phase 9 / 09-RESEARCH.md Pitfall 1).
-- Phase 11 will use `SELECT ... FROM prompts_fts WHERE prompts_fts MATCH ?`.

CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
  title,
  body,
  content='prompts',
  content_rowid='rowid'
);

-- Backfill from any existing rows (idempotent: INSERT OR IGNORE on rowid PK).
INSERT OR IGNORE INTO prompts_fts(rowid, title, body)
  SELECT rowid, title, body FROM prompts;

-- Triggers to keep FTS index in sync with prompts mutations.
-- Drop-and-recreate is the safe pattern for re-running this migration.
DROP TRIGGER IF EXISTS prompts_ai;
CREATE TRIGGER prompts_ai AFTER INSERT ON prompts BEGIN
  INSERT INTO prompts_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;

DROP TRIGGER IF EXISTS prompts_ad;
CREATE TRIGGER prompts_ad AFTER DELETE ON prompts BEGIN
  INSERT INTO prompts_fts(prompts_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
END;

DROP TRIGGER IF EXISTS prompts_au;
CREATE TRIGGER prompts_au AFTER UPDATE ON prompts BEGIN
  INSERT INTO prompts_fts(prompts_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
  INSERT INTO prompts_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
