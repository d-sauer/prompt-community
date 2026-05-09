---
phase: 15-decommission-docs
plan: "02"
subsystem: infra
tags: [cloudflare, workers, wrangler, d1, deployment, production]

# Dependency graph
requires:
  - phase: 15-decommission-docs plan 01
    provides: Working v2 API worker build with correct wrangler scripts

provides:
  - "[env.production] block in src/workers/api/wrangler.toml with D1 binding"
  - "Production deployment instructions embedded as comments in wrangler.toml"

affects: [deployment, cloudflare-workers, cloudflare-d1]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Wrangler multi-env config: dev [vars] vs [env.production.vars] — secrets never in toml"
    - "Placeholder database_id pattern — safe to commit, replaced by operator after wrangler d1 create"

key-files:
  created: []
  modified:
    - src/workers/api/wrangler.toml

key-decisions:
  - "[env.production] block uses PLACEHOLDER_RUN_WRANGLER_D1_CREATE as database_id — operator replaces after wrangler d1 create"
  - "JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET are wrangler secrets only — never stored in toml"
  - "APP_ORIGIN placeholder set to YOUR_PAGES_DOMAIN.pages.dev — updated after Pages deployment URL is known"

patterns-established:
  - "Wrangler production secrets: all credentials via wrangler secret put, zero plaintext in committed config"

requirements-completed:
  - DEPLOY-01
  - DEPLOY-02
  - DEPLOY-03
  - DEPLOY-04
  - DECOM-06

# Metrics
duration: 2min
completed: 2026-05-09
---

# Phase 15 Plan 02: Deploy v2 API Worker to Cloudflare Production Summary

**[env.production] block added to wrangler.toml with D1 binding and placeholder database_id ready for operator deployment**

## Performance

- **Duration:** ~2 min (Task 1 automated; Task 2 is a human-action checkpoint)
- **Started:** 2026-05-09T14:44:24Z
- **Completed:** 2026-05-09T14:46:00Z (Task 1 only; Task 2 pending human action)
- **Tasks:** 1 of 2 automated (Task 2 requires human Cloudflare deployment)
- **Files modified:** 1

## Accomplishments
- Added `[env.production]` block to `src/workers/api/wrangler.toml` with ENV, APP_ORIGIN, and D1 binding sections
- Dev config (`[vars]` and `[[d1_databases]]`) left unchanged — local dev continues to work
- Inline deploy instructions added as comments for operator guidance

## Task Commits

Each task was committed atomically:

1. **Task 1: Add [env.production] block to API wrangler.toml** - `1759db1` (feat)
2. **Task 2: Deploy to Cloudflare production and archive data repo** - PENDING (human-action checkpoint)

**Plan metadata:** (pending final commit after checkpoint completion)

## Files Created/Modified
- `src/workers/api/wrangler.toml` - Added `[env.production]` block with ENV=production, APP_ORIGIN placeholder, and D1 database binding with placeholder database_id

## Decisions Made
- `database_id` left as `PLACEHOLDER_RUN_WRANGLER_D1_CREATE` — operator must run `wrangler d1 create` and replace it. D1 database IDs are not secrets and are safe to commit.
- `APP_ORIGIN` left as `https://YOUR_PAGES_DOMAIN.pages.dev` — updated once Pages deployment URL is known, then worker redeployed
- All credentials (JWT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) are set via `wrangler secret put` — zero plaintext in any committed file

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
**Production deployment requires manual operator steps.** See Task 2 checkpoint for:
- `wrangler d1 create` to provision the production D1 database
- Replace `PLACEHOLDER_RUN_WRANGLER_D1_CREATE` in wrangler.toml with real database_id UUID
- Apply migrations: `wrangler d1 migrations apply --remote --env production`
- Set secrets: `wrangler secret put JWT_SECRET / GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET --env production`
- Deploy: `wrangler deploy --config src/workers/api/wrangler.toml --env production`
- Update `APP_ORIGIN` in wrangler.toml with real Pages URL, redeploy
- Smoke test: `curl https://YOUR_WORKER.workers.dev/me` → expect HTTP 401 JSON
- Archive `prompt-community-data` GitHub repository
- Set production OAuth App callback URL to `https://YOUR_WORKER.workers.dev/auth/callback`

## Next Phase Readiness
- Task 1 complete: wrangler.toml has production environment block ready
- Blocked on Task 2: requires human Cloudflare auth and deployment operations
- Once deployed: v2 API is live at Cloudflare Workers URL, production D1 has full schema, phase 15 is complete

---
*Phase: 15-decommission-docs*
*Completed: 2026-05-09 (partial — Task 2 pending)*
