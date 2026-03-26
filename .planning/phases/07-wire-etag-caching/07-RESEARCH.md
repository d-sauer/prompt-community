# Phase 7: Wire ETag Caching - Research

**Researched:** 2026-03-26
**Domain:** HTTP ETag conditional requests via Octokit fetch adapter + localStorage persistence
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- ETags stored in **localStorage** (not in-memory Map only) so conditional requests activate immediately on return visits — no full fetch needed after a page reload
- Cache is **scoped per GitHub login** — localStorage key includes the user's login (e.g., `etag:davor:/repos/owner/repo/labels`) so different accounts on the same browser have isolated caches
- **Cap at 50 entries** — LRU eviction or simple size cap. At ~100 bytes per entry this is ~5KB; prevents unbounded growth over many browsing sessions
- Apply ETag caching to **REST API reads only** (via `createRestClient`) — labels list and issue comments
- GraphQL reads rely on TanStack Query `staleTime` for freshness — GitHub's GraphQL endpoint is a POST and ETags are not reliable there
- Future REST calls added through `createRestClient` automatically benefit with no additional wiring
- **Label mutations clear the labels ETag**: `addLabel`, `updateLabel`, `deleteLabel` call `clearEtag` for the labels REST endpoint after completing
- **Sign-out clears all ETags**: when the user signs out, all entries in their user-scoped ETag localStorage prefix are cleared

### Claude's Discretion
- Exact localStorage key format and prefix scheme
- LRU implementation details for the 50-entry cap
- Whether to update `etag.ts` in place or create a new `etagStorage.ts` module
- How to pass user login into the key scheme (from authStore or as a parameter)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFR-05 | ETag conditional requests used for all cacheable GitHub API reads (304 responses = zero rate limit cost) | Octokit `request.fetch` constructor option is the correct injection point; `etagFetchWrapper` already implements If-None-Match header injection and ETag capture; localStorage persistence makes 304 responses activate on return visits |
</phase_requirements>

---

## Summary

Phase 7 is a focused infrastructure wiring task. The core ETag mechanics (`etagFetchWrapper`, `getEtag`, `setEtag`, `clearEtag`) are already implemented in `src/lib/github/etag.ts` — they just use an in-memory `Map` that resets on page reload. The work breaks into three parts: (1) replace the in-memory Map with a localStorage-backed store scoped per GitHub login with a 50-entry cap, (2) wire `etagFetchWrapper` into `createRestClient` as Octokit's fetch adapter so all REST GET calls automatically send If-None-Match headers, and (3) add `clearEtag` calls to label mutations and sign-out to prevent stale cached data.

The Octokit `@octokit/core` v7 constructor accepts `{ request: { fetch: myFetch } }` to override the underlying fetch function globally. This is the correct injection point — every REST request made through the Octokit instance will pass through the custom fetch, without requiring changes to any call site. The existing `etagFetchWrapper` signature `(url, options, cacheKey)` does not match the `(url, options) => Promise<Response>` adapter shape, so it needs to be adapted: a bound wrapper that derives the cache key from the URL is the natural approach.

The design constraint of scoping ETags per GitHub login raises a dependency ordering question: `createRestClient` currently takes only a `token` parameter, but the user login must come from `useAuthStore`. The login must be threaded into the factory — either as a second parameter to `createRestClient`, or by reading it from the authStore inside the adapter closure. Since authStore is a Pinia singleton accessible anywhere, reading it inside the adapter is clean and avoids API surface changes.

**Primary recommendation:** Update `etag.ts` in place to replace the Map with a localStorage-backed 50-entry LRU store. Wire `etagFetchWrapper` as Octokit's fetch adapter in `createRestClient` via a URL-keyed closure wrapper. Add `clearEtag` to label mutation `onSuccess` callbacks and sign-out.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@octokit/core` | ^7.0.6 (installed) | REST client with custom fetch adapter | Already used; `request.fetch` constructor option is the official injection point |
| Browser `localStorage` | N/A | Persist ETag cache across page reloads | Already used in this project (bookmarks, draft autosave, theme); fits zero-backend constraint |
| Vitest + jsdom | (installed) | Unit tests; `vi.spyOn(Storage.prototype, ...)` for localStorage | Already used in all other spec files |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Pinia `useAuthStore` | (installed) | Access `user.login` for localStorage key scoping | Needed inside the fetch adapter closure to build user-scoped cache keys |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage persistence | In-memory Map (current) | Map resets on reload — defeats INFR-05 on return visits |
| URL-derived cache key | Explicit `cacheKey` parameter per call site | Per-call-site explicit key requires touching every `octokit.request()` call; URL derivation is automatic |
| Update `etag.ts` in place | New `etagStorage.ts` module | Both are valid; updating in place is simpler for a single module with no external consumers other than the planned integration |

**Installation:** No new packages required — all needed libraries are already installed.

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Changes are confined to existing files:

```
src/lib/github/
├── etag.ts          ← Replace Map with localStorage-backed LRU; update key API to accept userLogin
├── octokit.ts       ← createRestClient: add userLogin param; wire etagFetchWrapper as request.fetch
└── mutations.ts     ← Label mutation onSuccess: call clearEtag for labels REST endpoint key

src/stores/
└── useAuthStore.ts  ← logout(): call clearUserEtags(user.value?.login) before nulling user
```

### Pattern 1: Octokit Constructor-Level fetch Adapter

**What:** Pass a custom function as `options.request.fetch` to `new Octokit(...)`. Every REST request made through that instance calls the custom function instead of native `fetch`.
**When to use:** When you want to intercept all requests from a client instance without modifying call sites.

```typescript
// Source: https://github.com/octokit/request.js — options.request.fetch
const octokit = new Octokit({
  auth: token,
  request: {
    fetch: (url: string, options: RequestInit) => etagBoundFetch(url, options),
  },
})
```

### Pattern 2: URL-Keyed Cache Key Derivation

**What:** Derive the ETag cache key from the request URL directly so no call site needs to pass an explicit key.
**When to use:** When wiring caching at the adapter layer (not the call layer).

```typescript
// The bound fetch adapter — derives key from URL path after github.com
function makeBoundFetch(userLogin: string) {
  return (url: string, options: RequestInit = {}): Promise<Response> => {
    // e.g. "etag:davor:/repos/owner/repo/labels"
    const key = `etag:${userLogin}:${new URL(url).pathname}`
    return etagFetchWrapper(url, options, key)
  }
}
```

### Pattern 3: localStorage LRU with 50-Entry Cap

**What:** Store the ETag cache as a JSON-serialised array of `[key, value]` pairs in a single localStorage entry. On write, if length >= 50 shift the oldest entry off the front before pushing the new one (FIFO approximation of LRU that avoids complex bookkeeping).
**When to use:** When the entry count is small (~50 × 100 bytes = ~5KB) and simplicity is preferred over exact LRU.

```typescript
const STORAGE_KEY = (login: string) => `etag-cache:${login}`
const MAX_ENTRIES = 50

function readCache(login: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(login))
    return new Map(raw ? JSON.parse(raw) : [])
  } catch {
    return new Map()
  }
}

function writeCache(login: string, map: Map<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY(login), JSON.stringify([...map.entries()]))
  } catch {
    // Quota exceeded or private browsing — degrade silently
  }
}

export function setEtag(login: string, key: string, value: string): void {
  const cache = readCache(login)
  cache.delete(key) // remove if already present (re-insert at end = most recent)
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, value)
  writeCache(login, cache)
}
```

### Pattern 4: Write-Side ETag Invalidation

**What:** After a mutation that changes data at a REST endpoint, call `clearEtag(login, key)` so the next GET fetches fresh data rather than returning 304 with stale content.
**When to use:** Label mutations (create/update/delete) and sign-out.

The TanStack Query `onSuccess` callback is already used in `useAdminLabels.ts` to call `invalidateLabels()`. `clearEtag` belongs in the same `onSuccess` block (or inside the `mutationFn` after the API call succeeds) — not in the mutation functions in `mutations.ts`, because those functions don't have access to the user login. Placing the call in the composable keeps it consistent with existing `invalidateQueries` patterns.

### Anti-Patterns to Avoid

- **Calling `clearEtag` inside `mutations.ts` functions:** Those functions take only `token` — they don't know the user login. The composable layer (`useAdminLabels.ts`) is the correct place.
- **Passing explicit `cacheKey` from each `octokit.request()` call site:** This requires touching every call site and creates a maintenance burden. URL-derived keys at the adapter layer are automatic.
- **Storing ETags in a reactive Pinia state:** ETags are infrastructure, not UI state. Pinia reactivity is unnecessary overhead and would expose cache internals to devtools.
- **Using `JSON.parse` without a try/catch on localStorage reads:** Private browsing, quota errors, and corrupted data all throw — always wrap in try/catch and return empty Map on failure.
- **Scoping the FIFO eviction to per-URL keys inside a single global Map:** The 50-entry cap must be per-login-user, not global, to respect the user-scoped design.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Octokit request interception | Custom Octokit subclass or plugin | `new Octokit({ request: { fetch: ... } })` | The constructor `request.fetch` option is the official adapter injection point; subclassing adds unnecessary complexity |
| 304 response body handling | Custom response reconstruction | Return the 304 `Response` object unchanged | Octokit's internal parser handles 304 correctly — the response is returned as-is without a body, which is correct per HTTP spec |
| ETag parsing | Regex or manual header extraction | `response.headers.get('ETag')` | Already implemented in `etag.ts`; the standard `Headers` API handles all ETag format variants including weak ETags (`W/"..."`) |

**Key insight:** The existing `etagFetchWrapper` already handles all the HTTP protocol logic. The only work is wiring it into Octokit and migrating the backing store from Map to localStorage.

---

## Common Pitfalls

### Pitfall 1: Mismatched Fetch Adapter Signature

**What goes wrong:** `etagFetchWrapper(url, options, cacheKey)` takes three arguments. The Octokit `request.fetch` adapter expects `(url, options) => Promise<Response>` — a two-argument function. Passing `etagFetchWrapper` directly results in `cacheKey` being `undefined`.
**Why it happens:** The existing function was designed for direct call-site use, not as a drop-in adapter.
**How to avoid:** Wrap in a closure that derives the cache key from the URL before passing to Octokit.
**Warning signs:** `cacheKey` is `undefined` in `getEtag`/`setEtag` — all requests miss the cache and no ETag is stored.

### Pitfall 2: localStorage Access in SSR or Worker Context

**What goes wrong:** `localStorage` is not available in Cloudflare Workers. The project is a pure SPA (no SSR per requirements), so this is not an active risk — but the `getRepoLabels` and `getIssueComments` functions might theoretically be imported in a Worker context.
**Why it happens:** The data repo queries.ts is currently browser-only; Workers have their own modules.
**How to avoid:** Wrap all `localStorage` access in `typeof localStorage !== 'undefined'` guards or try/catch. The project is browser-only so the guard primarily protects against vitest's jsdom not perfectly mocking storage edge cases.
**Warning signs:** `ReferenceError: localStorage is not defined` in test output.

### Pitfall 3: 304 Response with stale ETag after label mutation

**What goes wrong:** If `clearEtag` is not called after a label is created/updated/deleted, the next `GET /repos/{owner}/{repo}/labels` sends the old ETag and gets a 304 back — the UI shows the pre-mutation label list.
**Why it happens:** The ETag cache is unaware of mutations. 304 means "nothing changed since your ETag" — but the server's data did change.
**How to avoid:** Add `clearEtag(login, labelsKey)` in `useAdminLabels.ts` `onSuccess` handlers for create/update/delete, alongside the existing `invalidateLabels()` call.
**Warning signs:** Admin label UI does not reflect a just-created/edited/deleted label after mutation; requires a hard refresh to update.

### Pitfall 4: Sign-out leaves stale ETags for next user

**What goes wrong:** If `logout()` does not purge the user-scoped ETag entries from localStorage, a subsequent user on the same browser (different login) might not have their own ETags, but the old user's entries accumulate.
**Why it happens:** localStorage persists across sessions unless explicitly cleared.
**How to avoid:** In `useAuthStore.logout()`, call a `clearUserEtags(login)` function (which removes the user-scoped localStorage key) before nulling `user.value`. Must read `user.value?.login` *before* setting `user.value = null`.
**Warning signs:** Stale ETags remaining in localStorage after sign-out visible in devtools Application > Local Storage.

### Pitfall 5: Concurrent reads before login populates user.login

**What goes wrong:** `createRestClient` is called with a token to perform authenticated REST reads before `user.value` is set (the GraphQL `GET_VIEWER` call and `createRestClient` calls may race).
**Why it happens:** `fetchCurrentUser` sets `user.value` after an async GraphQL call; `createRestClient` might be called from mutation functions before that resolves.
**How to avoid:** Fall back to an empty string or `'anonymous'` as the login key when `user.value?.login` is not yet available. ETags stored under `etag-cache:` (empty login) will simply not persist between users — acceptable degradation since mutations don't fire before auth completes anyway.
**Warning signs:** Cache key constructed as `etag::` or `etag:undefined:` in localStorage.

---

## Code Examples

### Octokit fetch adapter wiring (Pattern 1)

```typescript
// src/lib/github/octokit.ts
// Source: https://github.com/octokit/request.js — options.request.fetch
import { Octokit } from '@octokit/core'
import { makeBoundFetch } from './etag'

export function createRestClient(token: string, userLogin: string = '') {
  return new Octokit({
    auth: token,
    request: {
      fetch: makeBoundFetch(userLogin),
    },
  })
}
```

### localStorage ETag storage (Pattern 3)

```typescript
// src/lib/github/etag.ts — replace the Map-backed functions
const STORAGE_KEY = (login: string) => `etag-cache:${login}`
const MAX_ENTRIES = 50

function readCache(login: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(login))
    return new Map(raw ? (JSON.parse(raw) as [string, string][]) : [])
  } catch {
    return new Map()
  }
}

function writeCache(login: string, map: Map<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY(login), JSON.stringify([...map.entries()]))
  } catch {
    // Quota exceeded or restricted environment — degrade silently
  }
}

export function getEtag(login: string, key: string): string | undefined {
  return readCache(login).get(key)
}

export function setEtag(login: string, key: string, value: string): void {
  const cache = readCache(login)
  cache.delete(key)
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) cache.delete(firstKey)
  }
  cache.set(key, value)
  writeCache(login, cache)
}

export function clearEtag(login: string, key: string): void {
  const cache = readCache(login)
  cache.delete(key)
  writeCache(login, cache)
}

export function clearUserEtags(login: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(login))
  } catch {
    // ignore
  }
}
```

### URL-keyed bound fetch adapter

```typescript
// src/lib/github/etag.ts — bound fetch factory
export function makeBoundFetch(userLogin: string) {
  return (url: string, options: RequestInit = {}): Promise<Response> => {
    const pathname = new URL(url).pathname
    const key = `${userLogin}:${pathname}`
    return etagFetchWrapper(url, options, key, userLogin)
  }
}

// etagFetchWrapper updated to accept login separately
export async function etagFetchWrapper(
  url: string,
  options: RequestInit = {},
  cacheKey: string,
  userLogin: string,
): Promise<Response> {
  const existingEtag = getEtag(userLogin, cacheKey)
  const headers = new Headers(options.headers)
  if (existingEtag) {
    headers.set('If-None-Match', existingEtag)
  }
  const response = await fetch(url, { ...options, headers })
  const newEtag = response.headers.get('ETag')
  if (newEtag) {
    setEtag(userLogin, cacheKey, newEtag)
  }
  return response
}
```

### clearEtag in label mutation onSuccess

```typescript
// src/composables/queries/useAdminLabels.ts — onSuccess for create/update/delete
import { clearEtag } from '@/lib/github/etag'

// Inside useAdminLabels():
const labelsEtagKey = `${authStore.user?.login ?? ''}:/repos/${owner}/${repo}/labels`

const createLabelMutation = useMutation({
  mutationFn: async ({ name, color, description }) => { /* ... */ },
  onSuccess: () => {
    clearEtag(authStore.user?.login ?? '', labelsEtagKey)
    invalidateLabels()
  },
})
// Same pattern for updateLabelMutation and deleteLabelMutation
```

### Sign-out ETag purge

```typescript
// src/stores/useAuthStore.ts — logout()
import { clearUserEtags } from '@/lib/github/etag'

function logout() {
  const login = user.value?.login   // capture before nulling
  token.value = null
  user.value = null
  isMaintainer.value = false
  if (login) clearUserEtags(login)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| In-memory Map (resets on reload) | localStorage-backed cache (persists across visits) | Phase 7 | 304 responses work on return visits, not just within a single page session |
| No fetch interception | Octokit `request.fetch` constructor option | Phase 7 | All future REST calls through `createRestClient` automatically benefit |

**Deprecated/outdated:**
- The three-argument `etagFetchWrapper(url, options, cacheKey)` signature: the `userLogin` parameter must be added (or folded into `cacheKey` derivation) to support per-user scoping.
- The module-level `etagCache = new Map<string, string>()` singleton: replaced by localStorage reads/writes.

---

## Open Questions

1. **Whether `getIssueComments` REST calls should also have their ETag cleared on comment POST**
   - What we know: `getIssueComments` is used by `useAdminLog` to read moderation system comments. New comments are added via `postModerationComment` in mutations.ts (called inside `useAdminActions.ts`).
   - What's unclear: The CONTEXT.md says "Claude determines which other mutations (if any) need ETag clearing based on mutation-to-endpoint mapping." `getIssueComments` fetches `GET /repos/{owner}/{repo}/issues/{issue_number}/comments` — the issue number is variable, so the ETag key includes the issue number. Clearing a per-issue key after posting a moderation comment is feasible but adds complexity.
   - Recommendation: Clear only the labels ETag in this phase (as explicitly decided). Skip per-issue-comment ETag clearing — the stale-time on `useAdminLog` query (or the `invalidateQueries` already in `useAdminActions`) is sufficient freshness for the moderation log use case.

2. **How `createRestClient` callers get the `userLogin` parameter**
   - What we know: `createRestClient` is called in `queries.ts` (`getRepoLabels`, `getIssueComments`) and `mutations.ts` (write operations). Mutation functions do not benefit from ETag caching (writes, not reads), so only the `queries.ts` functions need the login.
   - What's unclear: Whether to thread `userLogin` through every function that calls `createRestClient`, or to read it from `useAuthStore` at the call site (not possible in `queries.ts`/`mutations.ts` — no Vue context), or to let `createRestClient` read it from the store directly.
   - Recommendation: Add `userLogin` as an optional second parameter to `createRestClient`. Each query function that calls it should forward the login. This is a small surface change and keeps dependencies explicit. Mutation calls can omit the parameter (default `''`) since write requests don't benefit from ETag caching anyway.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (v8 coverage) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run src/lib/github/etag.spec.ts src/lib/github/octokit.spec.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFR-05 | `etagFetchWrapper` sends If-None-Match header when ETag cached | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ Wave 0 |
| INFR-05 | localStorage stores ETag after 200 response | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ Wave 0 |
| INFR-05 | localStorage ETag persists per user login scoping | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ Wave 0 |
| INFR-05 | 50-entry cap evicts oldest on write 51 | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ Wave 0 |
| INFR-05 | `clearUserEtags` removes the user's localStorage key | unit | `npx vitest run src/lib/github/etag.spec.ts` | ❌ Wave 0 |
| INFR-05 | `createRestClient` wires fetch adapter (spy confirms custom fetch called) | unit | `npx vitest run src/lib/github/octokit.spec.ts` | ❌ extend existing |
| INFR-05 | `useAuthStore.logout()` calls `clearUserEtags` | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ extend existing |
| INFR-05 | Label mutation `onSuccess` calls `clearEtag` for labels key | unit | `npx vitest run src/composables/queries/useAdminLabels.spec.ts` | ❌ extend existing |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/github/etag.spec.ts src/lib/github/octokit.spec.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/github/etag.spec.ts` — covers INFR-05 (localStorage storage, per-user scoping, 50-entry LRU cap, clearUserEtags, If-None-Match injection, ETag capture from response)
- [ ] Extend `src/lib/github/octokit.spec.ts` — add test asserting `createRestClient` passes a custom fetch to Octokit constructor
- [ ] Extend `src/stores/useAuthStore.spec.ts` — add test asserting `logout()` calls `clearUserEtags`
- [ ] Extend `src/composables/queries/useAdminLabels.spec.ts` — add tests asserting label create/update/delete `onSuccess` calls `clearEtag`

*(No new framework install needed — Vitest + jsdom already configured)*

---

## Sources

### Primary (HIGH confidence)

- `@octokit/request` README (github.com/octokit/request.js) — `options.request.fetch` option name and usage pattern confirmed
- `@octokit/core` npm page (npmjs.com/package/@octokit/core) — constructor `request: { fetch }` option confirmed
- `src/lib/github/etag.ts` — existing implementation directly read
- `src/lib/github/octokit.ts` — existing `createRestClient` directly read
- `src/lib/github/queries.ts` lines 199–255 — `getRepoLabels` and `getIssueComments` REST call patterns directly read
- `src/composables/queries/useAdminLabels.ts` — mutation `onSuccess` pattern directly read
- `src/stores/useAuthStore.ts` — `logout()` function directly read
- `vitest.config.ts` — test environment (jsdom, globals: true) confirmed

### Secondary (MEDIUM confidence)

- WebSearch result confirming `new Octokit({ request: { fetch: myFetch } })` is the standard constructor pattern for v7 — cross-referenced against `@octokit/request` README

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; Octokit `request.fetch` confirmed in official docs
- Architecture: HIGH — existing code directly read; patterns verified against actual file contents
- Pitfalls: HIGH — derived from direct code inspection (signature mismatch) and known localStorage/auth ordering patterns from prior phases

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (Octokit v7 API is stable; localStorage patterns are long-lived)
