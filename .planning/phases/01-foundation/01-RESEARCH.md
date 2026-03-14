# Phase 1: Foundation - Research

**Researched:** 2026-03-14
**Domain:** Vue 3 SPA scaffolding, Vite 8, shadcn-vue + Tailwind 4, GitHub OAuth via Cloudflare Worker, TanStack Vue Query 5, Pinia 3, Vue Router 5, Cloudflare Pages/Workers deployment, app shell UI patterns
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Notifications (SHEL-05)
- Stub implementation only in Phase 1 — real notification feed deferred to Phase 3 when community engagement is built
- Bell icon always visible in navbar; badge only appears when count > 0 (hidden at 0, not shown as "0")
- Notification drawer opens (Sheet from right) with an empty state: "No notifications yet" + subtle icon
- `notificationCount` in `useUIStore` defaults to 0; no API call made in Phase 1

#### Data repo configuration
- GitHub owner/repo/credentials configured via Vite env vars (baked into Cloudflare Pages build)
- Full env var set defined upfront (avoids revisiting config in later phases):
  - `VITE_GITHUB_OWNER` — GitHub organization or user owning the data repo
  - `VITE_GITHUB_REPO` — Data repo name (the GitHub Issues store)
  - `VITE_GITHUB_CLIENT_ID` — GitHub OAuth App client ID
  - `VITE_CF_WORKER_URL` — Cloudflare Worker base URL (OAuth + image proxy)
  - `VITE_R2_PUBLIC_URL` — Public URL for Cloudflare R2 image storage
  - `VITE_GITHUB_APP_INSTALLATION_ID` — For anonymous read token (installation token)
- `.env.example` committed to repo with descriptions for each var; `.env` in `.gitignore`
- Anonymous reads use a GitHub App installation token — authenticated user token only required for writes (preserves zero-login browse)

#### GitHub OAuth Worker
- Full deploy in Phase 1 — Worker code written, `wrangler.toml` configured, deployed to Cloudflare. OAuth popup works end-to-end.
- CSRF state parameter implemented: random state generated, stored in sessionStorage, verified on OAuth callback
- Token handoff via `window.postMessage`: popup sends token to opener after exchange; parent listens and stores in Pinia `useAuthStore`. Token is never written to localStorage or cookies (NFR-S1).
- GitHub App client secret lives exclusively in the Worker's Cloudflare environment (never in the SPA bundle)

#### Mobile responsive layout
- Full responsive from day one — all three breakpoints implemented in Phase 1 (not deferred):
  - Desktop (1024px+): sidebar at 200px, full navbar
  - Tablet (640–1023px): sidebar defaults to collapsed (48px), expandable
  - Mobile (<640px): sidebar hidden by default, hamburger opens Sheet overlay
- On mobile: search bar collapses to icon-only; tap opens Command palette fullscreen
- On mobile: +New button stays in navbar as icon-only (purple + icon, no label); not moved to FAB
- `@vueuse/core` `useWindowSize()` for breakpoint detection; CSS media queries for Tailwind `sm:`/`lg:` variants

#### App shell conventions (from planning artifacts)
- Dark mode as default; `@vueuse/core` `useDark()` persists preference to localStorage
- Sidebar collapse toggle: `[` keyboard shortcut + button; 0.3s CSS width transition
- Chord shortcuts (G+B, G+N) detected via `useEventListener`; suppressed when focus is in any input/textarea
- shadcn-vue components: Command (search palette), Sheet (sidebar mobile + notification drawer), Avatar, DropdownMenu, Tooltip, Badge, Separator
- Semantic HTML: `<nav>` for navbar, `<aside>` for sidebar, `<main>` for router-view content area

### Claude's Discretion
- Exact notification drawer empty state illustration/icon design
- Chord detection implementation details (timeout window for G+X)
- Tooltip positioning for icon-only collapsed sidebar items
- Exact wrangler.toml Worker config structure (routes, bindings)
- Loading/error states for the auth initialization on app boot

### Deferred Ideas (OUT OF SCOPE)
- Real notification feed (GitHub activity for reactions/comments on user's prompts) — Phase 3
- Settings screen (referenced in avatar DropdownMenu) — post-MVP
- Help modal ("?" shortcut) — listed in S01 wireframe as future feature
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHEL-01 | Any user can invoke global search from any screen using ⌘K keyboard shortcut | Command palette via shadcn-vue `Command`; `useEventListener` from VueUse for keydown detection; Command opens as dialog overlay |
| SHEL-02 | Any user can navigate to Browse (G+B) and New Prompt editor (G+N) via keyboard shortcuts | Chord detection with `useEventListener` + timeout window (~500ms); suppressed on input focus via `document.activeElement` check |
| SHEL-03 | Any user can toggle between light and dark themes from the navbar, with preference persisted to localStorage | `useDark()` from VueUse 14.2.1; toggles `.dark` class on `<html>`; persists automatically to localStorage |
| SHEL-04 | Any user can collapse the sidebar to icon-only mode (48px) to maximize content area | CSS `width` transition 0.3s on `<aside>`; `useUIStore.sidebarCollapsed` Pinia state; `v-show` for labels |
| SHEL-05 | Authenticated user can view in-app notifications in slide-out drawer (STUB Phase 1) | shadcn-vue `Sheet` component from right; `notificationCount` defaults to 0 in `useUIStore`; empty state only |
| SHEL-06 | Any user on mobile can access sidebar filters via a sheet overlay | shadcn-vue `Sheet` component; hamburger button in navbar; `useWindowSize()` to detect mobile breakpoint |
| USER-01 | Any user can authenticate via GitHub OAuth using a popup flow (no page redirect; popup closes automatically) | CF Worker `/login` + `/callback`; `window.open()` popup; `window.opener.postMessage()`; `useAuthStore` receives token |
| USER-02 | Authenticated user can sign out from the platform | `useAuthStore.logout()` clears Pinia token ref; DropdownMenu "Sign Out" item; no API call needed |
| INFR-04 | GitHub OAuth popup completes token exchange in < 5s | CF Worker free tier = zero cold start; GitHub token exchange is a single POST; Worker code is ~40 lines |
| INFR-07 | GitHub OAuth access tokens held in Pinia memory only — never localStorage or cookies | Token stored as `ref<string \| null>` in `useAuthStore`; postMessage handoff from popup; never written to storage |
| INFR-08 | Admin panel access control enforced via GitHub API on every panel load — client-side check alone not sufficient | Route guard calls `GET /repos/:owner/:repo/collaborators/:username` on every `/admin` navigation; result refreshed on auth |
| INFR-09 | Platform operates within GitHub API limits at 50–400 concurrent users without architectural changes | ETag strategy + TanStack Query staleTime + no GitHub Search API usage; Phase 1 establishes these foundations |
| INFR-10 | All Cloudflare Pages, Workers, and R2 usage stays within free tier limits at target scale | CF Pages: unlimited bandwidth; CF Workers: 100k req/day free; Phase 1 deploys Worker (OAuth only); R2 not needed until Phase 2 |
</phase_requirements>

---

## Summary

Phase 1 builds a greenfield Vue 3 SPA from scratch on Vite 8 with the full declared stack. The three primary work streams are: (1) project scaffolding and Cloudflare deployment wiring, (2) GitHub OAuth end-to-end including the Cloudflare Worker proxy, and (3) the app shell UI components with Pinia store topology and keyboard shortcuts. All stack versions have been verified as actively maintained as of March 2026 via the project's own research audit.

The single highest-risk element is the GitHub OAuth Worker — specifically the CSRF state parameter design. The CONTEXT.md decision uses `sessionStorage` (not an HttpOnly cookie) for state storage, which diverges from the research doc's cookie-based approach. This is intentional for SPA simplicity but requires careful validation in the callback. Token security (memory-only Pinia, no localStorage) is a hard NFR that must be implemented correctly in `useAuthStore`.

The app shell is design-complete via the S01 wireframe spec (18 acceptance criteria). Phase 1 delivers stub-only implementations for the notification drawer and data-connected sidebar sections (count badges, filter interactions) — those are wired structurally but not connected to real API data until Phase 2.

**Primary recommendation:** Scaffold → Cloudflare wiring → OAuth Worker end-to-end → Pinia stores + routing skeleton → App shell components in that order. The auth plumbing must work before any authenticated UI can be verified.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue | 3.5.x | SPA framework | Composition API + `<script setup>` — project constraint |
| Vite | 8.0.x | Build tool + dev server | Project constraint; weekly patches, fastest HMR |
| TypeScript | strict | Type safety | Project constraint; no `any` types |
| Vue Router | 5.0.3 | Client-side routing | Official Vue ecosystem; `createWebHistory()` + CF Pages `_redirects` |
| Pinia | 3.0.4 | Client state management | Official Vue state management; replaces Vuex |
| TanStack Vue Query | 5.x (5.92.9) | Server state + caching | stale-while-revalidate; handles ETag + staleTime config |
| shadcn-vue | 2.4.3 | UI component system | Copy-in model gives full ownership; Reka UI ARIA primitives |
| Reka UI | 2.9.0 | Headless UI primitives | Underlies shadcn-vue; WAI-ARIA compliant |
| Tailwind CSS | 4.x | Utility CSS | Configured by shadcn-vue init; dark mode via `.dark` class |
| @vueuse/core | 14.2.1 | Composable utilities | `useDark()`, `useWindowSize()`, `useEventListener()`, `useLocalStorage()` |
| @octokit/graphql | 9.0.3 | GitHub GraphQL client | Official GitHub SDK; authenticated and anonymous queries |
| @octokit/core | 7.0.6 | GitHub REST client | Official GitHub SDK; write operations |

### Supporting (Phase 1 specific)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.0 | Unit + integration tests | Co-located `*.spec.ts` files; replaces Jest |
| @vue/test-utils | latest | Component testing | Mount/shallow-mount Vue components in Vitest |
| @vitest/coverage-v8 | latest | Test coverage | V8-based coverage; zero config with Vitest |
| wrangler | latest | CF Workers CLI | `wrangler dev` for local Worker development; `wrangler deploy` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pinia memory token | `useLocalStorage()` token | localStorage persists across sessions (convenient) but violates NFR-S1 (INFR-07). Do not use. |
| `sessionStorage` state param | HttpOnly cookie state param | Architecture doc uses cookie; CONTEXT.md uses sessionStorage. sessionStorage chosen for SPA simplicity — state is in same window context before popup opens. |
| CSS width transition sidebar | Framer Motion / GSAP | Heavy dependencies not needed for a single 0.3s transition |
| shadcn-vue Command | custom search overlay | Command provides keyboard navigation, ARIA, cmdk pattern for free |
| `useEventListener` chord detection | custom directive | Composable is simpler, testable, and already in VueUse |

### Installation

```bash
# 1. Scaffold Vue 3 + TypeScript SPA
npm create vite@latest prompt-community -- --template vue-ts
cd prompt-community

# 2. Initialize shadcn-vue (Tailwind 4 + Reka UI + component system)
npx shadcn-vue@latest init

# 3. Install core runtime dependencies
npm install vue-router@5 pinia@3 @tanstack/vue-query@5
npm install @vueuse/core @octokit/graphql @octokit/core
npm install yaml minisearch

# 4. Install dev dependencies
npm install -D vitest @vitest/coverage-v8 @vue/test-utils
npm install -D wrangler

# 5. Add shadcn-vue components needed in Phase 1
npx shadcn-vue@latest add command sheet avatar dropdown-menu tooltip badge separator button
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── ui/           # shadcn-vue copied components (Button, Sheet, Command, etc.)
│   └── layout/       # AppLayout.vue, Navbar.vue, Sidebar.vue, NotificationDrawer.vue
├── views/            # BrowseView.vue (stub), PromptEditorView.vue (stub)
├── stores/           # useAuthStore.ts, useUIStore.ts, usePromptsStore.ts, useSearchStore.ts
├── composables/
│   └── queries/      # usePromptsQuery.ts (stub for Phase 1)
├── lib/
│   └── github/       # octokit.ts (client factory), auth.ts (collaborator check)
├── router/           # index.ts with createWebHistory() + route guards
├── types/            # Prompt.ts, User.ts, AuthState.ts
└── workers/          # oauth.ts (Cloudflare Worker source)
```

```
# Root level
wrangler.toml          # CF Worker config
.env.example           # All VITE_ vars documented
_redirects             # /* /index.html 200 (CF Pages SPA fallback)
```

### Pattern 1: Pinia Store for Auth (memory-only token)

**What:** Auth token stored as a plain `ref<string | null>` inside `useAuthStore`. Never serialized to localStorage/sessionStorage.
**When to use:** On every authenticated API call; `isAuthenticated` is a computed derived from token ref.

```typescript
// src/stores/useAuthStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null)
  const user = ref<GitHubUser | null>(null)
  const isMaintainer = ref(false)

  const isAuthenticated = computed(() => token.value !== null)

  function receiveToken(newToken: string) {
    token.value = newToken
    // NOTE: never write to localStorage — INFR-07 requirement
  }

  function logout() {
    token.value = null
    user.value = null
    isMaintainer.value = false
  }

  return { token, user, isMaintainer, isAuthenticated, receiveToken, logout }
})
```

### Pattern 2: OAuth Popup + postMessage Token Handoff

**What:** SPA opens popup to CF Worker `/login`. Worker handles GitHub redirect and posts token back via `window.opener.postMessage`. Parent verifies `event.origin` before accepting token.
**When to use:** Exactly once — in `useAuthStore.login()`.

```typescript
// src/stores/useAuthStore.ts — login action
function login() {
  const state = crypto.randomUUID()
  sessionStorage.setItem('oauth_state', state)

  const workerUrl = import.meta.env.VITE_CF_WORKER_URL
  const popup = window.open(
    `${workerUrl}/login?state=${state}`,
    'github-oauth',
    'width=600,height=700,scrollbars=yes'
  )

  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== workerUrl) return
    if (!event.data?.token) return
    window.removeEventListener('message', handleMessage)
    receiveToken(event.data.token)
    fetchCurrentUser(event.data.token)
  }

  window.addEventListener('message', handleMessage)
}
```

### Pattern 3: Cloudflare Worker OAuth Proxy

**What:** ~40-line Worker handles GitHub OAuth code exchange. `client_secret` never leaves the Worker environment. CSRF state validated.
**When to use:** This is the complete `src/workers/oauth.ts` implementation.

```typescript
// src/workers/oauth.ts
interface Env {
  CLIENT_ID: string
  CLIENT_SECRET: string
  APP_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      const state = url.searchParams.get('state') ?? crypto.randomUUID()
      const githubUrl = new URL('https://github.com/login/oauth/authorize')
      githubUrl.searchParams.set('client_id', env.CLIENT_ID)
      githubUrl.searchParams.set('scope', 'public_repo')
      githubUrl.searchParams.set('state', state)
      return Response.redirect(githubUrl.toString(), 302)
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 })
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
          code,
        }),
      })
      const { access_token, error } = await tokenRes.json<{ access_token?: string; error?: string }>()

      if (!access_token) {
        return new Response(`OAuth error: ${error}`, { status: 400 })
      }

      return new Response(
        `<script>
          window.opener.postMessage({ token: "${access_token}" }, "${env.APP_ORIGIN}");
          window.close();
        </script>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    return new Response('Not found', { status: 404 })
  },
}
```

### Pattern 4: Keyboard Shortcut Chord Detection

**What:** Two-key chords (G+B, G+N) detected via `useEventListener` with a timeout window. Suppressed when any input/textarea/contenteditable has focus.
**When to use:** In a `useKeyboardShortcuts` composable called once at `AppLayout` mount.

```typescript
// src/composables/useKeyboardShortcuts.ts
import { useEventListener } from '@vueuse/core'
import { useRouter } from 'vue-router'

export function useKeyboardShortcuts() {
  const router = useRouter()
  let chordFirstKey: string | null = null
  let chordTimer: ReturnType<typeof setTimeout> | null = null

  const CHORD_TIMEOUT_MS = 500

  function isInputFocused(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
  }

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (isInputFocused()) return

    // Single-key shortcuts
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      // emit open-search event or toggle search store
    }
    if (e.key === '[') {
      e.preventDefault()
      // toggle sidebar
    }

    // Chord shortcuts: G+B, G+N
    if (e.key === 'g' || e.key === 'G') {
      chordFirstKey = 'g'
      if (chordTimer) clearTimeout(chordTimer)
      chordTimer = setTimeout(() => { chordFirstKey = null }, CHORD_TIMEOUT_MS)
      return
    }

    if (chordFirstKey === 'g') {
      if (chordTimer) clearTimeout(chordTimer)
      chordFirstKey = null
      if (e.key === 'b' || e.key === 'B') router.push('/browse')
      if (e.key === 'n' || e.key === 'N') router.push('/prompts/new')
    }
  })
}
```

### Pattern 5: Sidebar CSS Width Transition

**What:** Sidebar width animated via CSS `transition: width 0.3s ease`. Tailwind classes applied conditionally based on `sidebarCollapsed`.
**When to use:** In `Sidebar.vue` — the `<aside>` element.

```vue
<!-- src/components/layout/Sidebar.vue -->
<aside
  :class="[
    'flex flex-col border-r border-[#2a2a3a] bg-[#0d0d12] overflow-hidden transition-[width] duration-300',
    uiStore.sidebarCollapsed ? 'w-12' : 'w-[200px]'
  ]"
>
  <!-- Labels use v-show so DOM stays but they fade with the width transition -->
  <span v-show="!uiStore.sidebarCollapsed" class="text-sm ...">Browse</span>
</aside>
```

### Pattern 6: Route Guards

**What:** Vue Router `beforeEach` guard enforces authentication and maintainer check. Maintainer check re-verifies via GitHub API (not just Pinia state) for `/admin`.

```typescript
// src/router/index.ts
router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/browse' }
  }

  if (to.meta.requiresMaintainer) {
    // Re-verify via GitHub API on every admin navigation (INFR-08)
    const confirmed = await verifyMaintainerStatus(authStore.token.value!)
    if (!confirmed) return { path: '/browse' }
  }
})
```

### Anti-Patterns to Avoid

- **Token in localStorage:** Never call `localStorage.setItem` with the GitHub OAuth token. INFR-07 is a hard requirement. Use Pinia memory ref only.
- **Octokit in components:** Components never import Octokit directly. All GitHub API calls go through `src/lib/github/` functions, then composables.
- **Options API:** Never use `export default { data() {...} }`. Always `<script setup lang="ts">`.
- **Mega AppLayout.vue:** AppLayout.vue is a thin composition surface. Navbar, Sidebar, and NotificationDrawer are separate components. The layout does not contain feature logic.
- **Inline CSS for brand colors:** Use Tailwind utilities with bracket notation (`bg-[#13131a]`) or CSS custom properties defined in the global stylesheet. Do not scatter hex values across multiple components.
- **`v-if` for sidebar label visibility:** Use `v-show` for sidebar labels so the width transition looks smooth (elements remain in DOM, just hidden). `v-if` destroys/recreates DOM and breaks the animation.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Search Command palette | Custom dropdown with keyboard nav | shadcn-vue `Command` | Arrow keys, Enter, Escape, ARIA `combobox` pattern — all handled |
| Slide-out notification drawer | Custom CSS drawer + backdrop | shadcn-vue `Sheet` | Focus trap, Escape close, ARIA dialog, scroll lock — all handled |
| Dark mode toggle + persistence | `document.documentElement.classList.toggle` + manual localStorage | VueUse `useDark()` | Handles system preference, persistence, class toggling correctly |
| Breakpoint detection in JS | `window.matchMedia` event listeners | VueUse `useWindowSize()` | Reactive, SSR-safe, cleanup on unmount |
| Keyboard event listeners | `document.addEventListener` in `onMounted` + manual cleanup | VueUse `useEventListener()` | Auto-cleanup on component unmount, reactive target support |
| Avatar with initials fallback | Custom CSS + JS for initials | shadcn-vue `Avatar` + `AvatarFallback` | Handles image load error, ARIA, fallback slot |
| User dropdown menu | Custom positioned dropdown + click-outside | shadcn-vue `DropdownMenu` | Focus management, keyboard navigation, ARIA `menu` role |
| Icon-only tooltips | `title` attribute or custom tooltip | shadcn-vue `Tooltip` | Proper delay, ARIA `tooltip` role, positioning via Floating UI |
| Token exchange proxy | CORS fetch to GitHub directly | Cloudflare Worker | GitHub's token exchange has no CORS headers; `client_secret` cannot be in SPA bundle |

**Key insight:** shadcn-vue + VueUse between them cover every interactive UI primitive needed in Phase 1. Custom implementations introduce accessibility gaps and maintenance burden with zero benefit.

---

## Common Pitfalls

### Pitfall 1: Token Leaking to localStorage

**What goes wrong:** Developer uses `useLocalStorage('token', null)` in `useAuthStore` thinking it's convenient for session persistence.
**Why it happens:** VueUse's `useLocalStorage` is very ergonomic and often used for other store values. The habit carries over.
**How to avoid:** Use plain `ref<string | null>(null)` for the token. Add a comment `// SECURITY: never persist to localStorage — INFR-07`. Test explicitly that `localStorage.getItem('token')` is null after login.
**Warning signs:** `useLocalStorage` import in `useAuthStore.ts`.

### Pitfall 2: CSRF State Mismatch in OAuth Popup

**What goes wrong:** The OAuth callback validates the `state` param incorrectly. Either the state is not stored before opening the popup, or the comparison fails because the popup and parent have separate sessionStorage contexts.
**Why it happens:** `sessionStorage` is NOT shared between the popup window and the opener window. The state must be sent in the postMessage payload (or the Worker must validate it independently).
**How to avoid:** The CONTEXT.md decision uses sessionStorage for state generation in the SPA before opening the popup. The Worker receives state via URL param and passes it back. The SPA stores the state before opening the popup and the Worker echoes it back in the postMessage payload for comparison. Alternatively, do state validation entirely in the Worker (using a short-lived KV entry or signed param).
**Warning signs:** OAuth popup opens but parent never receives the token; console shows "state mismatch" errors.

### Pitfall 3: Sidebar Transition Jank from `v-if`

**What goes wrong:** Using `v-if="!sidebarCollapsed"` on sidebar labels causes DOM nodes to be removed instantly, making the 0.3s width transition look like a jump rather than a smooth collapse.
**Why it happens:** Intuitive to use `v-if` to "remove" elements when collapsed.
**How to avoid:** Use `v-show` for text labels. The DOM remains; only `display` changes. The parent `<aside>` width transition controls the visual effect.
**Warning signs:** Sidebar text disappears before the width animation completes.

### Pitfall 4: Keyboard Shortcuts Firing in Inputs

**What goes wrong:** User types "g" in the search bar, accidentally triggering chord detection. ⌘K opens the palette while user is trying to search for something starting with "k".
**Why it happens:** Event listeners on `document`/`window` catch all keydown events including those inside inputs.
**How to avoid:** In the keydown handler, check `isInputFocused()` (inspect `document.activeElement.tagName`) and return early. The `Command` component already handles ⌘K internally when focused, so the `useEventListener` handler must not double-fire it.
**Warning signs:** Chord navigation happens unintentionally while typing in search; `[` is typed into input instead of collapsing sidebar.

### Pitfall 5: Wrangler Deploy Fails Without Secrets

**What goes wrong:** `wrangler deploy` succeeds (Worker is uploaded) but OAuth callback returns errors because `CLIENT_SECRET` is not set in the Worker's environment.
**Why it happens:** Worker secrets are separate from `wrangler.toml` vars and must be set via `wrangler secret put`.
**How to avoid:** After deploying the Worker, immediately run `wrangler secret put CLIENT_SECRET` and `wrangler secret put CLIENT_ID`. Document this in `src/workers/README.md`.
**Warning signs:** Worker deployed successfully, but GitHub returns "bad_verification_code" on callback.

### Pitfall 6: SPA Routing 404 on Cloudflare Pages

**What goes wrong:** Direct navigation to `/browse` or `/prompts/123` returns a 404 from Cloudflare Pages.
**Why it happens:** Vue Router uses `createWebHistory()` for clean URLs. Without a fallback rule, Cloudflare Pages serves a 404 for any path that isn't a real file.
**How to avoid:** Add a `_redirects` file at the project root (copied to `dist/` during build):
```
/* /index.html 200
```
**Warning signs:** App works when navigating from `/` but breaks on browser refresh at any other path.

### Pitfall 7: shadcn-vue Command Not Opening on ⌘K

**What goes wrong:** `useEventListener` handler fires and updates a ref to open the Command component, but the `v-model:open` on `<CommandDialog>` doesn't react, or both the component's internal handler and the composable handler fire causing immediate open-then-close.
**Why it happens:** shadcn-vue `Command` used as a `CommandDialog` has its own internal open/close handling. The composable must manage the open state via a shared Pinia `useUIStore` value and the CommandDialog must use that same value.
**How to avoid:** Store `commandPaletteOpen` in `useUIStore`. Pass as `v-model:open` to `<CommandDialog>`. Set it to `true` in the keydown handler. Call `e.preventDefault()` to suppress native browser find-in-page on ⌘F variants.

### Pitfall 8: Maintainer Check Timing on App Boot

**What goes wrong:** On page refresh, `isAuthenticated` is always `false` (token lost from memory), but route guards run before any auth rehydration attempt, causing maintainer users to get redirected on every hard refresh.
**Why it happens:** Pinia state is not persisted. On refresh, the token is gone. If a route guard fires before any auth check, it sees `isAuthenticated = false` and redirects.
**How to avoid:** In `App.vue` `onMounted`, check if there's a way to re-authenticate (e.g., the user was previously logged in — but since token is memory-only, there's no way to rehydrate). This means users MUST re-authenticate after every page refresh. This is by design (INFR-07). The auth loading state should show a skeleton/spinner on app boot rather than immediately redirecting. Route guards should only redirect after the auth initialization completes.
**Warning signs:** Maintainer gets kicked to `/browse` on every browser refresh.

---

## Code Examples

Verified patterns from project architecture document and research doc:

### Pinia Store Naming

```typescript
// ✅ CORRECT
const { data } = usePromptsQuery(filters)    // TanStack query hook
const store = usePromptsStore()              // Pinia store
useKeyboardShortcuts()                       // General composable

// ❌ WRONG — ambiguous, conflicts with store naming
const prompts = usePrompts()
```

### GitHub Octokit Client Factory

```typescript
// src/lib/github/octokit.ts
import { graphql } from '@octokit/graphql'
import { Octokit } from '@octokit/core'

export function createGraphqlClient(token?: string) {
  return graphql.defaults({
    headers: {
      authorization: token ? `token ${token}` : `token ${import.meta.env.VITE_ANONYMOUS_TOKEN}`,
    },
  })
}

export function createRestClient(token: string) {
  return new Octokit({ auth: token })
}
```

### Vue Router with History Mode + SPA Fallback

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/browse' },
    { path: '/browse', component: () => import('@/views/BrowseView.vue') },
    { path: '/prompts/new', component: () => import('@/views/PromptEditorView.vue'), meta: { requiresAuth: true } },
    { path: '/prompts/:id', component: () => import('@/views/PromptDetailView.vue') },
    { path: '/admin', component: () => import('@/views/AdminView.vue'), meta: { requiresMaintainer: true } },
  ],
})
```

### .env.example (commit to repo)

```bash
# .env.example — copy to .env and fill in values
VITE_GITHUB_OWNER=your-org          # GitHub org or user owning the data repo
VITE_GITHUB_REPO=prompt-community-data  # Data repo name (Issues store)
VITE_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxx    # GitHub OAuth App client ID
VITE_CF_WORKER_URL=https://auth.your-domain.workers.dev  # OAuth + image proxy
VITE_R2_PUBLIC_URL=https://assets.your-domain.com        # Cloudflare R2 public URL
VITE_GITHUB_APP_INSTALLATION_ID=12345678  # For anonymous read installation token
```

### Version Badge from package.json at Build Time

```typescript
// In Sidebar.vue or a utility
// vite.config.ts — expose version to client
import { defineConfig } from 'vite'
// Vite exposes package.json version via import.meta.env automatically if
// you define it in vite.config.ts:
// define: { '__APP_VERSION__': JSON.stringify(process.env.npm_package_version) }

// In component:
const appVersion = __APP_VERSION__  // e.g. "0.1.0"
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `front-matter` npm package | Custom 15-line wrapper around `yaml` 2.8.2 | Recognized March 2026 (last `front-matter` publish: 2019) | `front-matter` and `gray-matter` are both unmaintained; `yaml` has 85M weekly downloads |
| Vuex | Pinia 3 | Pinia became official with Vue 3 | More ergonomic, TypeScript-first, no mutations boilerplate |
| Vue Router 4 | Vue Router 5.0.3 | 2025 | Part of official ecosystem; API compatible with v4 for this use case |
| Shiki 1.x | Shiki 4.0.1 | Released March 2026 | Major release with improved API; same VS Code grammar quality |
| Vitest 2.x | Vitest 4.1.0 | Released March 2026 | Major v4 release, significant performance improvements |
| Options API | Composition API + `<script setup>` | Vue 3 best practice since 2022 | Better TypeScript inference, better tree-shaking, composable reuse |
| `prose/gatekeeper` OAuth proxy | Custom Cloudflare Worker (~40 lines) | Research doc warning March 2026 | `prose/gatekeeper` is years out of date; custom Worker is simpler |

**Deprecated/outdated:**
- `gray-matter`: 5 years stale — do not use; use `yaml` package directly
- `front-matter`: 6 years stale — do not use; use `yaml` package directly
- Options API: Technically still valid but project explicitly forbids it (`vue-best-practices` skill requires Composition API)
- `createWebHashHistory()`: Hash-based routing was needed for GitHub Pages (no SPA fallback); not needed for Cloudflare Pages which supports `_redirects`

---

## Open Questions

1. **Anonymous read token for GitHub API (VITE_GITHUB_APP_INSTALLATION_ID)**
   - What we know: CONTEXT.md specifies anonymous reads use a GitHub App installation token. Phase 1 establishes the config.
   - What's unclear: How does the SPA obtain a fresh installation token? GitHub App installation tokens expire in 1 hour and require a server-side JWT signing flow. This may require a second Worker endpoint or a pre-generated token baked into the build.
   - Recommendation: In Phase 1, use an unauthenticated Octokit client for public repo reads (GitHub allows reading public repo issues without any auth, just at lower rate limits). Document the installation token flow as a Phase 2 refinement when rate limits become a concern. The `VITE_GITHUB_APP_INSTALLATION_ID` var can be defined in `.env.example` but left unused in Phase 1.

2. **CSRF state validation: sessionStorage vs Worker-side**
   - What we know: CONTEXT.md uses sessionStorage to store state before opening popup. But sessionStorage is NOT shared between the opener window and the popup window.
   - What's unclear: The CONTEXT.md says "random state generated, stored in sessionStorage, verified on OAuth callback" — the popup's sessionStorage is separate from the opener's. The verification must happen in the Worker (compare URL `state` param from GitHub callback with a Worker-side stored value), or the SPA stores state before opening the popup and the Worker simply echoes it back in the postMessage for the SPA to compare.
   - Recommendation: Have the Worker echo the state parameter back in the postMessage payload. The SPA saves state to a local variable (not sessionStorage) before `window.open()`, then verifies that the echoed state matches on message receipt. This is simpler and avoids the sessionStorage cross-window issue.

3. **wrangler.toml structure for OAuth Worker**
   - What we know: CONTEXT.md marks this as Claude's discretion. The Worker lives in `src/workers/oauth.ts`.
   - What's unclear: Whether to use `wrangler.toml` at project root or a nested config; which routes to bind.
   - Recommendation: Single `wrangler.toml` at project root with a named Worker entry. Bind to a `workers.dev` subdomain for Phase 1; custom domain can be added later.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (or Vite config `test:` block) — Wave 0 creates |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| USER-01 | OAuth popup opens and token is received via postMessage | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ Wave 0 |
| USER-02 | Sign out clears Pinia auth state | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ Wave 0 |
| INFR-07 | Token is never written to localStorage after login | unit | `npx vitest run src/stores/useAuthStore.spec.ts` | ❌ Wave 0 |
| SHEL-01 | ⌘K opens Command palette | unit | `npx vitest run src/composables/useKeyboardShortcuts.spec.ts` | ❌ Wave 0 |
| SHEL-02 | G+B navigates to /browse; G+N navigates to /prompts/new | unit | `npx vitest run src/composables/useKeyboardShortcuts.spec.ts` | ❌ Wave 0 |
| SHEL-02 | Shortcuts suppressed when input is focused | unit | `npx vitest run src/composables/useKeyboardShortcuts.spec.ts` | ❌ Wave 0 |
| SHEL-03 | Theme toggle persists to localStorage | unit | `npx vitest run src/stores/useUIStore.spec.ts` | ❌ Wave 0 |
| SHEL-04 | Sidebar collapse toggles `sidebarCollapsed` in UIStore | unit | `npx vitest run src/stores/useUIStore.spec.ts` | ❌ Wave 0 |
| SHEL-05 | Notification drawer shows empty state when notificationCount = 0 | component | `npx vitest run src/components/layout/NotificationDrawer.spec.ts` | ❌ Wave 0 |
| INFR-08 | Maintainer check calls GitHub API (not just Pinia state) on /admin navigation | unit | `npx vitest run src/router/index.spec.ts` | ❌ Wave 0 |
| INFR-10 | CF Pages _redirects file present in dist after build | smoke | manual: `npm run build && cat dist/_redirects` | N/A |
| INFR-04 | OAuth Worker handles /login redirect correctly | unit | `npx vitest run src/workers/oauth.spec.ts` (Worker unit test) | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/stores/ src/composables/`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/stores/useAuthStore.spec.ts` — covers USER-01, USER-02, INFR-07
- [ ] `src/stores/useUIStore.spec.ts` — covers SHEL-03, SHEL-04
- [ ] `src/composables/useKeyboardShortcuts.spec.ts` — covers SHEL-01, SHEL-02
- [ ] `src/router/index.spec.ts` — covers INFR-08 route guard behavior
- [ ] `src/components/layout/NotificationDrawer.spec.ts` — covers SHEL-05 stub
- [ ] `src/workers/oauth.spec.ts` — covers INFR-04 Worker logic (use `cloudflare:test` or mock fetch)
- [ ] `vitest.config.ts` — framework configuration with path aliases and coverage settings
- [ ] `src/test/setup.ts` — shared test setup (jsdom environment, global mocks for `window.open`, `postMessage`)

---

## Sources

### Primary (HIGH confidence)

- Project's own research doc `design/research/vue-github-issues-platform-research.md` — verified stack versions as of March 2026, maintenance audit for all dependencies
- `design/planning-artifacts/architecture.md` — naming conventions, file structure, store topology, implementation patterns, conflict-point resolution
- `design/research/wireframe/S01-app-shell-requirements.md` — 20 FRs, 18 ACs for app shell, component inventory, Pinia reads/writes spec
- `.planning/phases/01-foundation/01-CONTEXT.md` — locked decisions for Phase 1

### Secondary (MEDIUM confidence)

- VueUse docs (via project research) — `useDark()`, `useWindowSize()`, `useEventListener()` confirmed in v14.2.1
- shadcn-vue changelog — v2.4.3 confirmed active November 2025; MCP server launched February 2026
- Cloudflare Workers docs (via project research) — confirmed 100k req/day free tier, zero cold starts

### Tertiary (LOW confidence)

- sessionStorage cross-window behavior (open question #2 above) — standard browser behavior but the exact state-passing pattern for this popup flow needs implementation validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified in project's March 2026 research audit with npm publish dates
- Architecture: HIGH — sourced directly from the architecture decision document (collaboratively finalized)
- Pitfalls: HIGH (common pitfalls) / MEDIUM (sessionStorage CSRF open question) — drawn from architecture doc conflict-point analysis and known OAuth SPA patterns
- Component inventory: HIGH — sourced directly from S01 wireframe spec

**Research date:** 2026-03-14
**Valid until:** 2026-06-14 (90 days — stable stack; Vite, shadcn-vue, VueUse release frequently but APIs are stable)
