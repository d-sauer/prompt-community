# Phase 9: Backend Foundation - Research

**Researched:** 2026-05-05
**Domain:** Cloudflare Workers + Hono + D1 + Drizzle ORM + wrangler local dev
**Confidence:** HIGH (stack is well-documented; all claims verified against official docs or active official guides)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Backend Stack (non-negotiable):**
- Runtime: Cloudflare Workers (Hono framework)
- Database: Cloudflare D1 (SQLite)
- ORM: Drizzle ORM
- Migrations: `drizzle-kit push` for dev, `drizzle-kit migrate` for prod
- Search (schema): D1 FTS5 virtual table defined in this phase; `/search` endpoint in Phase 11

**Worker Architecture (non-negotiable):**
- Single API worker with Hono under `src/workers/api/`
- Route modules: `routes/auth.ts`, `routes/prompts.ts`, `routes/comments.ts`, `routes/reactions.ts`, `routes/admin.ts`, `routes/users.ts`, `routes/search.ts`
- Middleware skeletons: `middleware/auth.ts`, `middleware/role.ts` (implementations in Phase 10)
- DB files: `db/schema.ts`, `db/migrations/` folder

**Full data model (all 10 tables must exist after this phase):**
users, prompts, prompt_tags, prompt_versions, comments, reactions, bookmarks, moderation_log, labels, notifications

**Schema modeling constraints:**
- Frontmatter fields normalized into columns (category, model, difficulty are real columns; body is pure markdown)
- Bookmarks are server-side (table only in this phase; endpoints in Phase 12)
- Labels is a managed table (not enums)
- Reaction emojis are the fixed set: `thumbs_up`, `heart`, `rocket`

**Local dev stack (non-negotiable):**
- Terminal 1: `npm run dev` (Vite, `localhost:5173`)
- Terminal 2: `wrangler dev` (workerd, `localhost:8787`)
- Local D1: auto-created SQLite under `.wrangler/state/v3/d1/`
- Secrets in `.dev.vars` (gitignored, loaded by wrangler)
- Vite env in `.env.local` (gitignored)

**`.dev.vars` template content (locked):**
```
ENV=dev
GITHUB_CLIENT_ID=Iv1.localdev...
GITHUB_CLIENT_SECRET=xxx
JWT_SECRET=any-random-string-for-dev
```

**`.env.example` content (locked):**
- Must include `VITE_API_URL=http://localhost:8787`
- Must NOT remove v1 vars yet (DECOM-08 is Phase 15)

**Seed script (locked):**
- Command: `npm run seed`
- Seeds: `dev-user` (regular) + `dev-maintainer` + sample prompts
- Idempotent OR documented as destructive

**Documentation output (locked):**
- Two-terminal workflow documented in `CONTRIBUTING.md`
- Must include: clone → install → `.dev.vars` → `.env.local` → `drizzle-kit push` → seed → start both → inspect DB

### Claude's Discretion

- TypeScript column types for IDs (TEXT ULID vs INTEGER autoincrement)
- Exact file split inside `src/workers/api/` beyond named files
- Whether Hono app exports default fetch or composes multiple routers
- Which existing `wrangler.toml` env/vars to reuse vs. add `[[d1_databases]]` block
- D1 binding name (PRD uses `prompt-community-db` illustratively)
- Whether API worker shares the root `wrangler.toml` or gets its own at `src/workers/api/wrangler.toml`
- Exact npm script wiring for `seed`
- Index choices beyond PKs
- Whether route modules return 501 stubs or just register the Hono skeleton with health check
- Migration file organization (one big SQL vs. drizzle-kit-generated multi-file)
- tsconfig adjustments for worker (separate `tsconfig.worker.json`)

### Deferred Ideas (OUT OF SCOPE)

- OAuth callback, JWT signing, `dev-login` endpoint (Phase 10)
- All API business logic for GET/POST/PATCH/DELETE endpoints (Phases 11, 12, 14)
- Frontend rewire from `src/lib/github/*` to `src/lib/api/*` (Phase 13)
- Production deployment, secrets, OAuth app registration (Phase 15)
- Decommissioning v1 GitHub Issues code paths (Phase 15)
- D1 FTS5 search endpoint implementation (Phase 11; schema FTS5 table is in scope for Phase 9)
- Data migration from GitHub Issues (out of scope for v2.0 — no prod users)
- R2 endpoints (R2 state directory must not break; no new R2 code)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BACK-01 | Hono API worker scaffolded under `src/workers/api/` with route modules per resource | Hono sub-app pattern with `app.route()` + Bindings type; see Architecture Patterns |
| BACK-02 | Cloudflare D1 binding configured in `wrangler.toml` for both local and production | `[[d1_databases]]` block format; local uses same binding name; see Standard Stack |
| BACK-03 | Drizzle ORM schema defined for all 10 tables | Column types, composite PKs, CHECK constraints, FTS5 via raw SQL; see Code Examples |
| BACK-04 | `drizzle-kit` migrations runnable via `drizzle-kit push` (dev) and `drizzle-kit migrate` (prod) | Two-config-file approach (local sqlite path vs. d1-http driver); see Architecture Patterns |
| BACK-05 | `npm run seed` seeds dev users and sample prompts into local D1 | `wrangler d1 execute --local --file=seed.sql` pattern; see Code Examples |
| BACK-06 | API worker runs locally via `wrangler dev` against local D1 with no cloud dependencies | `.dev.vars` + wrangler local D1 auto-creation; see Validation Architecture |
| DEV-01 | `.dev.vars` template documents `ENV`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET` | Wrangler local secrets pattern; locked content in CONTEXT.md |
| DEV-02 | `.env.example` provides `VITE_API_URL=http://localhost:8787` | Vite env file conventions; must not remove v1 vars yet |
| DEV-03 | Two-terminal dev workflow documented in `CONTRIBUTING.md` | Full step-by-step sequence documented in CONTEXT.md; see Common Pitfalls for CORS |
| DEV-05 | Local D1 inspectable via `wrangler d1 execute --local` (documented) | Command syntax: `wrangler d1 execute <name> --local --command "SELECT * FROM prompts"` |
</phase_requirements>

---

## Summary

Phase 9 introduces the Cloudflare Workers + Hono + D1 + Drizzle backend to a project that currently has two bare Workers (`oauth.ts` and `upload.ts`) in `src/workers/` with a single root `wrangler.toml` pointing at `oauth.ts`. The primary technical challenge is correctly wiring three systems together: (1) Hono's route-composition model inside a workerd runtime, (2) Drizzle's SQLite schema and drizzle-kit's two-mode migration story (local file vs. remote D1 HTTP API), and (3) wrangler's local D1 state management.

The stack is production-standard in 2026 and well-documented. The key non-obvious facts are: D1 foreign keys are ON by default (unlike vanilla SQLite where they are OFF); FTS5 virtual tables cannot be defined via Drizzle schema—they require raw SQL in a migration file; `drizzle-kit push` against local D1 requires resolving the `.wrangler/state/v3/d1/` SQLite file path (not the remote `d1-http` driver); and the existing `vitest.config.ts` uses `jsdom` environment, which is incompatible with the workerd runtime—the API worker tests need a separate vitest config pointing at `@cloudflare/vitest-pool-workers`.

**Primary recommendation:** Use a separate `src/workers/api/wrangler.toml` (not the root one) so the API worker has its own clean D1 binding, its own `compatibility_date`, and can be run with `wrangler dev --config src/workers/api/wrangler.toml`. Keep the root `wrangler.toml` pointing at `oauth.ts` as-is. Generate worker types with `wrangler types --config src/workers/api/wrangler.toml` into a `src/workers/api/worker-configuration.d.ts` file. Use TEXT (ULID) for all primary keys for global uniqueness without autoincrement collisions.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| hono | ^4.x (latest) | HTTP router + middleware framework | TypeScript-first, edge-native, works in workerd without Node polyfills |
| drizzle-orm | ^0.40+ | Type-safe SQL ORM | Edge-compatible; `drizzle-orm/d1` driver included |
| drizzle-kit | ^0.30+ | Schema migrations CLI | Generates SQL, supports `push` for local and `generate`+`migrate` for prod |
| wrangler | ^4.73.0 (already installed) | Worker runtime, D1 CLI, local dev | Already in devDependencies |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @cloudflare/vitest-pool-workers | ^0.5+ | Worker-runtime test pool for Vitest | Run API route tests inside workerd; replaces `jsdom` for worker tests |
| @hono/cors | (bundled in hono) | CORS middleware | Must configure for Vite frontend on `localhost:5173` during local dev |
| ulid | ^2.3.0 | ULID generation for TEXT PKs | If choosing ULID IDs — `import { ulid } from 'ulid'` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TEXT ULID PKs | INTEGER autoincrement | ULID = globally unique, sortable, safe for distributed; INTEGER = simpler SQL, smaller index |
| Separate `wrangler.toml` per worker | Single root `wrangler.toml` with `[[env]]` sections | Separate is cleaner isolation; single file is fewer files to maintain |
| `wrangler d1 execute --local --file=seed.sql` | `tsx scripts/seed.ts` via better-sqlite3 | `wrangler` approach needs no extra deps; `tsx` approach allows TypeScript Drizzle ORM calls but requires `better-sqlite3` which is node-only |

**Installation:**

```bash
npm install hono drizzle-orm
npm install -D drizzle-kit @cloudflare/vitest-pool-workers
# If using ULID primary keys:
npm install ulid
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/workers/api/
├── wrangler.toml            # Separate config for the API worker
├── worker-configuration.d.ts # Generated by `wrangler types`
├── index.ts                 # Hono app entry + export default
├── routes/
│   ├── auth.ts              # Stub — Phase 10 fills in OAuth+JWT
│   ├── prompts.ts           # Stub — Phase 11/12 fills in
│   ├── comments.ts          # Stub
│   ├── reactions.ts         # Stub
│   ├── users.ts             # Stub
│   ├── search.ts            # Stub — Phase 11 fills in FTS5 query
│   └── admin.ts             # Stub — Phase 14 fills in
├── middleware/
│   ├── auth.ts              # Stub — Phase 10 implements JWT verify
│   └── role.ts              # Stub — Phase 10 implements maintainer guard
└── db/
    ├── schema.ts            # Full Drizzle schema for all 10 tables
    └── migrations/          # drizzle-kit-generated SQL files OR 0001_initial.sql

# Root level
wrangler.toml                # Existing — keep pointing at oauth.ts
drizzle.config.local.ts      # drizzle-kit config for local D1 (sqlite driver → .wrangler path)
drizzle.config.ts            # drizzle-kit config for prod D1 (d1-http driver)
scripts/
└── seed.sql                 # Seed SQL executed by `wrangler d1 execute --local`
```

### Pattern 1: Hono Sub-App Composition (Route Modules)

**What:** Each resource gets its own `new Hono()` instance with typed Bindings; the main app mounts them with `app.route()`.

**When to use:** Always — this is the idiomatic Hono pattern for anything beyond a single-file demo.

**Example:**

```typescript
// src/workers/api/routes/prompts.ts
// Source: https://hono.dev/docs/guides/best-practices
import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
  // Phase 11 fills in real logic
  return c.json({ message: 'Not implemented' }, 501)
})

app.get('/:id', async (c) => {
  return c.json({ message: 'Not implemented' }, 501)
})

export default app
```

```typescript
// src/workers/api/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import prompts from './routes/prompts'
import comments from './routes/comments'
import reactions from './routes/reactions'
import auth from './routes/auth'
import users from './routes/users'
import search from './routes/search'
import admin from './routes/admin'

export type Env = {
  DB: D1Database
  ENV: string
  GITHUB_CLIENT_ID: string
  GITHUB_CLIENT_SECRET: string
  JWT_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS — allow Vite dev frontend
app.use('*', cors({
  origin: (origin) => origin, // tighten in prod via ENV check
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Health check
app.get('/health', (c) => c.json({ ok: true }))

// Route modules
app.route('/auth', auth)
app.route('/prompts', prompts)
app.route('/comments', comments)
app.route('/reactions', reactions)
app.route('/users', users)
app.route('/search', search)
app.route('/admin', admin)

export default app
```

### Pattern 2: Drizzle Schema Definition (D1/SQLite)

**What:** Use `sqliteTable` from `drizzle-orm/sqlite-core`. TEXT columns with `.$defaultFn(() => ulid())` for IDs. Composite PKs via `primaryKey({ columns: [...] })` in the table callback. Enums as `text({ enum: [...] })` for TypeScript safety + `check()` constraints for DB-level enforcement. FTS5 via raw SQL only (not in `schema.ts`).

**When to use:** Single `db/schema.ts` file defines all 10 tables. FTS5 virtual table goes in a separate `db/migrations/0001_fts5.sql` file (not managed by drizzle-kit `push`).

```typescript
// src/workers/api/db/schema.ts
// Source: https://orm.drizzle.team/docs/column-types/sqlite + https://orm.drizzle.team/docs/indexes-constraints
import {
  sqliteTable, text, integer, primaryKey, index, check
} from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { ulid } from 'ulid'

const now = () => sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const users = sqliteTable('users', {
  id:           text('id').primaryKey().$defaultFn(() => ulid()),
  github_id:    integer('github_id').notNull().unique(),
  github_login: text('github_login').notNull().unique(),
  name:         text('name'),
  avatar_url:   text('avatar_url'),
  role:         text('role', { enum: ['user', 'maintainer'] }).notNull().default('user'),
  created_at:   text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => [
  check('role_check', sql`${t.role} IN ('user', 'maintainer')`),
  index('users_github_id_idx').on(t.github_id),
])

export const prompts = sqliteTable('prompts', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  author_id:  text('author_id').notNull().references(() => users.id),
  title:      text('title').notNull(),
  body:       text('body').notNull(),
  category:   text('category'),
  model:      text('model'),
  difficulty: text('difficulty'),
  status:     text('status', { enum: ['published', 'flagged', 'hidden', 'draft'] }).notNull().default('draft'),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updated_at: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => [
  check('status_check', sql`${t.status} IN ('published', 'flagged', 'hidden', 'draft')`),
  index('prompts_author_id_idx').on(t.author_id),
  index('prompts_status_idx').on(t.status),
  index('prompts_created_at_idx').on(t.created_at),
])

export const prompt_tags = sqliteTable('prompt_tags', {
  prompt_id: text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  tag:       text('tag').notNull(),
}, (t) => [
  primaryKey({ columns: [t.prompt_id, t.tag] }),
])

export const prompt_versions = sqliteTable('prompt_versions', {
  id:             text('id').primaryKey().$defaultFn(() => ulid()),
  prompt_id:      text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  version_number: integer('version_number').notNull(),
  body:           text('body').notNull(),
  changelog:      text('changelog'),
  author_id:      text('author_id').notNull().references(() => users.id),
  created_at:     text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => [
  index('prompt_versions_prompt_id_idx').on(t.prompt_id),
])

export const comments = sqliteTable('comments', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  author_id:  text('author_id').notNull().references(() => users.id),
  body:       text('body').notNull(),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  deleted_at: text('deleted_at'),
}, (t) => [
  index('comments_prompt_id_idx').on(t.prompt_id),
])

export const reactions = sqliteTable('reactions', {
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  emoji:      text('emoji', { enum: ['thumbs_up', 'heart', 'rocket'] }).notNull(),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => [
  primaryKey({ columns: [t.prompt_id, t.user_id, t.emoji] }),
  check('emoji_check', sql`${t.emoji} IN ('thumbs_up', 'heart', 'rocket')`),
])

export const bookmarks = sqliteTable('bookmarks', {
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => [
  primaryKey({ columns: [t.user_id, t.prompt_id] }),
])

export const moderation_log = sqliteTable('moderation_log', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  prompt_id:  text('prompt_id').notNull().references(() => prompts.id),
  actor_id:   text('actor_id').notNull().references(() => users.id),
  action:     text('action').notNull(),
  reason:     text('reason'),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const labels = sqliteTable('labels', {
  id:          text('id').primaryKey().$defaultFn(() => ulid()),
  prefix:      text('prefix').notNull(),
  value:       text('value').notNull(),
  color:       text('color'),
  description: text('description'),
}, (t) => [
  index('labels_prefix_idx').on(t.prefix),
])

export const notifications = sqliteTable('notifications', {
  id:         text('id').primaryKey().$defaultFn(() => ulid()),
  user_id:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:       text('type').notNull(),
  prompt_id:  text('prompt_id').references(() => prompts.id),
  comment_id: text('comment_id').references(() => comments.id),
  read_at:    text('read_at'),
  created_at: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => [
  index('notifications_user_id_idx').on(t.user_id),
])
```

### Pattern 3: drizzle-kit Configuration (Two Config Files)

**What:** Use two drizzle config files — one for local development (plain SQLite path) and one for remote D1 (d1-http driver). The local file path must be resolved from wrangler's state directory after it creates it.

**When to use:** `drizzle.config.local.ts` for `drizzle-kit push --config drizzle.config.local.ts` during local dev. `drizzle.config.ts` (d1-http) for prod migrations via CI or operator.

```typescript
// drizzle.config.local.ts — for local D1
// Source: https://orm.drizzle.team/docs/drizzle-kit-push
// The SQLite file is in .wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite
// Bootstrap it first: wrangler d1 execute <db-name> --local --command "SELECT 1"
// Then find: find .wrangler/state/v3/d1 -name "*.sqlite" | head -1
import { defineConfig } from 'drizzle-kit'
import { execSync } from 'child_process'
import { readdirSync } from 'fs'
import path from 'path'

function findLocalD1() {
  const d1Dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  const files = readdirSync(d1Dir).filter(f => f.endsWith('.sqlite'))
  if (!files.length) throw new Error('No local D1 SQLite found. Run: wrangler d1 execute <name> --local --command "SELECT 1"')
  return path.join(d1Dir, files[0])
}

export default defineConfig({
  out: './src/workers/api/db/migrations',
  schema: './src/workers/api/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url: findLocalD1() },
})
```

```typescript
// drizzle.config.ts — for remote D1 (production / CI)
// Source: https://orm.drizzle.team/docs/guides/d1-http-with-drizzle-kit
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './src/workers/api/db/migrations',
  schema: './src/workers/api/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId:  process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
    token:      process.env.CLOUDFLARE_D1_TOKEN!,
  },
})
```

### Pattern 4: wrangler.toml — D1 Binding for API Worker

**What:** A separate `src/workers/api/wrangler.toml` keeps the API worker isolated from the existing root `wrangler.toml` (which points at `oauth.ts`).

```toml
# src/workers/api/wrangler.toml
name = "prompt-community-api"
main = "index.ts"
compatibility_date = "2025-01-01"

[vars]
ENV = "dev"
APP_ORIGIN = "http://localhost:5173"

[[d1_databases]]
binding = "DB"
database_name = "prompt-community-db"
database_id = "local"          # any non-empty string for local-only dev
migrations_dir = "db/migrations"
```

Run the API worker with:

```bash
wrangler dev --config src/workers/api/wrangler.toml
```

Generate binding types:

```bash
wrangler types --config src/workers/api/wrangler.toml --output src/workers/api/worker-configuration.d.ts
```

### Pattern 5: Seed Script (SQL File via wrangler)

**What:** A plain SQL seed file executed by `wrangler d1 execute --local`. Simplest approach — no extra dependencies, idempotent via `INSERT OR IGNORE`.

```sql
-- scripts/seed.sql
-- Idempotent: INSERT OR IGNORE uses the PK uniqueness constraint
INSERT OR IGNORE INTO users (id, github_id, github_login, name, role)
VALUES
  ('01DEVUSER000000000000000001', 999001, 'dev-user',       'Dev User',       'user'),
  ('01DEVMAINT00000000000000001', 999002, 'dev-maintainer',  'Dev Maintainer', 'maintainer');

INSERT OR IGNORE INTO prompts (id, author_id, title, body, category, model, status)
VALUES
  ('01PROMPT000000000000000001', '01DEVUSER000000000000000001',
   'Write a clear bug report', 'Describe the bug, steps to reproduce, and expected vs actual behavior.',
   'engineering', 'gpt-4o', 'published'),
  ('01PROMPT000000000000000002', '01DEVMAINT00000000000000001',
   'Summarize a meeting transcript', 'Extract action items, decisions, and key discussion points.',
   'productivity', 'claude-3-5-sonnet', 'published');

INSERT OR IGNORE INTO labels (id, prefix, value, color)
VALUES
  ('01LABEL00000000000000000001', 'category', 'engineering',  '#3b82f6'),
  ('01LABEL00000000000000000002', 'category', 'productivity', '#10b981'),
  ('01LABEL00000000000000000003', 'model',    'gpt-4o',       '#8b5cf6'),
  ('01LABEL00000000000000000004', 'model',    'claude-3-5-sonnet', '#f59e0b'),
  ('01LABEL00000000000000000005', 'difficulty', 'beginner',   '#22c55e');
```

**package.json script:**

```json
{
  "scripts": {
    "seed": "wrangler d1 execute prompt-community-db --local --file=scripts/seed.sql --config src/workers/api/wrangler.toml"
  }
}
```

### Anti-Patterns to Avoid

- **Defining FTS5 as a `sqliteTable`:** Drizzle-kit `push` will attempt to `ALTER` a virtual table and break it. FTS5 must be raw SQL in a migration file that drizzle-kit never touches.
- **Running `drizzle-kit push` before bootstrapping local D1:** The `.wrangler/state/v3/d1/` path doesn't exist until wrangler has touched the D1 binding at least once. Always run `wrangler d1 execute <name> --local --command "SELECT 1"` first.
- **Using Node-only APIs in the worker:** The workerd runtime does not support `child_process`, `fs`, `path`, or most of Node even with `nodejs_compat`. The schema file is compiled into the worker bundle — keep it pure (no dynamic file reads at worker runtime).
- **Single `wrangler.toml` with `main` pointing at the API worker:** This would break the existing `oauth.ts` worker. Keep separate configs.
- **Using `environment` global in Hono middleware vs. `c.env`:** In Cloudflare Workers, env bindings are passed per-request via `c.env`, not via process.env.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP routing | Custom router | Hono `app.route()` | Edge-optimized, type-safe, handles method/path matching, middleware chain |
| SQL schema migrations | Manual `CREATE TABLE` scripts | drizzle-kit generate + wrangler d1 migrate | Tracks applied migrations, handles diffs, idempotent |
| D1 type safety | Raw `env.DB.prepare()` strings | `drizzle(env.DB).select().from(table)` | Type inference from schema, prevents typo bugs |
| Enum enforcement | Application-level if/else | `text({ enum: [...] })` + `check()` in schema | TypeScript type safety + DB-level constraint |
| Composite PK enforcement | Application-level duplicate check | `primaryKey({ columns: [...] })` in schema | DB-level enforcement, correct index behavior |
| CORS headers | Manually set `Access-Control-*` | `hono/cors` middleware | Handles preflight OPTIONS, all headers, credential mode correctly |
| Worker type definitions | Manually write D1Database types | `wrangler types` command | Always accurate for your `compatibility_date` + bindings |
| Test environment for workers | jsdom workaround | `@cloudflare/vitest-pool-workers` | Tests run inside actual workerd; D1 bindings work correctly |

**Key insight:** The Drizzle + wrangler CLI combo is designed to handle the full migration lifecycle. Any custom solution will miss edge cases around migration ordering, foreign key constraint timing, and transaction rollback on failure.

---

## Common Pitfalls

### Pitfall 1: FTS5 + Drizzle Schema Push Conflict

**What goes wrong:** Defining the FTS5 virtual table in `schema.ts` causes `drizzle-kit push` to attempt to introspect/alter it, breaking the virtual table definition.

**Why it happens:** Drizzle-kit does not have a `virtualTable` abstraction. It treats any table in schema.ts as a regular SQLite table.

**How to avoid:** Create the FTS5 virtual table in a raw SQL migration file that is applied via `wrangler d1 execute --local --file=` or via `wrangler d1 migrations apply --local` after drizzle-kit push. Do NOT put it in `schema.ts`.

```sql
-- src/workers/api/db/migrations/0002_fts5.sql
CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
  title, body, tags,
  content='prompts',
  content_rowid='rowid'
);
```

**Warning signs:** `drizzle-kit push` succeeds but `SELECT * FROM prompts_fts` errors with "no such table" or "not a table".

### Pitfall 2: D1 Foreign Keys ARE Enabled by Default

**What goes wrong:** Seed data inserted in dependency order fails if child rows reference parent rows that don't exist yet. Or migrations that reorder tables fail with `FOREIGN KEY constraint failed`.

**Why it happens:** Unlike vanilla SQLite (where `PRAGMA foreign_keys` defaults OFF), Cloudflare D1 enforces foreign keys by default for all queries. Source: https://developers.cloudflare.com/d1/sql-api/foreign-keys/

**How to avoid:** Always insert seed data in dependency order: `users` → `labels` → `prompts` → `prompt_tags` → `prompt_versions` → `comments` → `reactions` → `bookmarks` → `moderation_log` → `notifications`. You can also use `PRAGMA defer_foreign_keys = on` at the start of a transaction to temporarily defer constraint checking.

**Warning signs:** `wrangler d1 execute --local --file=seed.sql` exits with `FOREIGN KEY constraint failed`.

### Pitfall 3: Local D1 Path Doesn't Exist Until Wrangler First Touches It

**What goes wrong:** Running `drizzle-kit push --config drizzle.config.local.ts` before wrangler has ever created the local D1 file fails with a "file not found" error.

**Why it happens:** Wrangler creates `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` lazily — only when the worker first accesses the D1 binding.

**How to avoid:** Bootstrap the local DB first with:
```bash
wrangler d1 execute prompt-community-db --local --command "SELECT 1" --config src/workers/api/wrangler.toml
```
Then run `drizzle-kit push`. Document this in `CONTRIBUTING.md` as a one-time setup step.

**Warning signs:** `Error: ENOENT: no such file or directory` when running drizzle-kit push locally.

### Pitfall 4: vitest.config.ts Uses jsdom — Incompatible with Worker Tests

**What goes wrong:** Importing and testing the Hono API worker entry file via the existing `vitest.config.ts` fails with errors about `D1Database` not being defined, or `Response` being undefined.

**Why it happens:** The existing `vitest.config.ts` uses `environment: 'jsdom'` which simulates a browser DOM. The workerd runtime APIs (`D1Database`, `ExecutionContext`, etc.) are not available in jsdom.

**How to avoid:** Create a **separate** vitest config for worker tests:

```typescript
// vitest.workers.config.ts
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './src/workers/api/wrangler.toml' },
    }),
  ],
  test: {
    include: ['src/workers/**/*.spec.ts'],
  },
})
```

Run with: `vitest run --config vitest.workers.config.ts`

**Note:** The existing `oauth.spec.ts` already runs cleanly in the `jsdom` environment because it uses `vi.spyOn(globalThis, 'fetch')` and plain `Request`/`Response`. Migrating it to `vitest-pool-workers` is optional.

### Pitfall 5: CORS Not Configured for the Two-Terminal Dev Workflow

**What goes wrong:** Vite frontend on `localhost:5173` makes fetch calls to `localhost:8787` and gets CORS blocked. The browser shows `No 'Access-Control-Allow-Origin' header`.

**Why it happens:** Wrangler dev doesn't add CORS headers by default. The two origins are different (port difference = different origin).

**How to avoid:** Add `hono/cors` middleware to the Hono app in `index.ts`. Configure `credentials: true` to support the `HttpOnly` cookie that Phase 10 will set.

```typescript
app.use('*', cors({
  origin: (origin) => origin,  // echo back for dev; tighten in prod
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))
```

### Pitfall 6: `drizzle()` Must Be Called Per-Request (Not at Module Level)

**What goes wrong:** Instantiating `drizzle(env.DB)` at the module level causes "Cannot read properties of undefined" because `env` is not available at module initialization time in workerd — it's only available in the `fetch` handler.

**Why it happens:** Workers modules initialize once and handle many requests. `env` is a per-request object injected by the runtime.

**How to avoid:** Always call `const db = drizzle(c.env.DB)` inside the route handler, not at the top of the module.

### Pitfall 7: `compatibility_date` Must Be Recent Enough for D1

**What goes wrong:** D1 bindings fail at runtime or generate unexpected behavior with older `compatibility_date` values.

**How to avoid:** Use `compatibility_date = "2025-01-01"` or later in the API worker's `wrangler.toml`. The existing root `wrangler.toml` uses `2024-01-01` which is fine for the oauth worker, but the API worker should use a current date.

---

## Code Examples

Verified patterns from official sources:

### Drizzle Initialization in a Route Handler

```typescript
// Source: https://orm.drizzle.team/docs/connect-cloudflare-d1
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'

app.get('/prompts', async (c) => {
  const db = drizzle(c.env.DB, { schema })
  const rows = await db.select().from(schema.prompts).all()
  return c.json(rows)
})
```

### D1 Binding in wrangler.toml (TOML format)

```toml
# Source: https://developers.cloudflare.com/workers/wrangler/configuration/
[[d1_databases]]
binding = "DB"
database_name = "prompt-community-db"
database_id = "local"
migrations_dir = "db/migrations"
```

### Wrangler Type Generation

```bash
# Source: https://developers.cloudflare.com/workers/languages/typescript/
wrangler types --config src/workers/api/wrangler.toml \
  --output src/workers/api/worker-configuration.d.ts
```

This generates `interface Env { DB: D1Database; ENV: string; ... }` based on `wrangler.toml` bindings and `[vars]`.

### Composite Primary Key (Drizzle)

```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const reactions = sqliteTable('reactions', {
  prompt_id: text('prompt_id').notNull(),
  user_id:   text('user_id').notNull(),
  emoji:     text('emoji').notNull(),
}, (t) => [
  primaryKey({ columns: [t.prompt_id, t.user_id, t.emoji] }),
])
```

### Check Constraint (Drizzle/SQLite)

```typescript
// Source: https://orm.drizzle.team/docs/indexes-constraints
import { check, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  role: text('role').notNull().default('user'),
}, (t) => [
  check('role_check', sql`${t.role} IN ('user', 'maintainer')`),
])
```

### FTS5 Virtual Table (Raw SQL — NOT in schema.ts)

```sql
-- Source: SQLite FTS5 documentation (https://www.sqlite.org/fts5.html)
-- This goes in a migration file, NOT in schema.ts
CREATE VIRTUAL TABLE IF NOT EXISTS prompts_fts USING fts5(
  title,
  body,
  content='prompts',
  content_rowid='rowid'
);

-- Populate FTS index from existing data
INSERT INTO prompts_fts(rowid, title, body)
  SELECT rowid, title, body FROM prompts;
```

### API Worker Test with vitest-pool-workers

```typescript
// Source: https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/
import { env } from 'cloudflare:workers'
import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import app from '../index'

describe('API worker', () => {
  it('GET /health returns 200', async () => {
    const req = new Request('http://localhost/health')
    const ctx = createExecutionContext()
    const res = await app.fetch(req, env, ctx)
    await waitOnExecutionContext(ctx)
    expect(res.status).toBe(200)
  })
})
```

### Hono App Testing (No D1 — Mock Env)

```typescript
// Source: https://hono.dev/docs/guides/testing
// Fast unit tests that don't need workerd — mock env
import { describe, it, expect } from 'vitest'
import app from '../index'

const MOCK_ENV = {
  DB: {} as D1Database,  // mock — don't call DB methods
  ENV: 'dev',
  JWT_SECRET: 'test-secret',
}

describe('health check', () => {
  it('returns ok', async () => {
    const res = await app.request('/health', {}, MOCK_ENV)
    expect(res.status).toBe(200)
  })
})
```

### Bootstrap Local D1 (One-Time Setup)

```bash
# Source: pattern from https://fineshopdesign.com/2026/03/drizzle-kit-cloudflare-d1-local.html
# Creates the .wrangler/state/v3/d1/ SQLite file
wrangler d1 execute prompt-community-db --local --command "SELECT 1" \
  --config src/workers/api/wrangler.toml

# Apply schema via drizzle-kit push
npx drizzle-kit push --config drizzle.config.local.ts

# Apply FTS5 migration separately (outside drizzle-kit)
wrangler d1 execute prompt-community-db --local \
  --file src/workers/api/db/migrations/0002_fts5.sql \
  --config src/workers/api/wrangler.toml

# Seed data
npm run seed
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@cloudflare/workers-types` in tsconfig | `wrangler types` generated file | ~2024 | Types always match your exact `compatibility_date` and bindings |
| Single `wrangler.toml` for all workers | Separate `wrangler.toml` per worker | ~2023 (best practice) | Cleaner isolation; each worker can have its own compat date and bindings |
| Manual raw `env.DB.prepare().bind().all()` | `drizzle-orm/d1` typed queries | 2023+ | Type safety, composable queries, schema-driven inference |
| `drizzle-kit migrate` for all envs | `push` for local, `generate`+`wrangler d1 migrations apply` for prod | 2024+ | Aligns with CF's own migration tracking table |
| `wrangler.jsonc` as new default | Both `.toml` and `.jsonc` work | 2024 | Existing projects keep `.toml` fine |

**Deprecated/outdated:**

- `node_compat = true` in wrangler.toml: Use `compatibility_flags = ["nodejs_compat"]` or `["nodejs_compat_v2"]` instead for newer runtimes.
- `@cloudflare/workers-types` package: Generate types with `wrangler types` instead.
- `app.fire()` pattern in older Hono docs: Use `export default app` (Hono 4.x).

---

## Open Questions

1. **`database_id` for local-only dev**
   - What we know: The `database_id` field is required in `wrangler.toml` but only used for remote D1 connections; local dev uses it to namespace the SQLite file under `.wrangler/state/v3/d1/`.
   - What's unclear: Whether a placeholder `"local"` or `"00000000-0000-0000-0000-000000000000"` is more appropriate when you don't have a real D1 ID yet. Some projects use any string; others create a real D1 first with `wrangler d1 create`.
   - Recommendation: Create the D1 database with `wrangler d1 create prompt-community-db` to get a real UUID, then put it in `wrangler.toml`. This is a one-time setup and the DB is free. Then the `database_id` works for both local and eventual production.

2. **drizzle.config.local.ts SQLite path resolution**
   - What we know: The hash in `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/<hash>.sqlite` is derived from the `database_id`. The `@deox/drizzle-d1-utils` package resolves this automatically by reading wrangler config.
   - What's unclear: Whether to use `@deox/drizzle-d1-utils` (adds a dependency) or write a small glob helper inline.
   - Recommendation: Implement the `findLocalD1()` helper shown above (no extra dependency). If it becomes fragile, add `@deox/drizzle-d1-utils` then.

3. **Existing `oauth.spec.ts` test file uses plain vitest jsdom**
   - What we know: `oauth.spec.ts` runs with the existing `vitest.config.ts` (jsdom mode) and passes. The new API worker tests need `vitest-pool-workers`.
   - What's unclear: Whether to migrate all worker tests to `vitest-pool-workers` or keep `oauth.spec.ts` in jsdom.
   - Recommendation: Keep `oauth.spec.ts` in jsdom (it works and exercises the right behavior). Add a new `vitest.workers.config.ts` that picks up `src/workers/api/**/*.spec.ts`. The two configs coexist: `test` script runs jsdom tests, `test:workers` runs workerd tests.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is mandatory.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed) + @cloudflare/vitest-pool-workers (new) |
| Config file for frontend/existing tests | `vitest.config.ts` (existing) |
| Config file for API worker tests | `vitest.workers.config.ts` (new — Wave 0 gap) |
| Quick run (jsdom/existing) | `npm test` |
| Quick run (API worker) | `npx vitest run --config vitest.workers.config.ts` |
| Full suite | `npm test && npx vitest run --config vitest.workers.config.ts` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BACK-01 | Hono worker boots; all route paths return a response (even 501) | Integration (workerd) | `npx vitest run --config vitest.workers.config.ts src/workers/api/index.spec.ts` | ❌ Wave 0 |
| BACK-01 | Each route module file exists and exports a Hono app | Static (TypeScript compile) | `npx vue-tsc -b --noEmit` | ❌ (tsc check) |
| BACK-02 | D1 binding `DB` is accessible in route handler via `c.env.DB` | Integration (workerd) | Covered by BACK-01 worker boot test | ❌ Wave 0 |
| BACK-03 | Schema compiles without TypeScript errors | Static | `npx vue-tsc -b --noEmit` | ❌ |
| BACK-04 | `drizzle-kit push` applies schema to local D1 with no errors | Manual / shell script | `npx drizzle-kit push --config drizzle.config.local.ts 2>&1; exit $?` | ❌ (shell) |
| BACK-04 | All 10 tables exist after migration | Integration (shell) | `wrangler d1 execute prompt-community-db --local --command "SELECT name FROM sqlite_master WHERE type='table'" --config src/workers/api/wrangler.toml` | ❌ (shell) |
| BACK-05 | Seed runs without error; rows present in users and prompts | Integration (shell) | `npm run seed && wrangler d1 execute prompt-community-db --local --command "SELECT COUNT(*) FROM prompts" --config src/workers/api/wrangler.toml` | ❌ |
| BACK-06 | Worker starts on localhost:8787 with no cloud calls | Manual (start + curl) | `curl -s http://localhost:8787/health \| grep ok` | ❌ (manual) |
| DEV-01 | `.dev.vars.example` documents all 4 required vars | Static (file inspection) | `grep -q JWT_SECRET .dev.vars.example && grep -q ENV .dev.vars.example` | ❌ Wave 0 |
| DEV-02 | `.env.example` includes `VITE_API_URL` | Static (file inspection) | `grep -q VITE_API_URL .env.example` | ❌ Wave 0 |
| DEV-03 | `CONTRIBUTING.md` contains two-terminal workflow docs | Static (file inspection) | `grep -q "wrangler dev" CONTRIBUTING.md` | ❌ Wave 0 |
| DEV-05 | `wrangler d1 execute --local` returns seeded rows | Integration (shell) | See BACK-05 command above | ❌ |

### Sampling Rate

- **Per task commit:** `npm test` (existing suite stays green; no regressions)
- **Per task commit (API work):** `npx vitest run --config vitest.workers.config.ts`
- **Per wave merge:** Full suite: `npm test && npx vitest run --config vitest.workers.config.ts`
- **Phase gate:** All Success Criteria below checked before `/gsd:verify-work`

### Phase Gate Checklist (Success Criteria → Verification Commands)

| Success Criterion | Verification |
|------------------|-------------|
| SC-1: `wrangler dev` starts API on `localhost:8787` with all routes registered, no cloud calls | `curl http://localhost:8787/health` returns `{"ok":true}`; `curl http://localhost:8787/prompts` returns 501 |
| SC-2: `drizzle-kit push` applies full schema with no errors | `npx drizzle-kit push --config drizzle.config.local.ts` exits 0; all 10 table names appear in `sqlite_master` |
| SC-3: `npm run seed` populates DB queryable via `wrangler d1 execute` | `wrangler d1 execute prompt-community-db --local --command "SELECT * FROM prompts" --config src/workers/api/wrangler.toml` returns rows |
| SC-4: `.dev.vars` template + `.env.example` present and complete | Both files exist and contain required vars |
| SC-5: Two-terminal workflow documented; fresh dev can complete setup | `CONTRIBUTING.md` contains the full setup sequence; manual follow-along test |

### Wave 0 Gaps

- [ ] `vitest.workers.config.ts` — Vitest pool workers config for `src/workers/api/**/*.spec.ts`
- [ ] `src/workers/api/index.spec.ts` — Boot test: health check + 501 stubs for all routes (REQ BACK-01, BACK-02, BACK-06)
- [ ] `.dev.vars.example` — Template file (committed, gitignored actual `.dev.vars`) covers DEV-01
- [ ] Install `@cloudflare/vitest-pool-workers`: `npm install -D @cloudflare/vitest-pool-workers`
- [ ] Create `wrangler d1 create prompt-community-db` to get a real `database_id` UUID before filling in `wrangler.toml`

---

## Sources

### Primary (HIGH confidence)

- [Drizzle ORM — Cloudflare D1 Connect](https://orm.drizzle.team/docs/connect-cloudflare-d1) — drizzle() initialization, D1 driver
- [Drizzle ORM — Get Started D1 (new)](https://orm.drizzle.team/docs/get-started/d1-new) — wrangler.toml block, push workflow
- [Drizzle ORM — SQLite Column Types](https://orm.drizzle.team/docs/column-types/sqlite) — text(), integer(), enum syntax, $defaultFn
- [Drizzle ORM — Indexes & Constraints](https://orm.drizzle.team/docs/indexes-constraints) — composite PK, check(), index() APIs
- [Drizzle ORM — drizzle-kit push](https://orm.drizzle.team/docs/drizzle-kit-push) — how push works, local sqlite vs d1-http
- [Cloudflare D1 — Foreign Keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/) — FK enforcement behavior in D1
- [Cloudflare D1 — Migrations](https://developers.cloudflare.com/d1/reference/migrations/) — `wrangler d1 migrations apply` workflow
- [Cloudflare Workers — TypeScript](https://developers.cloudflare.com/workers/languages/typescript/) — `wrangler types` command, tsconfig.json setup
- [Cloudflare Workers — Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) — [[d1_databases]] format, preview_database_id
- [Cloudflare Workers — Vitest Integration (write first test)](https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/) — @cloudflare/vitest-pool-workers setup, env from cloudflare:workers
- [Hono — Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers) — Bindings type pattern, .dev.vars, export default
- [Hono — Best Practices](https://hono.dev/docs/guides/best-practices) — app.route() sub-app composition
- [Hono — Testing](https://hono.dev/docs/guides/testing) — app.request() test pattern, mock env

### Secondary (MEDIUM confidence)

- [firdausng.com — Setting up D1 with Drizzle in Hono](https://firdausng.com/posts/setup-d1-cloudflare-worker-with-drizzle) — Verified wrangler.jsonc format; matches official docs
- [thisdot.co — D1 migrations and seeds](https://www.thisdot.co/blog/d1-sqlite-schema-migrations-and-seeds) — `wrangler d1 execute --local --file=` pattern; matches official CLI docs
- [fineshopdesign.com — drizzle-kit with local D1](https://fineshopdesign.com/2026/03/drizzle-kit-cloudflare-d1-local.html) — bootstrap command for local D1 file; published March 2026

### Tertiary (LOW confidence — flag for validation)

- Community pattern: `findLocalD1()` helper that globs `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite` — working approach per multiple GitHub discussions but not in official docs. Use `@deox/drizzle-d1-utils` as alternative.
- FTS5 raw SQL migration approach — confirmed by multiple sources (astro-db-fts, Drizzle GitHub issues) as the only working pattern, but Drizzle team has not officially documented the workaround.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all four core libraries are official Cloudflare/Drizzle stack, well-documented
- Architecture: HIGH — Hono sub-app pattern and D1 binding format verified from official docs
- Schema patterns: HIGH — column types, composite PKs, check() verified from Drizzle docs
- FTS5 workaround: MEDIUM — multiple community sources confirm, but no official Drizzle doc
- Local D1 path resolution: MEDIUM — behavior confirmed, exact path pattern from community sources
- Pitfalls: HIGH — FK behavior from official CF docs; all others from verified sources

**Research date:** 2026-05-05
**Valid until:** 2026-08-05 (stable stack; check Drizzle and wrangler changelogs if researching after this date)
