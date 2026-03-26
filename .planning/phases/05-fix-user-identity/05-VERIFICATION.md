---
phase: 05-fix-user-identity
verified: 2026-03-26T11:40:00Z
status: human_needed
score: 8/8 must-haves verified
re_verification: false
human_verification:
  - test: "After GitHub OAuth login completes, open Vue DevTools Pinia panel and confirm authStore.user.login is non-null and all 9 fields are populated"
    expected: "authStore.user shows login, name, avatarUrl, bio, company, location, followers, following, publicRepos with real GitHub values"
    why_human: "GraphQL call to live GitHub API cannot be exercised programmatically in this verification pass"
  - test: "While authenticated, click the Profile item in the Navbar user dropdown and observe navigation"
    expected: "/profile loads briefly (Redirecting...) then immediately transitions to /users/:login for the signed-in user"
    why_human: "Real routing interaction with live auth state requires browser execution"
  - test: "Navigate directly to /profile while not authenticated"
    expected: "Page renders the text 'You are not signed in — please log in to view your profile' with no redirect"
    why_human: "Requires browser render to confirm the unauthenticated message is visible to the end user"
---

# Phase 5: Fix User Identity — Verification Report

**Phase Goal:** authStore.user is populated after OAuth login; /profile redirects correctly; Navbar Profile menu item navigates
**Verified:** 2026-03-26T11:40:00Z
**Status:** human_needed (all automated checks pass; 3 behavioral items require browser confirmation)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | authStore.user populated with all 9 fields after OAuth login | VERIFIED | `fetchCurrentUser` maps GraphQL `viewer` data to all `GitHubUser` fields; Test A passes |
| 2 | authStore.isMaintainer set eagerly via verifyMaintainerStatus after fetchCurrentUser | VERIFIED | Line 84 of `useAuthStore.ts`: `isMaintainer.value = await verifyMaintainerStatus(token)`; Test B passes |
| 3 | On fetchCurrentUser failure: toast appears, token kept, user stays null | VERIFIED | Lines 85-88 of `useAuthStore.ts`; Test C passes |
| 4 | /profile when authenticated with user loaded redirects immediately to /users/:login | VERIFIED | Lines 15-17 of `ProfileRedirectView.vue`; Test E passes |
| 5 | /profile when authenticated but user null shows "Redirecting..." then redirects when user populates | VERIFIED | Lines 18-33 of `ProfileRedirectView.vue`; Tests F passes |
| 6 | /profile redirects to /browse after 5-second timeout if user never resolves | VERIFIED | Lines 20-22 of `ProfileRedirectView.vue`; Test G passes |
| 7 | /profile when unauthenticated shows "You are not signed in" with no redirect | VERIFIED | Lines 46-48 of `ProfileRedirectView.vue` template; Test D passes |
| 8 | Clicking Profile in Navbar dropdown navigates to /profile | VERIFIED | Line 158 of `Navbar.vue`: `@click="router.push('/profile')"`; Test H passes |

**Score:** 8/8 truths verified

**Test suite result:** 20/20 tests pass across 3 spec files (confirmed by `npx vitest run` execution)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/github/queries.ts` | GET_VIEWER GraphQL query constant | VERIFIED | Lines 174-188; includes `followers { totalCount }`, `following { totalCount }`, `repositories(privacy: PUBLIC) { totalCount }` with correct connection shape |
| `src/stores/useAuthStore.ts` | fetchCurrentUser live implementation | VERIFIED | Lines 57-89; calls `createGraphqlClient`, maps all 9 fields, calls `verifyMaintainerStatus`, handles error with toast |
| `src/views/ProfileRedirectView.vue` | Async watch-based redirect with unauthenticated message | VERIFIED | Lines 24-33; `watch(() => authStore.user, ...)` present; `onUnmounted` cleanup at lines 37-41 |
| `src/components/layout/Navbar.vue` | Profile DropdownMenuItem with @click handler | VERIFIED | Lines 156-161; `@click="router.push('/profile')"` wired |
| `src/stores/useAuthStore.spec.ts` | fetchCurrentUser describe block (Tests A, B, C) | VERIFIED | Lines 197-269; 3 tests cover success mapping, verifyMaintainerStatus call, and error handling |
| `src/views/ProfileRedirectView.spec.ts` | New spec file (Tests D, E, F, G) | VERIFIED | 144-line file; all 4 redirect behaviours covered |
| `src/components/layout/Navbar.spec.ts` | New spec file (Tests H, I) | VERIFIED | 113-line file; Profile render and click navigation covered with reka-ui stubs |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useAuthStore.ts fetchCurrentUser` | `queries.ts GET_VIEWER` | `import { GET_VIEWER }` and passed to `client()` | WIRED | Line 5 imports `GET_VIEWER`; line 72 passes it as the query argument |
| `useAuthStore.ts fetchCurrentUser` | `auth.ts verifyMaintainerStatus` | `isMaintainer.value = await verifyMaintainerStatus(token)` | WIRED | Line 6 imports `verifyMaintainerStatus`; line 84 calls it |
| `ProfileRedirectView.vue` | `authStore.user` | `watch(() => authStore.user, ...)` | WIRED | Lines 24-33; watch reacts to user becoming non-null and fires `router.replace` |
| `Navbar.vue DropdownMenuItem` | `router.push('/profile')` | `@click` handler | WIRED | Line 158; `@click="router.push('/profile')"` on the Profile item |

All 4 key links wired.

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| USER-04 | 05-01-PLAN.md | Authenticated user can view own profile with submitted prompts, saved prompts, and activity tabs | SATISFIED | authStore.user is now populated after OAuth login; /profile redirects to /users/:login which was implemented in Phase 3 (Phase 5 closes the prerequisite gap that kept this broken) |
| SHEL-01 | 05-01-PLAN.md | Any user can invoke global search from any screen using ⌘K keyboard shortcut | PARTIAL — UNBLOCKING ONLY | The ⌘K shortcut itself (`useKeyboardShortcuts.ts`, `AppLayout.vue`, `Navbar.vue` CommandDialog) was implemented in Phase 1. REQUIREMENTS.md traceability assigns SHEL-01 completion to Phase 6. Phase 5 provides the prerequisite: correct `authStore.user` and `authStore.isMaintainer` state after login, which Phase 6 needs for auth-aware command palette behavior. The 05-01-PLAN.md `requirements` field claiming SHEL-01 is an overreach — Phase 5 unblocks SHEL-01, not fulfills it. |

### SHEL-01 Traceability Discrepancy

The PLAN's `requirements` frontmatter lists `SHEL-01`, but `REQUIREMENTS.md` traceability assigns `SHEL-01 | Phase 6 | Pending`. The plan objective text correctly describes the relationship: Phase 5 provides "auth-state-dependent command palette behavior to unblock." Phase 5 does not complete SHEL-01 on its own — it resolves the prerequisite (non-null `authStore.user`/`isMaintainer`) that Phase 6 will build on. No action needed: SHEL-01 should remain mapped to Phase 6 in REQUIREMENTS.md.

---

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| None found | — | — | — |

Scan of all 7 modified/created files found no TODO/FIXME/placeholder comments, no empty implementations, no stub return values. The old stub comment `// TODO Phase 2: query GitHub GraphQL API for viewer { ... }` has been replaced by live implementation.

---

## Human Verification Required

### 1. authStore.user population after live OAuth login

**Test:** Complete a full GitHub OAuth login in a running dev environment. After the popup closes and the postMessage fires, open Vue DevTools Pinia panel and inspect the `auth` store.
**Expected:** `authStore.user` is an object with non-null `login`, `avatarUrl`, and correct integer values for `followers`, `following`, `publicRepos`. `authStore.isMaintainer` is `true` if the logged-in user is a maintainer, `false` otherwise.
**Why human:** The GraphQL query to `https://api.github.com/graphql` requires a real OAuth token. This cannot be exercised without a live browser session.

### 2. Navbar Profile click full navigation flow

**Test:** While authenticated, click the avatar in the Navbar to open the dropdown. Click "Profile".
**Expected:** Browser navigates to `/profile`, which shows "Redirecting..." for at most a moment, then transitions to `/users/:login` where `:login` is the authenticated user's GitHub login.
**Why human:** Requires real router navigation with live Pinia state in a browser.

### 3. Unauthenticated /profile visit

**Test:** While not logged in, navigate directly to `/profile` (or type it in the address bar).
**Expected:** Page renders "You are not signed in — please log in to view your profile" and stays on `/profile` — no redirect to `/browse`.
**Why human:** Requires visual confirmation in browser that the message renders and no unwanted redirect occurs.

---

## Commits Verified

| Hash | Message |
|------|---------|
| `13dd260` | test(05-01): add failing specs for fetchCurrentUser, ProfileRedirectView, Navbar Profile click |
| `dfa1fdb` | feat(05-01): implement fetchCurrentUser GraphQL viewer, fix ProfileRedirectView async redirect, wire Navbar Profile click |

Both commits confirmed present in git log.

---

## Summary

Phase 5 goal is achieved programmatically. All three bugs are closed:

1. **fetchCurrentUser stub replaced** — `useAuthStore.ts` now calls the GitHub GraphQL `viewer` query via `createGraphqlClient`, maps all 9 `GitHubUser` fields with correct connection totalCount shape, and calls `verifyMaintainerStatus` eagerly on success.

2. **ProfileRedirectView rewritten** — synchronous `router.replace()` in setup (which fired before the async fetch resolved) replaced with a `watch()` + `setTimeout` pattern. All four redirect cases (unauthenticated message, immediate redirect, watch-based redirect, 5-second fallback) are implemented and tested.

3. **Navbar Profile click wired** — `@click="router.push('/profile')"` added to the Profile `DropdownMenuItem`.

20/20 tests pass. No regressions. Three browser-only behavioral items are flagged for human confirmation before the phase can be marked fully complete.

---

_Verified: 2026-03-26T11:40:00Z_
_Verifier: Claude (gsd-verifier)_
