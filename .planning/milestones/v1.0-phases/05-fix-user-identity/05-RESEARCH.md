# Phase 5: Fix User Identity & Profile Navigation - Research

**Researched:** 2026-03-26
**Domain:** Vue 3 Pinia store async patterns, GitHub GraphQL viewer query, Vue Router reactivity
**Confidence:** HIGH

## Summary

This phase closes three isolated bugs that were deferred during v1.0: (1) `fetchCurrentUser` is a stub in `useAuthStore` — `authStore.user` is always null after OAuth; (2) `ProfileRedirectView` calls `router.replace()` synchronously before the async fetch resolves — always falls to the `/browse` fallback; (3) Navbar "Profile" `DropdownMenuItem` has no `@click` handler. All fixes touch existing files only — no new routes, no new views, no new composables are required.

The three changes are tightly coupled. Once `fetchCurrentUser` populates `authStore.user` reactively, the `ProfileRedirectView` `watch` pattern will correctly react and redirect; the Navbar fix makes the Profile entry point functional. Fixing (1) without (2) leaves users stuck on "Redirecting..."; fixing (2) without (1) redirects to `/browse` on every visit. All three must ship together in a single plan.

The GraphQL `viewer` query maps exactly to the existing `GitHubUser` type — no type changes are required. The `verifyMaintainerStatus` import from `src/lib/github/auth.ts` already exists and accepts `string | null`. The Sonner toast import pattern (`import { toast } from 'vue-sonner'`) is already established in Phase 4.

**Primary recommendation:** Implement all three fixes in a single plan (05-01-PLAN.md): add `GET_VIEWER` query constant to `queries.ts`, fill in `fetchCurrentUser` in `useAuthStore`, convert `ProfileRedirectView` from synchronous redirect to `watch`-based async redirect with 5-second timeout and unauthenticated message, add `@click="router.push('/profile')"` to the Navbar `DropdownMenuItem`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**ProfileRedirectView async strategy**
- Use `watch` / `watchEffect` on `authStore.user` — show the existing "Redirecting..." spinner while user is null, redirect as soon as `user` is populated
- 5-second timeout: if `authStore.user` is still null after 5 seconds, redirect to `/browse` as fallback
- If user is **unauthenticated** (no token): do NOT redirect to `/browse` — instead show a blank profile page with a message prompting the user to log in ("You are not signed in — please log in to view your profile")
- Error handling delegation: if `fetchCurrentUser` fails, it will clear/update auth state and `ProfileRedirectView` reacts to that; no duplicate fallback needed in the view

**fetchCurrentUser implementation**
- Implement using GitHub GraphQL `viewer` query — fields to fetch: `login`, `name`, `avatarUrl`, `bio`, `company`, `location`, `followers`, `following`, `publicRepos` (matches existing `GitHubUser` type exactly)
- On success: set `authStore.user` and also call `verifyMaintainerStatus(token)` to set `authStore.isMaintainer` — eager resolution rather than waiting for first `/admin` navigation
- On failure: **stay authenticated**, show a Sonner toast with message "Sign-in failed, please try again" — token remains valid but user object stays null
- One attempt only — no retry logic; keep auth flow simple

**Navbar Profile menu item**
- Add `@click="router.push('/profile')"` to the Profile `DropdownMenuItem` — routes through `ProfileRedirectView` which already handles the watch+wait logic
- Menu item **always enabled** — no loading state on the menu item; the brief "Redirecting..." on `ProfileRedirectView` is acceptable

### Claude's Discretion
- Exact Vue `watch` vs `watchEffect` choice for the async redirect (either works — pick the cleaner pattern)
- GraphQL query string for `viewer` fields (structure up to Claude; all required fields are in `GitHubUser`)
- Exact Sonner toast styling and duration for the fetch-failure warning

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| USER-04 | Authenticated user can view their own profile with submitted prompts, saved prompts, and activity tabs | Requires `authStore.user` to be non-null after login; `ProfileRedirectView` must redirect to `user-profile` route; `fetchCurrentUser` stub must be replaced with live GraphQL query |
| SHEL-01 | Any user can invoke global search from any screen using ⌘K keyboard shortcut | Cascade fix: `useUIStore.commandPaletteOpen` is already wired to the Navbar CommandDialog; correct auth state from `fetchCurrentUser` unblocks full command palette behaviour; no direct code change to SHEL-01 wiring in this phase |
</phase_requirements>

---

## Standard Stack

### Core (all already installed — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@octokit/graphql` | existing | GitHub GraphQL client | Already used by all query composables via `createGraphqlClient` |
| `pinia` | existing | Auth store (`useAuthStore`) | Established store pattern — setup function style |
| `vue` (`watch`) | existing | Reactive async redirect | Built-in; no external dep needed |
| `vue-router` | existing | `router.push('/profile')` | Already imported in Navbar |
| `vue-sonner` | existing | Toast on fetch failure | Phase 4 pattern: `import { toast } from 'vue-sonner'` |

### No new installations required

All libraries are already in `package.json`. This phase is purely implementation of stubs and bug fixes using existing infrastructure.

## Architecture Patterns

### Existing Pattern: GraphQL Query via `createGraphqlClient`

Every query composable in the project follows the same pattern. The `viewer` query follows the same form:

```typescript
// Source: src/lib/github/queries.ts (existing pattern reference)
export const GET_VIEWER = `
  query GetViewer {
    viewer {
      login
      name
      avatarUrl
      bio
      company
      location
      followers { totalCount }
      following { totalCount }
      repositories(privacy: PUBLIC) { totalCount }
    }
  }
`
```

Note: `followers` and `following` are connection types in GitHub GraphQL v4 — they return `{ totalCount }` not bare integers. The existing `GitHubUser` type uses `followers: number` and `following: number`, so the composable must extract `followers.totalCount`. Similarly `publicRepos` maps to `repositories(privacy: PUBLIC).totalCount`. Verify exact field names against GitHub GraphQL schema — see Sources section.

### Existing Pattern: `fetchCurrentUser` in `useAuthStore`

The stub is at `src/stores/useAuthStore.ts` line 54. The login flow already calls `void fetchCurrentUser(event.data.token)` at line 41 — the stub just needs filling in:

```typescript
// Pattern: mirrors verifyMaintainerStatus structure in src/lib/github/auth.ts
async function fetchCurrentUser(token: string): Promise<void> {
  try {
    const client = createGraphqlClient(token)
    const data = await client<{ viewer: ... }>(GET_VIEWER)
    user.value = {
      login: data.viewer.login,
      name: data.viewer.name,
      avatarUrl: data.viewer.avatarUrl,
      bio: data.viewer.bio,
      company: data.viewer.company,
      location: data.viewer.location,
      followers: data.viewer.followers.totalCount,
      following: data.viewer.following.totalCount,
      publicRepos: data.viewer.repositories.totalCount,
    }
    isMaintainer.value = await verifyMaintainerStatus(token)
  } catch {
    toast.error('Sign-in failed, please try again')
    // token stays set; user stays null; isMaintainer stays false
  }
}
```

Import `createGraphqlClient` from `@/lib/github/octokit`, `GET_VIEWER` from `@/lib/github/queries`, `verifyMaintainerStatus` from `@/lib/github/auth`, and `toast` from `vue-sonner`.

### Existing Pattern: `watch` for Reactive Redirect in `ProfileRedirectView`

The current synchronous redirect at line 16 of `ProfileRedirectView.vue` (`router.replace(target.value)`) runs before `fetchCurrentUser` resolves. The fix uses `watch` (preferred over `watchEffect` here because the trigger is a single explicit dependency — `authStore.user`):

```typescript
// Pattern: watch with timeout cleanup
import { watch, onUnmounted } from 'vue'

const authStore = useAuthStore()
const router = useRouter()

// Unauthenticated: show message, don't redirect
// Authenticated but user not yet loaded: show spinner, wait
// Authenticated and user loaded: redirect immediately

const showNotSignedIn = computed(() => !authStore.isAuthenticated)

let timeoutId: ReturnType<typeof setTimeout> | null = null

if (authStore.isAuthenticated) {
  if (authStore.user?.login) {
    // Already loaded (e.g., navigated back)
    void router.replace({ name: 'user-profile', params: { login: authStore.user.login } })
  } else {
    // Wait for fetchCurrentUser to complete
    timeoutId = setTimeout(() => {
      void router.replace('/browse')
    }, 5000)

    const stop = watch(
      () => authStore.user,
      (newUser) => {
        if (newUser?.login) {
          if (timeoutId) clearTimeout(timeoutId)
          stop()
          void router.replace({ name: 'user-profile', params: { login: newUser.login } })
        }
      },
    )

    onUnmounted(() => {
      if (timeoutId) clearTimeout(timeoutId)
      stop()
    })
  }
}
```

Note: `onUnmounted` cleanup prevents the timeout from firing after the component is already unmounted (e.g., user navigated away during the 5-second window).

### Navbar Fix Pattern

Navbar already imports `router` via `useRouter()` (line 24). Add `@click` to the Profile `DropdownMenuItem` at line 156:

```html
<!-- Before (line 156): -->
<DropdownMenuItem class="hover:bg-[#1a1a27] cursor-pointer">
  Profile
</DropdownMenuItem>

<!-- After: -->
<DropdownMenuItem
  class="hover:bg-[#1a1a27] cursor-pointer"
  @click="router.push('/profile')"
>
  Profile
</DropdownMenuItem>
```

### Anti-Patterns to Avoid

- **Synchronous redirect before async resolves:** The original `router.replace(target.value)` at script setup top-level runs before `fetchCurrentUser` completes — always sees `user === null`. Do not use `computed` + immediate redirect for async-dependent routing.
- **Duplicate error handling in `ProfileRedirectView`:** The view reacts to `authStore.user` state changes; it must not duplicate the toast or error logic from `fetchCurrentUser`. The 5-second timeout IS the only fallback — no additional error checking in the view.
- **`watchEffect` for this pattern:** `watchEffect` would run immediately and also track every dependency accessed inside the callback, which could introduce unintended reactivity. `watch` with explicit `() => authStore.user` is cleaner.
- **`router.push` instead of `router.replace` in `ProfileRedirectView`:** Use `replace` not `push` to avoid adding `/profile` to the browser history stack (pressing Back should not return to the spinner).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GraphQL viewer query | Custom fetch with REST | `createGraphqlClient` + `GET_VIEWER` query | Consistent with all 6+ existing query composables; handles auth header automatically |
| Toast notification | Custom error div in store | `toast.error()` from `vue-sonner` | Already installed and used in Phase 4; global positioning/animation handled |
| Maintainer check after user fetch | Duplicate REST call in `fetchCurrentUser` | `verifyMaintainerStatus(token)` | Already exists, tested, and handles all error cases |
| Timeout cleanup | Manual `clearTimeout` without `onUnmounted` | `onUnmounted` hook + stored timeout ID | Without cleanup, timeout fires on unmounted component, causing navigation after user has already left |

## Common Pitfalls

### Pitfall 1: GitHub GraphQL `viewer.followers` is a connection, not an integer

**What goes wrong:** Writing `viewer { followers }` returns an error — `followers` is `FollowerConnection` not `Int`.
**Why it happens:** GitHub GraphQL v4 models followers/following as connections. The existing REST-based `GET /user` returns `followers` as an integer, but GraphQL is different.
**How to avoid:** Use `followers { totalCount }` and `following { totalCount }` in the GraphQL query, then extract `.totalCount` when mapping to `GitHubUser`.
**Warning signs:** GraphQL error "Field 'followers' of type 'FollowerConnection' must have a selection of subfields."

### Pitfall 2: `publicRepos` — field name in GraphQL is `repositories`, not `publicRepos`

**What goes wrong:** `viewer { publicRepos }` returns a GraphQL error — the field does not exist by that name.
**Why it happens:** GitHub GraphQL uses `repositories` (a connection). `publicRepos` is the REST API JSON field name.
**How to avoid:** Use `repositories(privacy: PUBLIC) { totalCount }` in the query, then map to `GitHubUser.publicRepos`.
**Warning signs:** GraphQL error "Cannot query field 'publicRepos' on type 'User'."

### Pitfall 3: Component unmounts before 5-second timeout fires

**What goes wrong:** If the user navigates away from `/profile` within 5 seconds, the timeout fires on an unmounted component and calls `router.replace('/browse')`, navigating the user unexpectedly.
**Why it happens:** `setTimeout` callbacks are not tied to Vue component lifecycle.
**How to avoid:** Store the timeout ID and call `clearTimeout` in `onUnmounted`. Also stop the `watch` in `onUnmounted`.
**Warning signs:** Console warning "Routing was aborted" or unexpected navigation to `/browse` after the user has navigated elsewhere.

### Pitfall 4: `router.replace` inside `watch` callback requires `void` prefix

**What goes wrong:** TypeScript error "Promise returned from router.replace is ignored" or unhandled rejections in test environments.
**Why it happens:** `router.replace` returns a `Promise<NavigationFailure | void | undefined>`.
**How to avoid:** Prefix with `void router.replace(...)` — consistent with `void fetchCurrentUser(...)` already used in `useAuthStore.login()`.

### Pitfall 5: `fetchCurrentUser` must import `verifyMaintainerStatus` without circular import

**What goes wrong:** `useAuthStore.ts` importing from `@/lib/github/auth.ts` which indirectly imports from a module that imports the store — circular dependency.
**Why it happens:** `auth.ts` imports from `octokit.ts` only — no circular risk. But `queries.ts` now has a mixed export (GraphQL strings + REST functions). Keep `GET_VIEWER` import from `queries.ts` — it's just a string constant; no circular risk.
**How to avoid:** Check import chain: `useAuthStore` → `@/lib/github/auth` → `@/lib/github/octokit` (no store imports). Safe.

### Pitfall 6: `toast` imported in a Pinia store — requires Sonner to be mounted

**What goes wrong:** Toast called from `fetchCurrentUser` before `<Toaster />` component is mounted (e.g., in tests).
**Why it happens:** `vue-sonner`'s `toast()` function queues toasts but they only render if `<Toaster />` is in the component tree.
**How to avoid:** In tests, mock `vue-sonner` with `vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))`. In production, `<Toaster />` is already mounted via `App.vue` (Phase 4 established this).

## Code Examples

### GET_VIEWER query constant (add to `src/lib/github/queries.ts`)

```typescript
// Source: GitHub GraphQL API v4 schema — https://docs.github.com/en/graphql/reference/objects#user
export const GET_VIEWER = `
  query GetViewer {
    viewer {
      login
      name
      avatarUrl
      bio
      company
      location
      followers { totalCount }
      following { totalCount }
      repositories(privacy: PUBLIC) { totalCount }
    }
  }
`
```

### ProfileRedirectView — complete replacement pattern

```typescript
// Pattern: watch with timeout + onUnmounted cleanup
import { computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const showNotSignedIn = computed(() => !authStore.isAuthenticated)

let timeoutId: ReturnType<typeof setTimeout> | null = null
let stopWatch: (() => void) | null = null

if (authStore.isAuthenticated) {
  if (authStore.user?.login) {
    void router.replace({ name: 'user-profile', params: { login: authStore.user.login } })
  } else {
    timeoutId = setTimeout(() => {
      void router.replace('/browse')
    }, 5000)

    stopWatch = watch(
      () => authStore.user,
      (newUser) => {
        if (newUser?.login) {
          if (timeoutId) clearTimeout(timeoutId)
          stopWatch?.()
          void router.replace({ name: 'user-profile', params: { login: newUser.login } })
        }
      },
    )
  }
}

onUnmounted(() => {
  if (timeoutId) clearTimeout(timeoutId)
  stopWatch?.()
})
```

Template adds the unauthenticated message:

```html
<template>
  <div class="flex items-center justify-center h-full text-sm text-white/40">
    <template v-if="showNotSignedIn">
      You are not signed in — please log in to view your profile
    </template>
    <template v-else>
      Redirecting...
    </template>
  </div>
</template>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous redirect at script setup top-level | `watch` with timeout + `onUnmounted` cleanup | This phase | Allows async fetch to resolve before deciding redirect target |
| `fetchCurrentUser` stub (always null) | Live GitHub GraphQL `viewer` query | This phase | `authStore.user` populated after OAuth login |
| Profile `DropdownMenuItem` with no handler | `@click="router.push('/profile')"` | This phase | Profile menu item navigates |

**Deprecated/outdated:**
- `router.replace(target.value)` at script setup top-level in `ProfileRedirectView`: replaced by reactive `watch` pattern
- `fetchCurrentUser` stub body with `// TODO Phase 2` comment: replaced by real implementation

## Open Questions

1. **GitHub GraphQL `repositories` with `privacy: PUBLIC` filter**
   - What we know: `repositories` is a `RepositoryConnection`; `privacy` enum exists (`PUBLIC`, `PRIVATE`)
   - What's unclear: whether `privacy: PUBLIC` requires additional OAuth scopes beyond the standard `read:user` scope that OAuth App grants
   - Recommendation: Use `repositories(privacy: PUBLIC) { totalCount }` — if scope is insufficient at runtime, fall back to `repositories { totalCount }` (counts all repos including private). Since this is an internal tool where users authenticate with their own tokens, `read:user` scope typically includes public repo count. Flag for manual verification during implementation.

2. **`watch` immediate option**
   - What we know: `watch` with `immediate: false` (default) won't fire if `authStore.user` is already populated at mount time
   - What's unclear: edge case where user revisits `/profile` after `user` is already set — the `if (authStore.user?.login)` early-exit branch handles this, but it runs in script setup (sync), so `router.replace` is called synchronously — this is intentional and safe since the data is already available
   - Recommendation: Keep the early-exit branch explicitly; document the intent.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (globals: true, jsdom environment) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/stores/useAuthStore.spec.ts src/views/ProfileRedirectView.spec.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| USER-04 | `fetchCurrentUser` populates `authStore.user` from GraphQL viewer response | unit | `npx vitest run src/stores/useAuthStore.spec.ts -t "fetchCurrentUser"` | ❌ Wave 0 — extend existing spec |
| USER-04 | `fetchCurrentUser` failure shows toast, keeps token set, user stays null | unit | `npx vitest run src/stores/useAuthStore.spec.ts -t "fetchCurrentUser"` | ❌ Wave 0 |
| USER-04 | `fetchCurrentUser` calls `verifyMaintainerStatus` on success | unit | `npx vitest run src/stores/useAuthStore.spec.ts -t "fetchCurrentUser"` | ❌ Wave 0 |
| USER-04 | `ProfileRedirectView` redirects to `user-profile` when `authStore.user` is set | unit | `npx vitest run src/views/ProfileRedirectView.spec.ts` | ❌ Wave 0 — new file |
| USER-04 | `ProfileRedirectView` shows unauthenticated message when not signed in | unit | `npx vitest run src/views/ProfileRedirectView.spec.ts` | ❌ Wave 0 |
| USER-04 | `ProfileRedirectView` redirects to `/browse` after 5-second timeout | unit | `npx vitest run src/views/ProfileRedirectView.spec.ts` | ❌ Wave 0 |
| SHEL-01 | Navbar Profile `DropdownMenuItem` has `@click` handler that navigates to `/profile` | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ❌ Wave 0 — new file |

### Sampling Rate

- **Per task commit:** `npx vitest run src/stores/useAuthStore.spec.ts src/views/ProfileRedirectView.spec.ts src/components/layout/Navbar.spec.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/views/ProfileRedirectView.spec.ts` — covers USER-04 redirect and unauthenticated message and 5s timeout
- [ ] `src/components/layout/Navbar.spec.ts` — covers SHEL-01 (Profile `@click` handler)
- [ ] Extend `src/stores/useAuthStore.spec.ts` — add `fetchCurrentUser` test cases (USER-04)

Note: `src/test/setup.ts` and `vitest.config.ts` already exist and cover all mocking infrastructure needed (`vi.stubGlobal`, localStorage spy, `crypto.randomUUID`). No framework install needed.

## Sources

### Primary (HIGH confidence)

- Source code inspection — `src/stores/useAuthStore.ts`: confirmed stub at line 54, `login()` calls `void fetchCurrentUser(...)` at line 41
- Source code inspection — `src/views/ProfileRedirectView.vue`: confirmed synchronous `router.replace(target.value)` at line 16
- Source code inspection — `src/components/layout/Navbar.vue` line 156: confirmed missing `@click` on Profile `DropdownMenuItem`; `router` already available via `useRouter()` at line 24
- Source code inspection — `src/lib/github/queries.ts`: confirmed all other queries use string constants + `createGraphqlClient` pattern
- Source code inspection — `src/types/index.ts`: confirmed `GitHubUser` interface with exact 9 fields
- Source code inspection — `src/lib/github/auth.ts`: confirmed `verifyMaintainerStatus(token: string | null): Promise<boolean>` signature
- Source code inspection — `src/lib/github/octokit.ts`: confirmed `createGraphqlClient(token?: string)` signature
- Source code inspection — `vitest.config.ts` + `src/test/setup.ts`: confirmed test infrastructure exists

### Secondary (MEDIUM confidence)

- GitHub GraphQL v4 API Reference — https://docs.github.com/en/graphql/reference/objects#user — `viewer` query fields, `followers`/`following` as connections, `repositories` connection with `privacy` filter

### Tertiary (LOW confidence)

- OAuth App scope for `repositories(privacy: PUBLIC)` — not directly verified; standard GitHub OAuth App with `read:user` scope is expected to allow public repo count; flag for runtime verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed present in source code
- Architecture: HIGH — all three bugs confirmed by direct source inspection; fix patterns derived from existing codebase conventions
- Pitfalls: HIGH (GraphQL field names) / MEDIUM (scope question for `repositories`) — GraphQL connection type pitfall verified against GitHub docs

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable domain; GitHub GraphQL schema changes rarely)
