-- scripts/seed.sql
-- Local-D1 seed data. Idempotent via INSERT OR IGNORE on PK uniqueness.
-- Re-runnable safely (will not duplicate rows).

-- Users (dev-user + dev-maintainer match Phase 10's dev-login fixture set)
INSERT OR IGNORE INTO users (id, github_id, github_login, name, role) VALUES
  ('01DEVUSER000000000000000001', 999001, 'dev-user',       'Dev User',       'user'),
  ('01DEVMAINT00000000000000001', 999002, 'dev-maintainer', 'Dev Maintainer', 'maintainer');

-- Labels (admin-managed taxonomy — Phase 14 manages CRUD, seeded for the Browse screen)
INSERT OR IGNORE INTO labels (id, prefix, value, color, description) VALUES
  ('01LABEL00000000000000000001', 'category',   'engineering',       '#3b82f6', 'Software engineering prompts'),
  ('01LABEL00000000000000000002', 'category',   'productivity',      '#10b981', 'Productivity and meeting prompts'),
  ('01LABEL00000000000000000003', 'model',      'gpt-4o',            '#8b5cf6', 'OpenAI GPT-4o'),
  ('01LABEL00000000000000000004', 'model',      'claude-3-5-sonnet', '#f59e0b', 'Anthropic Claude 3.5 Sonnet'),
  ('01LABEL00000000000000000005', 'difficulty', 'beginner',          '#22c55e', 'Beginner-friendly'),
  ('01LABEL00000000000000000006', 'difficulty', 'intermediate',      '#eab308', 'Intermediate'),
  ('01LABEL00000000000000000007', 'difficulty', 'advanced',          '#ef4444', 'Advanced');

-- Sample prompts (small set, enough to demo Browse + Detail locally)
INSERT OR IGNORE INTO prompts (id, author_id, title, body, category, model, difficulty, status) VALUES
  ('01PROMPT000000000000000001', '01DEVUSER000000000000000001',
   'Write a clear bug report',
   'Describe the bug, steps to reproduce, expected vs actual behavior, and environment details.',
   'engineering', 'gpt-4o', 'beginner', 'published'),
  ('01PROMPT000000000000000002', '01DEVMAINT00000000000000001',
   'Summarize a meeting transcript',
   'Extract action items, decisions, and key discussion points. Group by speaker.',
   'productivity', 'claude-3-5-sonnet', 'intermediate', 'published'),
  ('01PROMPT000000000000000003', '01DEVUSER000000000000000001',
   'Explain code like Im five',
   'Take a function and explain it in plain language a beginner could follow. Use analogies.',
   'engineering', 'claude-3-5-sonnet', 'beginner', 'published');

-- Sample tags (max 5 per prompt — verified by Phase 12 write logic)
INSERT OR IGNORE INTO prompt_tags (prompt_id, tag) VALUES
  ('01PROMPT000000000000000001', 'bug-report'),
  ('01PROMPT000000000000000001', 'communication'),
  ('01PROMPT000000000000000002', 'meetings'),
  ('01PROMPT000000000000000002', 'summarization'),
  ('01PROMPT000000000000000003', 'teaching'),
  ('01PROMPT000000000000000003', 'explanation');
