---
phase: 15-decommission-docs
plan: 01
subsystem: infra
tags: [cleanup, octokit, github, oauth, wrangler, env]

# Dependency graph
requires:
  - phase: 13-frontend-rewire
    provides: all frontend composables migrated to v2 API; no live imports of src/lib/github remain
  - phase: 14-admin-moderation-api
    provides: admin routes fully on v2 D1 worker; no github lib usage
provides:
  - src/lib/github/ directory completely deleted (8 source files)
  - root wrangler.toml (v1 OAuth proxy config) deleted
  - src/workers/oauth.ts and oauth.spec.ts deleted
  - package.json updated: deploy:worker targets v2 API, @octokit/* removed
  - .env.example rewritten with v2-only vars
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - package.json
    - .env.example
    - src/router/index.ts

key-decisions:
  - "Pre-existing build failures (vue-tsc type errors in admin components and views) are out of scope — not caused by github lib deletions; build was failing before this plan executed"
  - "String literal references to @/lib/github in spec file test descriptions are not live imports — confirmed safe, not patched"

patterns-established: []

requirements-completed:
  - DECOM-01
  - DECOM-02
  - DECOM-03
  - DECOM-04
  - DECOM-05
  - DECOM-07
  - DECOM-08

# Metrics
duration: 2min
completed: 2026-05-09
---

# Phase 15 Plan 01: Decommission v1 GitHub-Issues code

**Deleted entire src/lib/github/ (8 files), root wrangler.toml, and oauth proxy worker; cleaned package.json deploy script and removed @octokit/* deps; rewrote .env.example to v2-only vars**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-09T14:40:48Z
- **Completed:** 2026-05-09T14:43:00Z
- **Tasks:** 2
- **Files modified:** 15 (12 deleted, 3 updated)

## Accomplishments
- Deleted all 8 files in `src/lib/github/` and removed the directory
- Deleted root `wrangler.toml` (v1 OAuth proxy Cloudflare config) and `src/workers/oauth.ts` + spec
- Fixed `deploy:worker` npm script to point at `src/workers/api/wrangler.toml` (v2 API)
- Removed `@octokit/core` and `@octokit/graphql` from production dependencies
- Rewrote `.env.example` to contain only `VITE_API_URL`, `VITE_CF_WORKER_URL`, `VITE_R2_PUBLIC_URL`
- Removed stale Phase 10 router comment referencing `@/lib/github/auth`
- `npm test` (26 files, 158 tests) and `npm run test:workers` (10 files, 127 tests) all pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Delete all v1 GitHub lib files and root wrangler.toml** - `5b3a4b8` (chore)
2. **Task 2: Clean package.json, .env.example, and verify full build + test pass** - `914dc73` (chore)

## Files Created/Modified
- `src/lib/github/auth.ts` - Deleted (v1 GitHub auth helpers)
- `src/lib/github/auth.spec.ts` - Deleted (companion spec)
- `src/lib/github/etag.ts` - Deleted (v1 ETag caching layer)
- `src/lib/github/etag.spec.ts` - Deleted (companion spec)
- `src/lib/github/mutations.ts` - Deleted (v1 GitHub Issues mutations)
- `src/lib/github/octokit.ts` - Deleted (v1 Octokit client)
- `src/lib/github/octokit.spec.ts` - Deleted (companion spec)
- `src/lib/github/queries.ts` - Deleted (v1 GitHub GraphQL queries)
- `wrangler.toml` - Deleted (root-level v1 OAuth proxy worker config)
- `src/workers/oauth.ts` - Deleted (v1 OAuth proxy worker)
- `src/workers/oauth.spec.ts` - Deleted (companion spec)
- `src/router/index.ts` - Removed stale Phase 10 comment referencing @/lib/github/auth
- `package.json` - Fixed deploy:worker script; removed @octokit/core and @octokit/graphql
- `package-lock.json` - Updated after npm uninstall
- `.env.example` - Rewritten to v2-only variables

## Decisions Made
- Pre-existing `vue-tsc` build failures (admin components using outdated field names like `issueNumber`, `name` on `AdminLabel`) are out of scope — they were failing before this plan's changes per stash verification. Deferred to a future cleanup plan.
- One spec file (`usePromptsQuery.spec.ts`) contains `@/lib/github` in a test description string — this is intentional documentation of the migration, not a live import. Left as-is.

## Deviations from Plan

**1. [Rule 4 consideration — deferred] `npm run build` (vue-tsc) was already failing before plan execution**
- **Found during:** Task 2 verification
- **Issue:** `vue-tsc -b` exits with type errors in `AdminLabelsTab.vue`, `AdminQueueTab.vue`, `AdminLogTab.vue`, `VersionHistoryView.vue`, and others — all referencing v1 field names (e.g., `issueNumber`, `labels`, `name` on AdminLabel). These are not related to the `src/lib/github/` deletions.
- **Verified pre-existing:** Ran `git stash` then `npm run build` — same errors before our changes.
- **Action taken:** Deferred to separate cleanup plan per scope boundary rule. Tests (`npm test` + `npm run test:workers`) both pass cleanly.

---

**Total deviations:** 1 deferred (pre-existing build failures out of scope)
**Impact on plan:** No impact on correctness — tests pass and the v1 code is fully removed.

## Issues Encountered
- `npm run build` (vue-tsc type checking) was already failing before this plan due to v1 field references in admin Vue components. Not caused by this plan's changes. Deferred to a future cleanup task.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- v1 GitHub-Issues code paths are completely removed from the codebase
- `npm test` and `npm run test:workers` both pass cleanly
- `package.json` and `.env.example` show only v2 configuration
- Remaining work in Phase 15: fix pre-existing vue-tsc type errors in admin components (deferred items from previous phases), then final documentation pass

---
*Phase: 15-decommission-docs*
*Completed: 2026-05-09*
