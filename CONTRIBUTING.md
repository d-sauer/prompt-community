# Contributing to prompt-community

## Local development setup

The v2 stack runs end-to-end on a single machine with no cloud dependency
(except the GitHub OAuth handshake itself, which is bypassed in dev via the
forthcoming `/auth/dev-login` endpoint — see Phase 10).

### Prerequisites

- Node.js 20+ and npm
- Wrangler (installed as a project devDependency — invoked via `npx wrangler` or `npm run` scripts)

### One-time setup

1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd prompt-community
   npm install
   ```

2. Copy the env templates (both files are gitignored once filled in):
   ```bash
   cp .dev.vars.example .dev.vars     # for the API worker (wrangler)
   cp .env.example .env.local         # for the Vite frontend
   ```
   Fill in real values for `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `JWT_SECRET` in `.dev.vars`.
   `.env.local` defaults are fine for local dev.

3. Create the local D1 database (one time only):
   ```bash
   npx wrangler d1 create prompt-community-db
   ```
   Copy the `database_id` UUID it prints into `src/workers/api/wrangler.toml`
   (replace the `database_id = "local"` placeholder).

   If you are offline and cannot run `wrangler d1 create`, the placeholder
   `"local"` works for local-only dev — you can revisit this step before
   deploying.

4. Bootstrap, migrate, and seed local D1:
   ```bash
   npm run db:setup     # bootstraps the local SQLite + applies schema + creates FTS5 table
   npm run seed         # populates dev-user, dev-maintainer, and sample prompts
   ```

   `db:setup` is a composite of three commands you can run individually if
   something fails: `db:bootstrap`, `db:push`, `db:fts5`. Re-running `seed`
   is safe (idempotent via `INSERT OR IGNORE`).

### GitHub OAuth Setup (DEV-04)

The GitHub OAuth login flow requires two separate GitHub OAuth Apps — one for local development and one for production. This is because each OAuth App has a fixed callback URL.

**Register GitHub OAuth Apps:**

Go to: GitHub Settings → Developer Settings → OAuth Apps → New OAuth App

**Dev app (for local development):**
- Application name: `prompt-community-dev` (or similar)
- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:8787/auth/callback`

After creating the dev app, copy the Client ID and generate a Client Secret.

**Prod app (for production deployment):**
- Application name: `prompt-community`
- Homepage URL: `https://YOUR_WORKER.workers.dev`
- Authorization callback URL: `https://YOUR_WORKER.workers.dev/auth/callback`

**Switching between dev and prod:**

Local dev — set in `.dev.vars` (gitignored):
```
GITHUB_CLIENT_ID=<dev-app-client-id>
GITHUB_CLIENT_SECRET=<dev-app-client-secret>
JWT_SECRET=<any-random-secret-for-local>
```

Production — set via wrangler secrets:
```bash
wrangler secret put GITHUB_CLIENT_ID --config src/workers/api/wrangler.toml
wrangler secret put GITHUB_CLIENT_SECRET --config src/workers/api/wrangler.toml
wrangler secret put JWT_SECRET --config src/workers/api/wrangler.toml
```

There is no code change needed to switch environments — the correct `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are selected automatically by which values are present in `.dev.vars` vs wrangler secrets.

### Two-terminal dev workflow

Run these in two separate terminals from the project root:

**Terminal 1 — Vite frontend (`http://localhost:5173`):**
```bash
npm run dev
```

**Terminal 2 — Hono API worker (`http://localhost:8787`):**
```bash
npx wrangler dev --config src/workers/api/wrangler.toml
```

Both servers must be running for the SPA to talk to the API.

### Inspecting the local D1 database

The local SQLite file lives under `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`
(relative to `src/workers/api/`).
Inspect it via `wrangler d1 execute --local`:

```bash
# List all tables
npx wrangler d1 execute prompt-community-db --local \
  --command "SELECT name FROM sqlite_master WHERE type='table'" \
  --config src/workers/api/wrangler.toml

# See seeded prompts
npx wrangler d1 execute prompt-community-db --local \
  --command "SELECT id, title, status FROM prompts" \
  --config src/workers/api/wrangler.toml

# FTS5 search test
npx wrangler d1 execute prompt-community-db --local \
  --command "SELECT title FROM prompts_fts WHERE prompts_fts MATCH 'bug'" \
  --config src/workers/api/wrangler.toml
```

Resetting local D1: delete the `src/workers/api/.wrangler/state/v3/d1/` directory and re-run
`npm run db:setup && npm run seed`.

## Tests

- Frontend / Vue tests (jsdom): `npm test`
- API worker tests (workerd via vitest-pool-workers): `npm run test:workers`
- Both: `npm test && npm run test:workers`

## Related docs

- `design/change-request-v2.md` — v2.0 PRD
- `.planning/REQUIREMENTS.md` — v2.0 requirement IDs
- `.planning/ROADMAP.md` — phase plan
