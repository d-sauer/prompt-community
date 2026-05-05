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

3. Local D1 setup — TBD (filled in by Plan 04 after the schema and migrations land).
   <!-- PLAN-04: insert wrangler d1 create, drizzle-kit push, FTS5 migration, npm run seed steps -->

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

<!-- PLAN-04: document the wrangler d1 execute --local command + sample queries -->

## Tests

- Frontend / Vue tests (jsdom): `npm test`
- API worker tests (workerd via vitest-pool-workers): `npm run test:workers`
- Both: `npm test && npm run test:workers`

## Related docs

- `design/change-request-v2.md` — v2.0 PRD
- `.planning/REQUIREMENTS.md` — v2.0 requirement IDs
- `.planning/ROADMAP.md` — phase plan
