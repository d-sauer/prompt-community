---
phase: 14-admin-moderation-api
verified: 2026-05-08T22:00:00Z
status: gaps_found
score: 12/13 must-haves verified
re_verification: false
gaps:
  - truth: "useAdminLabels imports getLabels from @/lib/api/queries; clearEtag removed"
    status: partial
    reason: "groupedLabels computed in useAdminLabels.ts treats each label item as { name: string; color: string } (the old LabelGroup shape from queries.ts), but the backend GET /labels actually returns items as { id: string; prefix: string; value: string; color: string|null; description: string|null }. At runtime, label.name is undefined, so id/prefix/value are all empty. Unit specs pass GREEN because the vi.mock for getLabels also returns the old { name, color } shape. The mismatch is masked by spec mocking but breaks at runtime."
    artifacts:
      - path: "src/composables/queries/useAdminLabels.ts"
        issue: "groupedLabels computed (lines 38-44) casts each label as { name: string; color: string } and uses label.name.split(':') — does not match actual backend response shape { id, prefix, value, color, description }"
      - path: "src/lib/api/queries.ts"
        issue: "LabelGroup interface declares Array<{ name: string; color: string }> but GET /labels backend returns Array<{ id: string; prefix: string; value: string; color: string|null; description: string|null }>"
      - path: "src/composables/queries/useAdminLabels.spec.ts"
        issue: "getLabels mock returns { name: 'category:writing', color: '...' } — matches old LabelGroup shape, not real backend shape; spec passes but does not validate runtime behavior"
    missing:
      - "Update LabelGroup interface in src/lib/api/queries.ts to: Array<{ id: string; prefix: string; value: string; color: string|null; description: string|null }>"
      - "Remove the explicit cast and name.split() logic in useAdminLabels.ts groupedLabels computed — use label.prefix and label.id directly from the real backend shape"
      - "Update the getLabels mock in useAdminLabels.spec.ts to use the real backend shape { id: 'ULID', prefix: 'category', value: 'writing', color: '...', description: null }"
human_verification:
  - test: "Open admin labels tab in a running dev environment"
    expected: "Labels render grouped by prefix (category, model, difficulty) with correct values"
    why_human: "The groupedLabels shape mismatch silently produces empty groups at runtime; only visible in a running app with real D1 data"
---

# Phase 14: Admin Moderation API — Verification Report

**Phase Goal:** Deliver a complete admin moderation REST API backed by D1 and wire all five admin composables to it, eliminating all remaining GitHub API dependencies from the admin panel.
**Verified:** 2026-05-08T22:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | admin.spec.ts exists and tests all 6 endpoint groups with 401/403 guards | VERIFIED | 532-line spec, 28 tests, covers GET /admin/queue, /log, /stats, POST approve/hide, POST/PATCH/DELETE /labels; all { error, code } shape assertions present |
| 2 | Each test asserts both success contract and 401/403 rejection shape { error, code } | VERIFIED | Every auth-guard test calls `expect(body).toHaveProperty('error')` and `expect(body).toHaveProperty('code')` |
| 3 | A flagged prompt row is inserted in beforeAll for queue and moderation action tests | VERIFIED | beforeAll inserts id='01PFLAGGED0000000000000001'; approve/hide tests use per-test unique IDs |
| 4 | GET /admin/queue returns flagged prompts only, paginated, maintainer-only | VERIFIED | admin.ts lines 35-77: WHERE status='flagged', limit 21, cursor pagination, requireAuth()+requireMaintainer() |
| 5 | GET /admin/log returns moderation_log history, maintainer-only | VERIFIED | admin.ts lines 83-117: raw D1 LEFT JOIN across moderation_log, prompts, users |
| 6 | POST /admin/prompts/:id/approve updates status to 'published' and inserts moderation_log row | VERIFIED | admin.ts lines 146-181: UPDATE prompts SET status='published' + INSERT moderation_log with action='approve' |
| 7 | POST /admin/prompts/:id/hide updates status to 'hidden' and inserts moderation_log row | VERIFIED | admin.ts lines 187-222: UPDATE prompts SET status='hidden' + INSERT moderation_log with action='hide' |
| 8 | POST/PATCH/DELETE /labels succeed for maintainer, return 403 for non-maintainer | VERIFIED | labels.ts lines 67-162: all three handlers chain requireAuth()+requireMaintainer() |
| 9 | GET /admin/stats returns { total, flagged } counts from D1 | VERIFIED | admin.ts lines 123-140: two COUNT queries, response { total, flagged } |
| 10 | All error responses have { error: string, code: string } shape | VERIFIED | role.ts fixed to `{ error: 'forbidden', code: 'forbidden' }`. auth.ts has 3 pre-existing OAuth errors missing code — explicitly deferred by plan-02 as out of scope |
| 11 | src/lib/api/admin.ts exists with apiFetch wrappers for all admin endpoints | VERIFIED | admin.ts: 8 exported functions (getAdminQueue, getAdminLog, getAdminStats, approvePrompt, hidePrompt, createLabel, updateLabel, deleteLabel) + 4 exported interfaces |
| 12 | All five admin composables import from @/lib/api/admin — zero @/lib/github/* imports | VERIFIED | grep confirms no @/lib/github imports in any of the 5 composables or admin.ts |
| 13 | useAdminLabels imports getLabels from @/lib/api/queries; clearEtag removed | PARTIAL | Import is correct. clearEtag removed. But groupedLabels computed uses old { name, color } shape that does not match actual backend response { id, prefix, value, color, description } — runtime will produce empty label groups |

**Score:** 12/13 truths verified

---

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/workers/api/routes/admin.spec.ts` | VERIFIED | 532 lines, 28 tests across 7 describe blocks; all auth-guard assertions use { error, code } |
| `src/workers/api/routes/admin.ts` | VERIFIED | 225 lines; 6 route handlers replacing the 501 stub; requireAuth+requireMaintainer chained on every route |
| `src/workers/api/routes/labels.ts` | VERIFIED | 164 lines; POST, PATCH, DELETE added after existing GET /; all write routes guarded |
| `src/workers/api/middleware/role.ts` | VERIFIED | Returns `{ error: 'forbidden', code: 'forbidden' }` — API-27 fix confirmed |
| `src/lib/api/admin.ts` | VERIFIED | 99 lines; 4 interfaces + 8 typed apiFetch wrappers; correct endpoint paths |
| `src/composables/queries/useAdminQueue.ts` | VERIFIED | Imports getAdminQueue from @/lib/api/admin; FlaggedIssue drops 'number'; cursor pagination via next_cursor |
| `src/composables/queries/useAdminActions.ts` | VERIFIED | approvePrompt/hidePrompt from admin.ts; deletePrompt from mutations; featureMutation stubbed as error-throw |
| `src/composables/queries/useAdminLog.ts` | VERIFIED | getAdminLog from admin.ts; structured LogEntry; date filter uses created_at |
| `src/composables/queries/useAdminLabels.ts` | PARTIAL | Import wiring correct; clearEtag removed; groupedLabels computed uses wrong item shape (see gap) |
| `src/composables/queries/useAdminStats.ts` | VERIFIED | getAdminStats from admin.ts; exposes total and flagged; no featured field |
| `src/composables/queries/useAdminQueue.spec.ts` | VERIFIED | Mocks @/lib/api/admin; ULID id assertions; no number field |
| `src/composables/queries/useAdminActions.spec.ts` | VERIFIED | Mocks @/lib/api/admin + @/lib/api/mutations; id string input shapes |
| `src/composables/queries/useAdminLog.spec.ts` | VERIFIED | Mocks @/lib/api/admin; structured LogEntry shape with actor/prompt fields |
| `src/composables/queries/useAdminLabels.spec.ts` | PARTIAL | Mocks use old { name, color } shape for getLabels — spec passes but does not validate runtime backend shape |
| `src/composables/queries/useAdminStats.spec.ts` | VERIFIED | Mocks @/lib/api/admin; asserts total=42, flagged=3; no featured field |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `admin.spec.ts` | `src/workers/api/routes/admin.ts` (via index) | `import app from '../index'` | WIRED | Line 15: `import app from '../index'` |
| `src/workers/api/routes/admin.ts` | `src/workers/api/middleware/auth.ts` | `requireAuth(), requireMaintainer()` chained in that order | WIRED | All 5 routes: requireAuth() then requireMaintainer(); auth sets c.var.user, role reads it |
| `src/workers/api/routes/admin.ts` | `src/workers/api/db/schema.ts` | `moderation_log` insert after every approve/hide | WIRED | Lines 172-178 (approve) and 213-219 (hide): db.insert(schema.moderation_log) |
| `src/composables/queries/useAdminQueue.ts` | `src/lib/api/admin.ts` | `import { getAdminQueue } from '@/lib/api/admin'` | WIRED | Line 3 |
| `src/composables/queries/useAdminLabels.ts` | `src/lib/api/admin.ts` | `import { createLabel, updateLabel, deleteLabel } from '@/lib/api/admin'` | WIRED | Lines 3-4 import correct functions; but groupedLabels item shape is wrong |
| `src/workers/api/index.ts` | `admin.ts` | `app.route('/admin', admin)` | WIRED | Line 71 |
| `src/workers/api/index.ts` | `labels.ts` | `app.route('/labels', labels)` | WIRED | Line 67 |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| API-22 | 14-01, 14-02 | GET /admin/queue returns flagged prompts (maintainer only) | SATISFIED | admin.ts GET /queue handler; spec tests confirm 200+data for maintainer, 401/403 for others |
| API-23 | 14-01, 14-02 | GET /admin/log returns the moderation log (maintainer only) | SATISFIED | admin.ts GET /log handler with raw D1 LEFT JOIN; spec tests confirm |
| API-24 | 14-01, 14-02 | POST /admin/prompts/:id/approve approves a flagged prompt | SATISFIED | admin.ts POST /prompts/:id/approve; updates status='published', inserts moderation_log |
| API-25 | 14-01, 14-02 | POST /admin/prompts/:id/hide hides a prompt | SATISFIED | admin.ts POST /prompts/:id/hide; updates status='hidden', inserts moderation_log |
| API-26 | 14-01, 14-02 | POST /labels, PATCH /labels/:id, DELETE /labels/:id manage labels | SATISFIED | labels.ts has all three write handlers; all guarded by requireAuth+requireMaintainer |
| API-27 | 14-01, 14-02 | API errors return consistent JSON shape { error, code } | SATISFIED (with noted exception) | role.ts fixed; all new admin/label routes use { error, code }. auth.ts has 3 pre-existing OAuth errors missing code — deferred by plan as out of scope (pre-existing) |
| API-28 | 14-01, 14-02 | All admin and write routes guarded by JWT + role middleware | SATISFIED | Every handler in admin.ts and every write handler in labels.ts chains requireAuth()+requireMaintainer() |
| FRONT-06 | 14-03 | src/lib/api/admin.ts replaces GitHub admin/maintainer paths | PARTIALLY SATISFIED | admin.ts created with 8 functions; all 5 composables import from @/lib/api/admin; zero @/lib/github imports remain. Gap: useAdminLabels groupedLabels uses wrong backend shape at runtime |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/composables/queries/useAdminLabels.ts` | 38-44 | Wrong runtime shape: `(label as { name: string; color: string }).name` — label items from GET /labels don't have a 'name' field | Blocker | groupedLabels computed produces empty/corrupt label list at runtime; admin label management UI is non-functional with real data |
| `src/lib/api/queries.ts` | 33 | LabelGroup interface `Array<{ name: string; color: string }>` does not match real backend response shape | Warning | TypeScript type drift; masked by explicit casts in useAdminLabels |
| `src/composables/queries/useAdminLabels.spec.ts` | 26-33 | getLabels mock uses `{ name: 'category:writing', color: '...' }` — old shape, not real backend shape | Warning | Spec passes GREEN but provides no coverage of the actual API contract |

---

### Human Verification Required

#### 1. Admin Labels Tab Runtime Behavior

**Test:** Run the app locally (`npm run dev` + `wrangler dev`), log in as a maintainer, navigate to Admin > Labels tab.
**Expected:** Labels should render grouped by prefix (category, model, difficulty, tags) with correct names and colors.
**Why human:** The groupedLabels computed uses the wrong item shape. With real D1 data the labels list will be empty or show blank entries. Only detectable at runtime against actual API responses.

#### 2. Admin Queue — Approve and Hide Actions End-to-End

**Test:** Flag a prompt, navigate to Admin Queue, approve it and then hide a different one.
**Expected:** Prompt disappears from queue; reappears in moderation log with correct actor and action; stats counts update.
**Why human:** Involves TanStack Query cache invalidation, multi-step UI interactions, and D1 persistence — not fully verifiable by grep.

---

### Gaps Summary

One gap blocks full FRONT-06 goal achievement. The `groupedLabels` computed in `useAdminLabels.ts` was written to handle the old `{ name, color }` shape returned by the GitHub labels API. When Phase 14 wired `getLabels()` from the new backend, the backend returns `{ id, prefix, value, color, description }` — but the composable's cast and `name.split(':')` logic was carried over from the pre-rewire implementation. The unit spec masks this because its mock also uses the old shape. At runtime, every label item has `label.name === undefined`, producing empty strings for prefix/value and undefined ULID ids — meaning the admin label management UI will show no labels and any PATCH/DELETE attempted from the UI would send `undefined` as the id.

The fix is a three-file change: update `LabelGroup` in `queries.ts`, remove the cast and use `label.prefix`/`label.value`/`label.id` directly in `useAdminLabels.ts`, and update the spec mock to use the real backend shape.

---

_Verified: 2026-05-08T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
