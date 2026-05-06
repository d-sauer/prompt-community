---
phase: 11-read-api
verified: 2026-05-06T22:06:30Z
status: passed
score: 10/10 must-haves verified
re_verification: true
gaps: []
human_verification:
  - test: "Authenticated viewer fields in GET /prompts listing"
    expected: "viewer_reaction and viewer_bookmarked appear on each listing item when authenticated; absent when unauthenticated"
    why_human: "Spec covers the logic but cookie parsing behaviour end-to-end requires the real workerd runtime to confirm"
---

# Phase 11: Read API Verification Report

**Phase Goal:** All read operations — prompts listing, single prompt, versions, comments, user profiles, activity, labels, notifications, and full-text search — are served by the Hono worker from D1, replacing GitHub API reads.
**Verified:** 2026-05-06T22:06:30Z
**Status:** passed
**Re-verification:** Yes — after gap closure (plan 11-05)

## Re-Verification Summary

| Item | Previous | Now |
|------|----------|-----|
| Overall status | gaps_found | passed |
| Score | 8/10 | 10/10 |
| API-09 (GET /labels URL) | BLOCKED | SATISFIED |
| SEARCH-01 (FTS5 text accuracy) | PARTIAL | SATISFIED |
| Regressions | — | None |

### Gaps Closed

- **API-09 URL mismatch:** GET /labels handler extracted from `search.ts` (where it resolved to `/search/labels`) into a standalone `labels.ts` file. `index.ts` now mounts it at `app.route('/labels', labels)`. Confirmed by direct file read and by the new spec test that asserts `/search/labels` returns 404.
- **SEARCH-01 text inaccuracy:** REQUIREMENTS.md now reads "D1 FTS5 virtual table indexes prompt `title` and `body` (tags are fetched from `prompt_tags` via JS aggregation after FTS5 match — no FTS5 column needed)". The false "and tags" claim is gone.

### Regressions

None. Full worker spec suite: 64 tests across 8 files, all pass.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /prompts returns paginated list filterable by category/model/difficulty with cursor pagination | VERIFIED | prompts.ts GET / handler: full Drizzle query with WHERE conditions, DESC cursor, limit validation, optionalAuth; 17 tests green |
| 2 | GET /search?q= returns FTS5 MATCH results via D1, no GitHub API call | VERIFIED | search.ts uses `c.env.DB.prepare()` with "FROM prompts_fts WHERE prompts_fts MATCH ?"; 6 tests green |
| 3 | GET /users/:login/activity returns real activity feed (not placeholder) | VERIFIED | users.ts /:login/activity queries prompts table, maps to `{ type: 'prompt_created', prompt: { id, title, created_at } }`; 8 tests green |
| 4 | All read endpoints return consistent JSON; errors use standard envelope | VERIFIED | All handlers return `{ error, code }` on 400/401/404; `{ data, next_cursor }` on lists |
| 5 | Unauthenticated requests to public endpoints succeed; /notifications returns 401 without JWT | VERIFIED | optionalAuth on prompts/search/labels; requireAuth() on notifications GET /; 3 notifications tests green |
| 6 | GET /prompts/:id returns full prompt detail with body, author, tags, reaction_counts | VERIFIED | prompts.ts GET /:id: queries prompts + tags + users + reactions; includes body field; 404 on unknown/flagged |
| 7 | GET /prompts/:id/versions and GET /prompts/:id/comments are paginated and 404 on unknown prompt | VERIFIED | Both handlers verify prompt exists first; cursor pagination; soft-delete masking on comments |
| 8 | GET /users/:login, GET /users/:login/prompts return real D1 data; 404 on unknown login | VERIFIED | users.ts resolves user by github_login, 404 if missing; prompts filtered to published only |
| 9 | GET /labels is accessible at /labels (not /search/labels) and returns grouped label taxonomy | VERIFIED | labels.ts exists as standalone Hono sub-app; `app.route('/labels', labels)` in index.ts line 66; spec asserts /labels returns 200 and /search/labels returns 404 — all 3 new tests pass |
| 10 | SEARCH-01 accurately states FTS5 indexes title and body (not tags); tags fetched via JS aggregation | VERIFIED | REQUIREMENTS.md line 98: "D1 FTS5 virtual table indexes prompt `title` and `body` (tags are fetched from `prompt_tags` via JS aggregation after FTS5 match — no FTS5 column needed)" |

**Score:** 10/10 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/workers/api/routes/labels.ts` | Standalone GET /labels Hono sub-app | VERIFIED | 59 lines; Drizzle query against schema.labels; grouped response; Cache-Control: public, max-age=300; exports default app |
| `src/workers/api/routes/prompts.spec.ts` | Tests for GET /prompts, /:id, /versions, /comments (API-01..04) | VERIFIED | 17 tests; imports app from ../index; JWT mint in beforeAll; error envelope assertions |
| `src/workers/api/routes/users.spec.ts` | Tests for GET /users/:login, /prompts, /activity (API-06..08) | VERIFIED | 8 tests; seeded user IDs as constants; 404 cases tested |
| `src/workers/api/routes/search.spec.ts` | Tests for GET /search and GET /labels (SEARCH-01, SEARCH-02, API-09) | VERIFIED | 9 tests (6 original + 3 new GET /labels); all pass |
| `src/workers/api/routes/notifications.spec.ts` | Tests for GET /notifications with requireAuth (API-10) | VERIFIED | 3 tests; 401 without cookie, 200 with valid JWT, shape assertion |
| `src/workers/api/routes/prompts.ts` | Four GET handlers replacing 501 stub | VERIFIED | 412 lines; real Drizzle queries; optionalAuth; inArray batch fetching; cursor pagination |
| `src/workers/api/routes/users.ts` | Three GET handlers replacing 501 stub | VERIFIED | 224 lines; real Drizzle queries; user resolution gate; activity feed from prompts table |
| `src/workers/api/routes/search.ts` | GET /search with FTS5 MATCH only (labels handler removed) | VERIFIED | Only GET / (FTS5) handler remains; comment on line 3 notes labels extracted to labels.ts; no /labels handler present |
| `src/workers/api/routes/notifications.ts` | GET /notifications with requireAuth (new file) | VERIFIED | 59 lines; requireAuth() applied; cursor pagination; maps notification fields |
| `src/workers/api/index.ts` | Mounts all routes including /labels and /notifications | VERIFIED | Line 11: import labels; line 66: app.route('/labels', labels); line 71: app.route('/notifications', notifications) |
| `.planning/REQUIREMENTS.md` | SEARCH-01 text reflects title+body FTS5 only | VERIFIED | Line 98: updated text with explanation of JS aggregation for tags |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| index.ts | routes/labels.ts | `app.route('/labels', labels)` | WIRED | Line 11 (import) and line 66 (mount) in index.ts |
| labels.ts | db/schema.ts labels table | `db.select().from(schema.labels)` | WIRED | labels.ts line 20-24: Drizzle query on schema.labels with orderBy |
| prompts.ts | middleware/auth.ts | `optionalAuth()` on GET / and GET /:id | WIRED | import optionalAuth from '../middleware/auth'; applied on both handlers |
| prompts.ts | db/schema.ts | Drizzle query using prompts, prompt_tags, prompt_versions, comments, reactions, bookmarks | WIRED | import * as schema from '../db/schema'; all 6 tables queried |
| users.ts | db/schema.ts | Drizzle queries against users, prompts, prompt_tags, reactions, comments | WIRED | import * as schema; github_login column used as WHERE condition |
| search.ts | D1 FTS5 virtual table prompts_fts | `c.env.DB.prepare('SELECT ... FROM prompts_fts WHERE prompts_fts MATCH ?')` | WIRED | Raw D1 prepare() used (Drizzle cannot query virtual tables) |
| notifications.ts | middleware/auth.ts | `requireAuth()` middleware | WIRED | import requireAuth from '../middleware/auth'; app.get('/', requireAuth(), ...) |
| index.ts | routes/notifications.ts | `app.route('/notifications', notifications)` | WIRED | Line 16 (import) and line 71 (mount) |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| API-01 | 11-01, 11-02 | GET /prompts paginated listing with filters | SATISFIED | prompts.ts GET / with category/model/difficulty/cursor/limit params; optionalAuth viewer fields |
| API-02 | 11-01, 11-02 | GET /prompts/:id single prompt with author, tags, reaction_counts | SATISFIED | prompts.ts GET /:id; includes body; 404 on unknown/flagged/hidden |
| API-03 | 11-01, 11-02 | GET /prompts/:id/versions version history with author and created_at | SATISFIED | prompts.ts GET /:id/versions; innerJoin with users; cursor pagination |
| API-04 | 11-01, 11-02 | GET /prompts/:id/comments | SATISFIED | prompts.ts GET /:id/comments; leftJoin with users; soft-delete masking |
| API-05 | 11-01, 11-04 | GET /search?q= FTS5 full-text search | SATISFIED | search.ts GET / with FTS5 MATCH; 400 on missing/short query; same shape as GET /prompts |
| API-06 | 11-01, 11-03 | GET /users/:login public profile | SATISFIED | users.ts GET /:login; WHERE github_login = login; 404 on unknown |
| API-07 | 11-01, 11-03 | GET /users/:login/prompts user's submissions | SATISFIED | users.ts GET /:login/prompts; published only; cursor pagination; PromptSummary shape |
| API-08 | 11-01, 11-03 | GET /users/:login/activity real activity feed | SATISFIED | users.ts GET /:login/activity; real prompts query; `{ type: 'prompt_created', prompt: {...} }` shape |
| API-09 | 11-01, 11-04, 11-05 | GET /labels taxonomy listing at standalone /labels path | SATISFIED | labels.ts standalone route; mounted at app.route('/labels', labels) in index.ts; 3 spec tests confirm correct URL and response shape |
| API-10 | 11-01, 11-04 | GET /notifications authenticated user's notifications | SATISFIED | notifications.ts GET / with requireAuth(); 401 without cookie; cursor pagination by user.id |
| SEARCH-01 | 11-01, 11-04, 11-05 | D1 FTS5 virtual table indexes title and body; tags via JS aggregation | SATISFIED | 0002_fts5.sql has title+body FTS5 columns; REQUIREMENTS.md updated to match; no tags FTS5 column needed |
| SEARCH-02 | 11-01, 11-04 | GET /search uses FTS5 MATCH for ranked results | SATISFIED | search.ts uses raw D1 prepare() with "FROM prompts_fts WHERE prompts_fts MATCH ?" |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| src/workers/api/routes/users.spec.ts | Describe blocks labeled API-05/06/07 but REQUIREMENTS.md assigns API-06/07/08 to user endpoints | Info | Documentation inconsistency only; no functional impact |

No stub implementations found. All route files contain substantive Drizzle or raw D1 queries.

---

### Human Verification Required

#### 1. Authenticated viewer fields in GET /prompts listing

**Test:** Send GET /prompts with a valid `pc_session` cookie containing a JWT; confirm `viewer_reaction` and `viewer_bookmarked` appear on each listing item.
**Expected:** Both fields present when authenticated; neither field present when unauthenticated.
**Why human:** Automated spec covers the logic but cookie parsing end-to-end requires the real workerd runtime to confirm correct behaviour.

---

## Test Run Results

Full worker spec suite run at verification time:

- **Files:** 8 passed
- **Tests:** 64 passed (0 failures)
- **search.spec.ts:** 9/9 (6 original GET /search + 3 new GET /labels)

---

_Verified: 2026-05-06T22:06:30Z_
_Verifier: Claude (gsd-verifier)_
