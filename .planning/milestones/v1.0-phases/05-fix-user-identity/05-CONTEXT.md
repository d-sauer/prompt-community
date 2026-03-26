# Phase 5: Fix User Identity & Profile Navigation - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Close three specific bugs left from prior phases: (1) `fetchCurrentUser` is a stub — `authStore.user` is always null after OAuth login; (2) `ProfileRedirectView` calls `router.replace()` synchronously before the async fetch resolves — always redirects to `/browse` even for authenticated users; (3) Navbar "Profile" `DropdownMenuItem` has no `@click` handler — clicking it does nothing.

Requirements in scope: USER-04 (own profile view), SHEL-01 cascade fix (⌘K command palette wiring depends on correct auth state).

What is NOT in scope: new profile features, notification improvements, any non-identity bug fixes.

</domain>

<decisions>
## Implementation Decisions

### ProfileRedirectView async strategy
- Use `watch` / `watchEffect` on `authStore.user` — show the existing "Redirecting..." spinner while user is null, redirect as soon as `user` is populated
- 5-second timeout: if `authStore.user` is still null after 5 seconds, redirect to `/browse` as fallback
- If user is **unauthenticated** (no token): do NOT redirect to `/browse` — instead show a blank profile page with a message prompting the user to log in ("You are not signed in — please log in to view your profile")
- Error handling delegation: if `fetchCurrentUser` fails, it will clear/update auth state and `ProfileRedirectView` reacts to that; no duplicate fallback needed in the view

### fetchCurrentUser implementation
- Implement using GitHub GraphQL `viewer` query — fields to fetch: `login`, `name`, `avatarUrl`, `bio`, `company`, `location`, `followers`, `following`, `publicRepos` (matches existing `GitHubUser` type exactly)
- On success: set `authStore.user` and also call `verifyMaintainerStatus(token)` to set `authStore.isMaintainer` — eager resolution rather than waiting for first `/admin` navigation
- On failure: **stay authenticated**, show a Sonner toast with message "Sign-in failed, please try again" — token remains valid but user object stays null
- One attempt only — no retry logic; keep auth flow simple

### Navbar Profile menu item
- Add `@click="router.push('/profile')"` to the Profile `DropdownMenuItem` — routes through `ProfileRedirectView` which already handles the watch+wait logic
- Menu item **always enabled** — no loading state on the menu item; the brief "Redirecting..." on `ProfileRedirectView` is acceptable

### Claude's Discretion
- Exact Vue `watch` vs `watchEffect` choice for the async redirect (either works — pick the cleaner pattern)
- GraphQL query string for `viewer` fields (structure up to Claude; all required fields are in `GitHubUser`)
- Exact Sonner toast styling and duration for the fetch-failure warning

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useAuthStore.ts` — already has `user`, `token`, `isMaintainer` refs + `fetchCurrentUser` stub ready to be implemented; `logout()` pattern established
- `ProfileRedirectView.vue` — exists at `src/views/ProfileRedirectView.vue`; currently calls `router.replace(target.value)` synchronously; needs reactivity fix
- `Navbar.vue` — `DropdownMenuItem` at line 156 has no `@click`; `router` and `authStore` already imported
- `vue-sonner` — `import { toast } from 'vue-sonner'` pattern established in Phase 4 (used in PromptActions)
- `createGraphqlClient` in `src/lib/github/octokit.ts` — used by all query composables
- `verifyMaintainerStatus` in `src/lib/github/auth.ts` — already exports a working function that accepts `token: string | null`

### Established Patterns
- All GraphQL queries use `createGraphqlClient(authStore.token ?? undefined)` + a typed query constant from `src/lib/github/queries.ts`
- `GitHubUser` type in `src/types/index.ts` already defines all fields: `login`, `name`, `avatarUrl`, `bio`, `company`, `location`, `followers`, `following`, `publicRepos`
- Pinia stores use `defineStore` with setup function pattern

### Integration Points
- `useAuthStore.login()` already calls `fetchCurrentUser(token)` after receiving token — just needs the stub filled in
- `/profile` route registered in `src/router/index.ts` — mapped to `ProfileRedirectView`
- Sonner toast: `import { toast } from 'vue-sonner'` — consistent with Phase 4 pattern

</code_context>

<specifics>
## Specific Ideas

- ProfileRedirectView unauthenticated state: show a message ("You are not signed in — please log in to view your profile") rather than redirecting to /browse. This gives the user a clear action instead of a silent redirect.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-fix-user-identity*
*Context gathered: 2026-03-26*
