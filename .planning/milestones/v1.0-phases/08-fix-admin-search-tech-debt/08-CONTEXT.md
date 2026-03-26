# Phase 8: Fix Admin & Search Tech Debt - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Close three specific tech debt gaps from the v1.0 audit:
1. `invalidateAdmin()` in `useAdminActions.ts` doesn't include `['admin', 'log']` — moderation log goes stale after approve/hide/delete/feature actions
2. `getIssueComments()` in `useAdminLog.ts` called without `userLogin` — ETag cache not scoped per user (Phase 7 fixed this for labels; same pattern needed here)
3. `void searchStore` in `useCreatePrompt.ts` onSuccess — dead expression, does nothing; related import and comment block also dead

What is NOT in scope: new admin features, search behavior changes, UI changes.

</domain>

<decisions>
## Implementation Decisions

### Admin log invalidation
- Add `void queryClient.invalidateQueries({ queryKey: ['admin', 'log'] })` to `invalidateAdmin()` in `useAdminActions.ts`
- Applies to all 7 mutations: approve, hide, delete, feature, bulkApprove, bulkHide, bulkDelete
- Do NOT clear ETags on invalidation — GitHub processes comment creation synchronously; by the time TanStack Query refetches after mutation resolves, the new comment is already in the response; a 304 means the log genuinely hasn't changed
- Keep `staleTime: 60_000` in `useAdminLog.ts` — invalidation handles post-action freshness; staleTime prevents redundant refetches on tab focus

### ETag scoping in admin log
- Change `getIssueComments(authStore.token!, issue.number)` to `getIssueComments(authStore.token!, issue.number, authStore.user?.login ?? '')`
- Follows the same per-user scoping pattern established in Phase 7: `userLogin=''` default preserves backward compatibility for unauthenticated contexts

### Dead code removal in useCreatePrompt
- Remove `void searchStore` expression (line 57)
- Remove the surrounding comment block (the 3-line comment explaining the "intended" behavior)
- Remove the `useSearchStore` import — becomes orphaned after the expression is removed
- Rationale: `resetQueries({ queryKey: ['prompts'] })` already triggers a refetch; BrowseView's watcher calls `searchStore.buildIndex()` when new data arrives — no explicit rebuild call needed in the mutation
- Keep `draftStore.clear()` before `router.push()` — correct order, no change needed

### Test updates
- Update `useAdminActions.spec.ts` existing invalidation test to also assert: `expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'log'] })`
- Add test to `useAdminLog.spec.ts` (or create spec if missing) verifying `getIssueComments` is called with `(token, issueNumber, userLogin)` — covers INFR-05 ETag scoping in the log
- No test needed for dead code removal — it's a deletion with no behavior to assert

### Claude's Discretion
- Exact mock setup for the new `useAdminLog` test (spy pattern vs vi.mock)
- Whether to add the `useAdminLog` test to an existing spec file or create a new one

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAdminActions.ts:28`: `invalidateAdmin()` — add one line for `['admin', 'log']`
- `useAdminLog.ts:51`: `getIssueComments(authStore.token!, issue.number)` — add `authStore.user?.login ?? ''` as 3rd arg
- `useCreatePrompt.ts:23,57`: `useSearchStore` import + `void searchStore` expression — both removed
- `queries.ts:229-241`: `getIssueComments(token, issueNumber, userLogin='')` — 3rd param already exists, just not used in `useAdminLog`

### Established Patterns
- `invalidateAdmin()` pattern: `void queryClient.invalidateQueries({ queryKey: [...] })` — add one more line, same pattern
- `authStore.user?.login ?? ''` for userLogin default — matches Phase 7 pattern (`makeBoundFetch` defaults to `''`)
- Test spy pattern for `invalidateQueries`: `vi.spyOn(queryClient, 'invalidateQueries')` — existing test already uses this

### Integration Points
- `src/composables/queries/useAdminActions.ts:29-30`: add line 31 for log invalidation
- `src/composables/queries/useAdminLog.ts:51`: update `getIssueComments` call signature
- `src/composables/queries/useCreatePrompt.ts:6,23,55-57`: remove import + dead code block
- `src/composables/queries/useAdminActions.spec.ts:141-142`: extend existing invalidation assertions

</code_context>

<specifics>
## Specific Ideas

No specific UX references — all three changes are invisible to end users. The only observable effect:
- Admin log refreshes immediately after moderation actions (was: stale for 60s)
- Admin log REST calls benefit from per-user ETag caching (reduced rate-limit cost)
- `useCreatePrompt.ts` compiles without unused import warning

</specifics>

<deferred>
## Deferred Ideas

- **Installation & setup guide** — Create a detailed guide covering app installation, configuring properties/tags, and setting up a target GitHub repository for prompts-as-issues. User explicitly requested this; belongs in its own documentation/onboarding phase.

</deferred>

---

*Phase: 08-fix-admin-search-tech-debt*
*Context gathered: 2026-03-26*
