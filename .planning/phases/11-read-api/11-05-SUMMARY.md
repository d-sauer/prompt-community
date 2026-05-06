---
phase: 11-read-api
plan: 05
subsystem: api
tags: [hono, cloudflare-workers, d1, drizzle-orm, vitest, fts5]

# Dependency graph
requires:
  - phase: 11-04
    provides: search.ts with GET /labels incorrectly nested under /search sub-app
provides:
  - GET /labels standalone route at top-level (not /search/labels)
  - labels.ts Hono sub-app with grouped label taxonomy
  - GET /labels spec tests (shape, cache header, URL validation)
  - Corrected SEARCH-01 requirement text reflecting actual FTS5 implementation
affects: [12-write-api, 13-frontend-rewire, Phase 11 verification]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Route extraction: labels handler moved from search.ts to dedicated labels.ts"
    - "TDD gap closure: RED tests written before extraction, GREEN after implementation"

key-files:
  created:
    - src/workers/api/routes/labels.ts
  modified:
    - src/workers/api/routes/search.ts
    - src/workers/api/index.ts
    - src/workers/api/routes/search.spec.ts
    - .planning/REQUIREMENTS.md

key-decisions:
  - "GET /labels extracted to labels.ts — was incorrectly nested under /search sub-app causing wrong URL path /search/labels"
  - "SEARCH-01 updated: FTS5 indexes title+body only — tags fetched from prompt_tags via JS aggregation post-FTS5 (no FTS5 column needed)"
  - "asc import removed from search.ts — was only used by the labels handler that was extracted"

patterns-established:
  - "Route file per top-level resource — labels.ts follows same pattern as notifications.ts, prompts.ts etc."

requirements-completed: [API-09, SEARCH-01]

# Metrics
duration: 3min
completed: 2026-05-06
---

# Phase 11 Plan 05: Gap Closure Summary

**GET /labels extracted to standalone route at /labels (not /search/labels), with 3 spec tests and corrected SEARCH-01 requirement text removing false FTS5 tags-indexing claim**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-06T20:01:32Z
- **Completed:** 2026-05-06T20:04:02Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Extracted GET /labels handler from search.ts into a new standalone labels.ts Hono sub-app
- Mounted labels at app.route('/labels', labels) in index.ts — endpoint now accessible at /labels not /search/labels
- Added "GET /labels — API-09" describe block with 3 passing tests (shape, cache header, URL validation)
- Updated REQUIREMENTS.md SEARCH-01 to accurately state FTS5 indexes title+body with explanation of JS aggregation for tags

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract /labels to standalone route and mount at top-level** - `7ef86b8` (feat)
2. **Task 2: Add GET /labels spec tests to search.spec.ts** - `9539bb3` (test)
3. **Task 3: Update REQUIREMENTS.md SEARCH-01 to reflect actual FTS5 implementation** - `6fe9e9d` (chore)

**Plan metadata:** committed with final docs commit (state/roadmap update)

## Files Created/Modified
- `src/workers/api/routes/labels.ts` - New standalone Hono sub-app with GET / handler returning grouped label taxonomy
- `src/workers/api/routes/search.ts` - Removed GET /labels handler and unused asc import
- `src/workers/api/index.ts` - Added import for labels and app.route('/labels', labels) mount
- `src/workers/api/routes/search.spec.ts` - Added 3 GET /labels tests (6 existing + 3 new = 9 total, all pass)
- `.planning/REQUIREMENTS.md` - Updated SEARCH-01 text: title+body FTS5 indexing with JS aggregation explanation

## Decisions Made
- GET /labels was incorrectly nested under the /search Hono sub-app (mounted as /search), making it only accessible at /search/labels instead of the documented /labels. Extracting to a new file and mounting at top-level was the straightforward fix matching the established route-per-resource pattern.
- SEARCH-01 previously claimed "indexes prompt title, body, and tags" — this was factually incorrect relative to 0002_fts5.sql which only creates title and body FTS5 columns. Tags are handled by prompt_tags table with JS aggregation after FTS5 results are retrieved. The requirement was satisfied by the actual implementation; only the description text was inaccurate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors exist in auth.spec.ts, role.spec.ts, notifications.spec.ts, and prompts.spec.ts (Env type cast issues) — these are out of scope for this plan and were logged but not fixed per scope boundary rules.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 11 gap closure complete: /labels now at correct URL, spec tests confirm behavior, SEARCH-01 requirement text is accurate
- Phase 11 verification gaps (API-09 URL mismatch, SEARCH-01 text) are both closed
- Phase 12 write API can proceed without any Phase 11 blockers

---
*Phase: 11-read-api*
*Completed: 2026-05-06*
