# Phase 8: Fix Admin & Search Tech Debt - Research

**Researched:** 2026-03-26
**Domain:** TanStack Query invalidation, ETag cache scoping, dead code removal (Vue 3 / Vitest)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Admin log invalidation
- Add `void queryClient.invalidateQueries({ queryKey: ['admin', 'log'] })` to `invalidateAdmin()` in `useAdminActions.ts`
- Applies to all 7 mutations: approve, hide, delete, feature, bulkApprove, bulkHide, bulkDelete
- Do NOT clear ETags on invalidation — GitHub processes comment creation synchronously; by the time TanStack Query refetches after mutation resolves, the new comment is already in the response; a 304 means the log genuinely hasn't changed
- Keep `staleTime: 60_000` in `useAdminLog.ts` — invalidation handles post-action freshness; staleTime prevents redundant refetches on tab focus

#### ETag scoping in admin log
- Change `getIssueComments(authStore.token!, issue.number)` to `getIssueComments(authStore.token!, issue.number, authStore.user?.login ?? '')`
- Follows the same per-user scoping pattern established in Phase 7: `userLogin=''` default preserves backward compatibility for unauthenticated contexts

#### Dead code removal in useCreatePrompt
- Remove `void searchStore` expression (line 57)
- Remove the surrounding comment block (the 3-line comment explaining the "intended" behavior)
- Remove the `useSearchStore` import — becomes orphaned after the expression is removed
- Rationale: `resetQueries({ queryKey: ['prompts'] })` already triggers a refetch; BrowseView's watcher calls `searchStore.buildIndex()` when new data arrives — no explicit rebuild call needed in the mutation
- Keep `draftStore.clear()` before `router.push()` — correct order, no change needed

#### Test updates
- Update `useAdminActions.spec.ts` existing invalidation test to also assert: `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'log'] })`
- Add test to `useAdminLog.spec.ts` (or create spec if missing) verifying `getIssueComments` is called with `(token, issueNumber, userLogin)` — covers INFR-05 ETag scoping in the log
- No test needed for dead code removal — it's a deletion with no behavior to assert

### Claude's Discretion
- Exact mock setup for the new `useAdminLog` test (spy pattern vs vi.mock)
- Whether to add the `useAdminLog` test to an existing spec file or create a new one

### Deferred Ideas (OUT OF SCOPE)
- **Installation & setup guide** — Create a detailed guide covering app installation, configuring properties/tags, and setting up a target GitHub repository for prompts-as-issues. User explicitly requested this; belongs in its own documentation/onboarding phase.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ADMN-08 | Maintainer/Curator can view a moderation log with full action history, filterable by date | Log goes stale after moderation actions; invalidating `['admin','log']` in `invalidateAdmin()` makes the log reflect actions immediately |
| INFR-05 | ETag conditional requests used for all cacheable GitHub API reads (304 responses = zero rate limit cost) | `getIssueComments` already accepts `userLogin` param (Phase 7 pattern); `useAdminLog` must pass `authStore.user?.login ?? ''` to scope ETag bucket per user |
| CONT-01 | Authenticated user can create a new prompt submission | Dead `void searchStore` expression in `useCreatePrompt.ts` causes unused import warning and dead code noise; removal restores clean compilation |
</phase_requirements>

---

## Summary

Phase 8 closes three targeted tech debt gaps identified in the v1.0 audit. All three changes are surgical — one line added, one argument added, and a block of dead code deleted. No new dependencies, no new files (beyond a test assertion), and no observable UI changes.

The `invalidateAdmin()` function in `useAdminActions.ts` currently invalidates `['admin','queue']` and `['admin','stats']` but not `['admin','log']`. Because all 7 moderation mutations call `onSuccess: invalidateAdmin`, adding one line to that function fixes stale-log for the entire mutation surface at once.

The `getIssueComments` function already has a `userLogin` parameter (added in Phase 7) but `useAdminLog` was not updated to pass it. Adding `authStore.user?.login ?? ''` completes INFR-05 coverage for the admin log path. The `void searchStore` dead expression in `useCreatePrompt.ts` has no effect and carries an orphaned import; removing both clears an unused-import TypeScript/ESLint warning.

**Primary recommendation:** Three atomic changes, one plan, one wave. All changes are in the composables layer and have existing test infrastructure to extend.

---

## Standard Stack

### Core (already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/vue-query | installed | Query cache invalidation | Already in use throughout codebase |
| vitest | installed | Unit tests | Project test framework |
| @vue/test-utils | installed | Component mounting in tests | Already used in all spec files |
| @pinia/testing | installed | Pinia store mocking | Already used in all spec files |

**Installation:** No new packages required.

---

## Architecture Patterns

### Existing invalidation pattern in `invalidateAdmin()`

```typescript
// src/composables/queries/useAdminActions.ts (current)
function invalidateAdmin() {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
}
```

Add one line — same void-expression pattern:

```typescript
function invalidateAdmin() {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'log'] })
}
```

### ETag scoping pattern (from Phase 7)

Phase 7 established: `userLogin=''` is the default; callers pass `authStore.user?.login ?? ''` to scope ETag storage per user. `getIssueComments` in `queries.ts` already has this signature:

```typescript
// src/lib/github/queries.ts:229 (already exists)
export async function getIssueComments(
  token: string,
  issueNumber: number,
  userLogin: string = '',
): Promise<...>
```

The only change needed is at the call site in `useAdminLog.ts:51`:

```typescript
// Before
getIssueComments(authStore.token!, issue.number)

// After
getIssueComments(authStore.token!, issue.number, authStore.user?.login ?? '')
```

### Dead code removal pattern

```typescript
// useCreatePrompt.ts — REMOVE these items:

// Line 6: import { useSearchStore } from '@/stores/useSearchStore'   ← remove import
// Line 23: const searchStore = useSearchStore()                       ← remove instantiation
// Lines 54-57: comment block + void searchStore expression            ← remove block
```

The `onSuccess` handler becomes simply:

```typescript
onSuccess: async (issueNumber: number) => {
  await queryClient.resetQueries({ queryKey: ['prompts'] })
  draftStore.clear()
  void router.push(`/prompts/${issueNumber}`)
},
```

### Test extension pattern (existing spy approach)

The existing `useAdminActions.spec.ts` invalidation test uses `vi.spyOn(queryClient, 'invalidateQueries')`. Extend the existing assertion block:

```typescript
// useAdminActions.spec.ts — existing test at line 134
it('each action invalidates admin queue query cache on success', async () => {
  const { queryClient, composable } = setupTest()
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

  await composable.approveMutation.mutateAsync({ issueNumber: 42, nodeId: 'I_kwDO123' })

  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'queue'] })
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'stats'] })
  expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'log'] })  // ADD
})
```

For the new `useAdminLog` test verifying ETag scoping, two approaches are viable:

**Option A (spy on existing vi.mock):** The mock for `getIssueComments` is already set up in `useAdminLog.spec.ts` using `vi.mock('@/lib/github/queries', ...)`. Use `vi.mocked(getIssueComments)` to assert the call signature:

```typescript
import * as queries from '@/lib/github/queries'

// Inside test:
await vi.waitFor(() => expect(composable.entries.value.length).toBeGreaterThan(0))
expect(vi.mocked(queries.getIssueComments)).toHaveBeenCalledWith(
  'test-token',
  expect.any(Number),
  'maintainer',  // authStore.user.login set in setupTest
)
```

**Option B (add user login to setupTest):** The existing `setupTest()` only calls `authStore.receiveToken('test-token')` without setting `user.login`. To assert the third argument, extend `setupTest()` to also `$patch({ user: { login: 'maintainer', avatarUrl: '' } })` — matching the pattern already used in `useAdminActions.spec.ts`.

**Recommendation:** Option A/B are equivalent. Add the test to the existing `useAdminLog.spec.ts` file (no new file needed). Extend `setupTest()` to set `user.login` and assert the third argument on `getIssueComments`.

### Anti-Patterns to Avoid

- **Do not** add `queryClient.removeQueries` or ETag invalidation alongside `invalidateAdmin()` — the CONTEXT.md explicitly locks: "Do NOT clear ETags on invalidation."
- **Do not** remove `staleTime: 60_000` from `useAdminLog.ts` — locked decision; invalidation handles freshness, staleTime prevents tab-focus redundant refetches.
- **Do not** leave the `useSearchStore` import in `useCreatePrompt.ts` after removing `void searchStore` — TypeScript will warn on unused import.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query freshness after mutation | Custom polling / setTimeout refetch | `queryClient.invalidateQueries()` | Already integrated; fires immediately after mutation onSuccess |
| ETag per-user scoping | Custom cache key logic | Pass `userLogin` to `createRestClient` (via `getIssueComments` 3rd param) | Phase 7 pattern already handles key derivation as `{userLogin}:{pathname}` |

---

## Common Pitfalls

### Pitfall 1: Forgetting to remove the `useSearchStore` instantiation line
**What goes wrong:** Removing only the import or only the `void searchStore` expression leaves either an unused variable or an unused import — TypeScript/ESLint will warn.
**How to avoid:** Remove all three: (1) the import on line 6, (2) the `const searchStore = useSearchStore()` on line 23, (3) the comment block + `void searchStore` on lines 54-57.

### Pitfall 2: `useAdminLog` test mock doesn't capture third argument
**What goes wrong:** The existing `vi.mock` for `getIssueComments` uses `vi.fn((_token, issueNumber) => ...)` — it accepts but ignores the third argument. After the source change, the test mock still resolves correctly, but no assertion verifies the third argument is passed.
**How to avoid:** Add `expect(vi.mocked(getIssueComments)).toHaveBeenCalledWith(token, issueNumber, login)` assertion in a new test, and ensure `setupTest()` sets `authStore.user.login`.

### Pitfall 3: Missing `user.login` in `useAdminLog.spec.ts` setupTest
**What goes wrong:** `authStore.user?.login ?? ''` evaluates to `''` in tests where `user` is not set, so the third argument assertion would pass `''` even before the fix if user is not configured.
**How to avoid:** In the new ETag-scoping test, explicitly `$patch({ user: { login: 'maintainer', avatarUrl: '' } })` in setup before asserting the call — matches the `useAdminActions.spec.ts` pattern.

### Pitfall 4: Assuming `['admin','log']` invalidation needs ETag clearing
**What goes wrong:** Adding `etagStore.clear(...)` alongside the invalidation would cause unnecessary cache busting on every moderation action.
**How to avoid:** Locked decision: do not clear ETags. GitHub comments endpoint returns updated data synchronously after the mutation's `postModerationComment` call completes.

---

## Code Examples

Verified from source — all patterns confirmed by reading actual files.

### Current `invalidateAdmin()` (lines 28-31, `useAdminActions.ts`)
```typescript
function invalidateAdmin() {
  void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
  void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
  // Missing: ['admin', 'log']
}
```

### Current `getIssueComments` call (line 51, `useAdminLog.ts`)
```typescript
getIssueComments(authStore.token!, issue.number)
// Missing: third arg authStore.user?.login ?? ''
```

### Dead expression block (lines 54-57, `useCreatePrompt.ts`)
```typescript
// Rebuild search index with new prompt included
// Note: search store will rebuild on next prompts query fetch
// For immediate update, invalidate and let TanStack refetch
void searchStore
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (installed, vitest.config.ts present) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run src/composables/queries/useAdminActions.spec.ts src/composables/queries/useAdminLog.spec.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| ADMN-08 | `invalidateAdmin()` invalidates `['admin','log']` on mutation success | unit | `npx vitest run src/composables/queries/useAdminActions.spec.ts` | Yes — extend existing test at line 134 |
| INFR-05 | `getIssueComments` called with `(token, issueNumber, userLogin)` in useAdminLog | unit | `npx vitest run src/composables/queries/useAdminLog.spec.ts` | Yes — add new test to existing file |
| CONT-01 | `useCreatePrompt.ts` compiles without unused import warning | compile/lint | `npx tsc --noEmit` | No test needed — deletion verified by absence |

### Sampling Rate
- **Per task commit:** `npx vitest run src/composables/queries/useAdminActions.spec.ts src/composables/queries/useAdminLog.spec.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. No new files needed; only extensions to existing spec files.

---

## Sources

### Primary (HIGH confidence)
- Direct file reads of `src/composables/queries/useAdminActions.ts` — confirmed `invalidateAdmin()` structure and 7-mutation pattern
- Direct file reads of `src/composables/queries/useAdminLog.ts` — confirmed `getIssueComments` call site at line 51
- Direct file reads of `src/composables/queries/useCreatePrompt.ts` — confirmed dead expression at line 57, orphaned import at line 6, orphaned instantiation at line 23
- Direct file reads of `src/lib/github/queries.ts:229-241` — confirmed `getIssueComments(token, issueNumber, userLogin='')` signature already exists
- Direct file reads of `src/composables/queries/useAdminActions.spec.ts` — confirmed spy pattern, existing invalidation assertion at line 141-142
- Direct file reads of `src/composables/queries/useAdminLog.spec.ts` — confirmed `vi.mock` setup for `getIssueComments`, confirmed `setupTest()` does not set `user.login`

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase 7 ETag decision: `STORAGE_KEY = etag-cache:{login}:`, `makeBoundFetch` derives cacheKey as `{userLogin}:{pathname}`, `userLogin=''` preserves backward compatibility
- `.planning/phases/08-fix-admin-search-tech-debt/08-CONTEXT.md` — all implementation decisions locked by user

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries already in use
- Architecture: HIGH — changes confirmed against actual source files
- Pitfalls: HIGH — identified from reading test setup gaps and locked constraints in CONTEXT.md

**Research date:** 2026-03-26
**Valid until:** Stable — source files are the authority; research is based on direct reads
