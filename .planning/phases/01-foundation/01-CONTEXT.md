# Phase 1: Foundation - Context

**Gathered:** 2026-03-14
**Status:** Ready for planning

<domain>
## Phase Boundary

App shell deployed and navigable; GitHub API layer operational; GitHub OAuth working end-to-end. This phase delivers the skeleton every subsequent phase builds on — routing, auth, global UI (navbar, sidebar, keyboard shortcuts, theme, notifications stub), Cloudflare deployment, and the data-layer abstractions.

Requirements in scope: SHEL-01–06, USER-01–02, INFR-04, INFR-07, INFR-08, INFR-09, INFR-10

What is NOT in scope: prompt data fetching (Phase 2), reactions/comments (Phase 3), admin panel (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### Notifications (SHEL-05)
- Stub implementation only in Phase 1 — real notification feed deferred to Phase 3 when community engagement is built
- Bell icon always visible in navbar; badge only appears when count > 0 (hidden at 0, not shown as "0")
- Notification drawer opens (Sheet from right) with an empty state: "No notifications yet" + subtle icon
- `notificationCount` in `useUIStore` defaults to 0; no API call made in Phase 1

### Data repo configuration
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

### GitHub OAuth Worker
- Full deploy in Phase 1 — Worker code written, `wrangler.toml` configured, deployed to Cloudflare. OAuth popup works end-to-end.
- CSRF state parameter implemented: random state generated, stored in sessionStorage, verified on OAuth callback
- Token handoff via `window.postMessage`: popup sends token to opener after exchange; parent listens and stores in Pinia `useAuthStore`. Token is never written to localStorage or cookies (NFR-S1).
- GitHub App client secret lives exclusively in the Worker's Cloudflare environment (never in the SPA bundle)

### Mobile responsive layout
- Full responsive from day one — all three breakpoints implemented in Phase 1 (not deferred):
  - Desktop (1024px+): sidebar at 200px, full navbar
  - Tablet (640–1023px): sidebar defaults to collapsed (48px), expandable
  - Mobile (<640px): sidebar hidden by default, hamburger opens Sheet overlay
- On mobile: search bar collapses to icon-only; tap opens Command palette fullscreen
- On mobile: +New button stays in navbar as icon-only (purple + icon, no label); not moved to FAB
- `@vueuse/core` `useWindowSize()` for breakpoint detection; CSS media queries for Tailwind `sm:`/`lg:` variants

### App shell conventions (from planning artifacts)
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

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing src/ — greenfield build. Phase 1 scaffolds all base patterns.

### Established Patterns
- Architecture doc specifies: `src/components/ui/` for shadcn copied components, `src/stores/` for Pinia, `src/composables/` for VueUse hooks, `src/lib/github/` for Octokit layer, `src/workers/` for CF Worker source
- TypeScript strict mode throughout; no `any` types; all composables typed with generics

### Integration Points
- `src/router/index.ts` — Vue Router config with `createWebHistory()`, SPA fallback via Cloudflare Pages `_redirects`
- `useAuthStore` — single source of truth for auth state; maintainer status resolved via GitHub collaborators API on login
- `useUIStore` — sidebar collapse state, notification drawer open, theme
- `usePromptsStore` — filterState.category, filterState.model, sortOrder (wired to sidebar — ready for Phase 2 to populate)
- `useSearchStore` — query + results (Command palette wired in Phase 1; MiniSearch index built in Phase 2)

</code_context>

<specifics>
## Specific Ideas

- From S01 wireframe: Navbar is exactly 48px tall, background #13131a, 1px bottom border #2a2a3a. Logo is 24px square with purple background (#4c1d95).
- Active sidebar item styling: background #1e1b4b, 3px left border #7c3aed, text #c4b5fd
- Avatar: 32px circular, user initials in purple (#4c1d95), 1px border (#7c3aed). Fallback to initials when no avatar URL.
- All 18 acceptance criteria from S01 wireframe doc apply — use as Phase 1 completion checklist
- The two-repo architecture: app repo has all Vue SPA + Workers code; data repo is a separate GitHub repo with Issues only. Phase 1 configures the connection but doesn't create any issues.

</specifics>

<deferred>
## Deferred Ideas

- Real notification feed (GitHub activity for reactions/comments on user's prompts) — Phase 3
- Settings screen (referenced in avatar DropdownMenu) — post-MVP
- Help modal ("?" shortcut) — listed in S01 wireframe as future feature

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-14*
