---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-03-14'
inputDocuments:
  - design/planning-artifacts/prd.md
  - design/planning-artifacts/architecture.md
  - design/research/wireframe/S01-app-shell-requirements.md
  - design/research/wireframe/S02-master-detail-requirements.md
  - design/research/wireframe/S03-new-prompt-editor-requirements.md
  - design/research/wireframe/S04-version-history-requirements.md
  - design/research/wireframe/S05-admin-panel-requirements.md
  - design/research/wireframe/S06-user-profile-requirements.md
---

# prompt-community - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for prompt-community, decomposing the requirements from the PRD, UX Design (wireframes S01–S06), and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR01: Any user can browse the full prompt list without authenticating
FR02: Any user can filter the prompt list by category (Engineering, Business, General)
FR03: Any user can filter the prompt list by AI model (e.g., Claude, GPT-4, Gemini)
FR04: Any user can sort the prompt list by Most Voted, Newest, or Most Commented
FR05: Any user can search prompts client-side using a keyword search (results appear in < 50ms, no API call)
FR06: Any user can open a prompt and read its full rendered markdown content with syntax-highlighted code blocks
FR07: Any user can view a prompt's metadata: content type, category, AI model, difficulty, vote count, comment count, tags, and author
FR08: Any user can copy a prompt's full content to clipboard with a single action
FR09: Any user can share a direct permalink to a specific prompt
FR10: Any user can browse a paginated prompt list with infinite scroll and skeleton loading states
FR11: Authenticated user can create a new prompt submission with title, markdown body, category, AI model, difficulty, and up to 5 tags
FR12: Authenticated user can create a skill file as a distinct content type
FR13: Authenticated user can create a grouped skill set as a distinct content type
FR14: Authenticated user can add usage instructions to any submission
FR15: Authenticated user can upload images to a submission via drag-and-drop or file picker
FR16: Authenticated user can preview rendered markdown in a live split-pane while composing
FR17: Authenticated user can publish a submission (creates a GitHub Issue with YAML frontmatter in the data repo)
FR18: Authenticated user can edit their own existing submission
FR19: Authenticated user can fork an existing prompt as the starting point for a new submission
FR20: The editor auto-saves draft content to localStorage every 30 seconds
FR21: Authenticated user is warned about unsaved changes when navigating away from the editor
FR22: Authenticated user can publish an updated version of their own submission with an optional changelog message
FR23: Any user can view the full version history timeline for a prompt
FR24: Any user can compare any two versions of a prompt in side-by-side or unified diff view
FR25: Author or maintainer can restore a previous version (restored as a new version — non-destructive)
FR26: Author or maintainer must confirm a version restore before it is applied
FR27: Authenticated user can add a reaction to a prompt (👍 ❤️ 🚀) with optimistic UI
FR28: Authenticated user can remove their own previously added reaction
FR29: Authenticated user can post a comment on a prompt
FR30: Any user can read all comments on a prompt without authenticating
FR31: Anonymous user is shown a sign-in call-to-action when attempting to react or comment
FR32: Authenticated user can flag a prompt for moderator review
FR33: Any user can authenticate via GitHub OAuth using a popup flow (no page redirect; popup closes automatically on completion)
FR34: Authenticated user can sign out from the platform
FR35: Any user can view another user's public profile showing their submissions and aggregate stats
FR36: Authenticated user can view their own profile with submitted prompts, saved prompts, and activity tabs
FR37: Authenticated user can bookmark/save a prompt to their own saved tab (persisted to localStorage)
FR38: Authenticated user's profile displays total vote count across all their submissions and total submission count
FR39: Maintainer/Curator can access the admin panel (non-maintainers are redirected immediately)
FR40: Maintainer/Curator can view a stats overview: total prompts, flagged count, featured count
FR41: Maintainer/Curator can view the moderation queue of flagged prompts
FR42: Maintainer/Curator can approve, hide, or delete prompts from the moderation queue
FR43: Maintainer/Curator can perform bulk actions across multiple items in the moderation queue
FR44: Maintainer/Curator can add, edit, and delete GitHub labels with namespace prefix conventions enforced
FR45: Maintainer/Curator can mark prompts as featured to elevate their visibility
FR46: Maintainer/Curator can view a moderation log with full action history, filterable by date
FR47: Any user can invoke global search from any screen using the ⌘K keyboard shortcut
FR48: Any user can navigate to Browse (G+B) and New Prompt editor (G+N) via keyboard shortcuts
FR49: Any user can toggle between light and dark themes from the navbar, with preference persisted to localStorage
FR50: Any user can collapse the sidebar to icon-only mode (48px) to maximise content area
FR51: Authenticated user can view in-app notifications in a slide-out notification drawer
FR52: Any user on mobile can access sidebar filters via a sheet overlay
FR53: Any user can browse previously cached prompts while offline (PWA — service worker cache)
FR54: Authenticated user's write actions (submit, vote, comment) taken offline are queued for sync when connectivity restores

### NonFunctional Requirements

NFR-P1: First Contentful Paint < 1.5s on first visit (static SPA served from Cloudflare CDN)
NFR-P2: Initial prompt list load < 2s (single GraphQL query + TanStack Query cache)
NFR-P3: Client-side search response < 50ms (MiniSearch — no network round-trip)
NFR-P4: Subsequent in-app navigation renders immediately using stale-while-revalidate cached data
NFR-P5: GitHub OAuth popup completes token exchange in < 5s under normal network conditions
NFR-P6: Editor auto-save writes to localStorage in < 100ms — no perceptible interruption to the user
NFR-S1: GitHub OAuth access tokens are held in Pinia memory state only — never written to localStorage or cookies; cleared on tab close
NFR-S2: GitHub App client secret is never exposed to the browser — token exchange occurs exclusively inside the Cloudflare Worker
NFR-S3: All communication with GitHub and Cloudflare services occurs over HTTPS
NFR-S4: Admin panel access control is enforced by verifying maintainer role via GitHub API on every panel load — client-side role check alone is not sufficient
NFR-S5: No user PII is stored beyond GitHub public profile data (username, avatar, public bio) already available on GitHub
NFR-S6: Image uploads are proxied via Cloudflare Worker — R2 bucket is not publicly accessible directly
NFR-SC1: Platform must operate within GitHub API limits: 5,000 GraphQL points/hour per authenticated user; anonymous requests use a shared app installation token
NFR-SC2: ETag conditional requests must be used for all cacheable GitHub API reads — 304 Not Modified responses consume zero rate limit points
NFR-SC3: Client-side MiniSearch index eliminates all dependency on GitHub Search API (30 req/min cap) for user-facing search
NFR-SC4: Platform must remain fully functional for 50–400 concurrent users without architectural changes
NFR-SC5: All Cloudflare Pages, Workers, and R2 usage must remain within free tier limits at target scale of 50–400 users
NFR-A1: All screens comply with WCAG 2.1 AA
NFR-A2: All interactive elements are keyboard-navigable with visible focus indicators (2px solid outline)
NFR-A3: aria-live regions announce dynamic content changes: vote count updates, new comment additions, notification badge updates
NFR-A4: All text meets 4.5:1 colour contrast ratio in both light and dark mode
NFR-A5: All icon-only UI elements (collapsed sidebar buttons, editor toolbar icons) have tooltip labels
NFR-I1: All GitHub GraphQL read queries must include If-None-Match ETag headers and handle 304 responses without re-rendering
NFR-I2: GitHub REST write operations must handle 401 (expired token), 403 (rate limited), and 422 (validation error) with user-facing error messages and no silent failure
NFR-I3: Cloudflare R2 image uploads are limited to 10MB per file; supported formats are PNG, JPG, GIF, and WebP
NFR-I4: MiniSearch index is built on first load and invalidated when the authenticated user publishes or edits a prompt
NFR-R1: During GitHub API outages, TanStack Query stale cache serves read content for up to 24 hours without user disruption
NFR-R2: Write operations that fail during a GitHub outage surface a clear error state with a retry CTA — no silent failure or data loss
NFR-R3: PWA offline mode allows browsing of previously cached prompts; write actions (submit, vote, comment) are queued for background sync on reconnection
NFR-R4: Editor auto-save to localStorage ensures draft content survives browser crashes or accidental navigation

### Additional Requirements

- **[ARCH-STARTER] Starter template**: Scaffold using `npm create vite@latest prompt-community -- --template vue-ts` followed by `npx shadcn-vue@latest init`. Project initialization is Epic 1 Story 1; Cloudflare infrastructure setup is Epic 1 Story 2.
- **[ARCH-TS] TypeScript strict mode**: All source files must be TypeScript strict mode. No plain JS files. All composables typed with generics where applicable.
- **[ARCH-VUE] Vue 3 Composition API exclusively**: `<script setup>` syntax throughout. No Options API permitted anywhere in the codebase.
- **[ARCH-WORKER] Cloudflare Workers**: Two Workers required — OAuth proxy (~40 lines) and image upload proxy to R2 (~40 lines). Must be written to the Cloudflare Workers runtime and developed locally via `wrangler dev`.
- **[ARCH-TWOREPO] Two-repo architecture**: App code and GitHub Issues (data) live in separate repos. Contributors submit issues to data repo; only maintainers modify the app repo. Route guards and Octokit calls must target the data repo by config.
- **[ARCH-FRONTMATTER] YAML frontmatter schema layer**: Implement custom `parseFrontmatter()` / `serializeFrontmatter()` wrappers around `yaml` 2.8.2 (85M weekly downloads). Do NOT use `front-matter` or `gray-matter` — both are unmaintained (5–6 years stale). Schema: `category`, `model`, `difficulty`, `tags` (max 5), `version` (integer), `changelog` (string).
- **[ARCH-VERSION] Version history via structured comments**: Each prompt edit is posted as a new GitHub issue comment with header `## Version N — YYYY-MM-DD`. Restore = post new comment with old content. Diff computed client-side via `jsdiff`.
- **[ARCH-SEARCH] MiniSearch index lifecycle**: Built on first app load from all open issues (paginated, per_page=100). Persisted to IndexedDB via `idb-keyval`. Background sync via `since` param + ETags fetches only changed issues. Updated when new prompts are submitted. Eliminates GitHub Search API dependency entirely.
- **[ARCH-CACHE] Three-layer caching defense**: Layer 1 = ETag conditional requests (If-None-Match on all GitHub API calls, 304 responses are zero rate limit cost); Layer 2 = TanStack Query staleTime (prompt lists: 60s, comments: 30s, user profile: 300s, admin queue: 30s, labels: 60s); Layer 3 = MiniSearch IndexedDB cache.
- **[ARCH-OPTIMISTIC] Optimistic mutations**: All state-changing operations (reactions, comments, moderation actions, fork) use the TanStack Query 5-step optimistic pattern: cancel in-flight → snapshot → apply optimistic → rollback on error → invalidate on success.
- **[ARCH-MARKDOWN] Markdown rendering pipeline**: `markdown-it` 14 for parsing + `@shikijs/markdown-it` as bridge + `shiki` 4 for syntax highlighting. Used in S02 (prompt detail), S03 (live preview), S04 (raw view). All v-html output must be sanitized to prevent XSS.
- **[ARCH-KEYBOARD] Global keyboard shortcut chord detection**: Utility required for chord sequences (G+B, G+N). Must not fire when focus is inside any text input or textarea.
- **[ARCH-STORES] Pinia 5-store topology**: useAuthStore (auth state, token, maintainer status), usePromptsStore (filter state, selected prompt), useUIStore (sidebar, theme, notification drawer, split pane position, diff mode), useSearchStore (query, results), useDraftStore (title, content, metadata, tags, lastSaved, isDirty).
- **[ARCH-ERRORS] Two-tier error handling**: Toast notifications for API-level errors; inline validation messages for form field errors. All toasts use a unified composable.
- **[ARCH-NOTIFY] Notification strategy**: GitHub Notifications API (`GET /notifications`) for MVP. Load on demand (page load + route change). No polling. Badge count from `useUIStore.notificationCount`.
- **[ARCH-DEPLOY] Deployment**: Manual `wrangler deploy` for MVP. No CI/CD pipeline until post-launch stability is confirmed.
- **[ARCH-TEST] Testing**: Vitest 4 + @vue/test-utils. Co-located test files (`*.spec.ts` adjacent to source). Coverage via @vitest/coverage-v8.
- **[ARCH-PWA] PWA configuration**: `vite-plugin-pwa` with Workbox. `StaleWhileRevalidate` for API responses; `CacheFirst` for R2 images and static assets. Offline write actions queue for background sync on reconnect.
- **[ARCH-DARK] Dark theme as default**: `@vueuse/core` `useDark()` persists preference to localStorage. Tailwind CSS 4 `dark:` variants on all shadcn-vue components. Toggle in navbar.

### UX Design Requirements

UX-DR1: Navbar — 48px tall, fixed, dark background (#13131a), 1px bottom border (#2a2a3a). Contains: logo/home link (left), search bar (center, flex-grow), notification bell with red badge (right), user avatar or sign-in button (right), +New button (authenticated only, right).
UX-DR2: Sidebar — default 200px, collapses to 48px icon-only via CSS transition (0.3s) triggered by collapse button or [ key. Labels hidden in collapsed mode; tooltips on hover for all icon-only buttons.
UX-DR3: Sidebar sections — BROWSE (All Prompts, Trending, Recent with count badges), CATEGORIES (colored dot per category, collapsible, count badges), AI MODELS (count badges, radio behavior), SORT (Most Voted / Newest / Most Discussed, radio behavior), ADMIN (maintainer-only, red accent #ef4444, moderation badge count). Active item: background #1e1b4b, 3px left border #7c3aed, text #c4b5fd.
UX-DR4: Mobile app shell — sidebar hidden by default, hamburger opens Sheet overlay. Navbar condensed. +New button repositioned for mobile.
UX-DR5: Sidebar bottom — app version badge (e.g., "v0.8.2") in small muted text, pulled from package.json at build time.
UX-DR6: Browse master panel — default 320px width, min 240px, max 520px. Resizable via 4px drag handle (transparent → #7c3aed on hover, col-resize cursor). Split position persisted to localStorage.
UX-DR7: Prompt row — ~60–70px height. Displays: avatar (18px circle, author color), author + timestamp, title (bold, single-line truncation), tag chips (category/model/difficulty), vote count + comment count. Hover: subtle bg #1a1a2e. Active: bg #1a1a2e + 3px left border #7c3aed.
UX-DR8: Master panel states — empty state: full-height centered icon + "No prompts found" + clear filters button. Loading state: 3–5 skeleton rows with animated pulse effect (same layout as real rows).
UX-DR9: Filter chips — removable chips below master search input for each active filter (bg #1e1b4b, border #7c3aed, text #a78bfa). × removes individual filter.
UX-DR10: Detail panel header — sticky (position sticky, top 0, z-index 10), ~40px height, bg #13131a, border-bottom #2a2a3a. Prompt title (truncated) + [Copy][Fork][History][Share][⋯] action buttons. [Copy] and [History] and [Share] work unauthenticated. [Fork] requires auth.
UX-DR11: Detail content area — large title (22px bold), tag chips (colored), stats row (vote/comment/view count + timestamp), rendered markdown body, code blocks (dark bg #12121e, border #2a2a3a, monospace, per-block copy button), reactions bar, comments section.
UX-DR12: Reactions bar — emoji toggle buttons (👍 ❤️ 🚀) with counts. Active state: bg #1e1b4b, border #7c3aed, text #a78bfa. Unauthenticated: auth CTA shown instead.
UX-DR13: Comments — each comment: avatar (32px), author (bold, #c4b5fd), relative timestamp, rendered markdown body. Comment composer (authenticated): avatar + textarea + purple Submit button (#4c1d95). Unauthenticated CTA: 🔒 + "Sign in to react & comment" + "Sign in with GitHub" button.
UX-DR14: Detail empty state — centered 📋 + "Select a prompt to view details" in #64748b.
UX-DR15: Prompt editor layout — desktop: 55% editor column | 45% preview column (CSS Grid). Mobile (<768px): tab-based Write | Preview.
UX-DR16: Editor top bar — status badge ("Saved Xm ago" green / "Saving..." yellow / "Unsaved changes" orange), title input (28px, 600 weight, max 120 chars), [Save Draft] (secondary) + [Publish] (primary) buttons. Back link with unsaved changes guard (ConfirmDialog: Save Draft / Discard / Cancel).
UX-DR17: Editor metadata form — Category Select (with colored dot per option), AI Model Select, Difficulty Select, Tags chip input (Enter to add, × to remove, max 5 tags, alphanumeric + hyphens, max 20 chars/tag, duplicate prevention).
UX-DR18: Markdown toolbar — 14 icon buttons: H1, H2, H3, Bold, Italic, Strikethrough, Inline Code, Code Block, Quote, Horizontal Rule, Link, Image. Each wraps selected text or inserts at cursor. Link/Image opens Dialog for URL input. All buttons have aria-label.
UX-DR19: Editor textarea — monospace font (Menlo/Monaco, 13px), min-height 300px, grows with content. Live word/character count display below: "234 words · 1,247 chars".
UX-DR20: Image upload zone — dashed-border area, drag-drop + click to browse. PNG/JPG/WebP up to 5MB. Shows upload progress spinner. On success inserts `![Uploaded image](url)` at cursor. Error messages for oversized or unsupported files.
UX-DR21: Preview pane — rendered markdown + shiki syntax-highlighted code blocks. Rendered | Raw toggle above preview. "Nothing to preview yet" placeholder when content is empty.
UX-DR22: Edit mode indicator — "Editing Version X" badge (yellow/orange) near title when in /prompts/:id/edit route.
UX-DR23: Version history layout — two-panel: 280px left (version list) | flex-1 right (diff view). Mobile: stacked (version list top, diff below) or tabs.
UX-DR24: Version list item — version badge (v1, v2...), author avatar (24px), username, relative date (updated every 60s, full date on tooltip), changelog message. "Current" badge on latest version. [Restore] button hover-visible only on non-current versions; disabled with tooltip for non-authors/maintainers.
UX-DR25: Diff toolbar — "Comparing:" label + two version Select dropdowns (A and B) + [View Raw] toggle + [Side by Side | Unified] layout toggle.
UX-DR26: Diff rendering — side-by-side: two columns with per-column line numbers, removed lines (bg #2e0a0a, text #f87171), added lines (bg #0a2e10, text #4ade80), unchanged lines normal. Unified: single column with − / + / space prefix, color-coded. Monospace font (Menlo/Monaco, 12px). Sections with 5+ consecutive unchanged lines collapse to "… X unchanged lines …" expandable button.
UX-DR27: Version metadata card — author (clickable GitHub profile link), full date+time, changelog message, "+X lines, −Y lines" summary, [View on GitHub ↗] link.
UX-DR28: Restore confirmation dialog — required before any restore action; shows version number and date. Posts new version comment on confirm (non-destructive).
UX-DR29: Admin stats bar — 4 stat cards: Total Prompts, Open/Active, Flagged (red text if > 0), Featured. Clickable cards link to #queue tab.
UX-DR30: Admin tab navigation — shadcn Tabs with hash-based routing (#queue, #labels, #log, #featured). Supports deep-linking.
UX-DR31: Moderation queue — DataTable with columns: checkbox (bulk select + select-all header), title link, author avatar+name, date, flag reason badges, actions ([Approve] green / [Hide] yellow / [Delete] red). Sortable by date, searchable by title. Empty state: "🎉 No flagged prompts".
UX-DR32: Bulk action bar — slides up from bottom when ≥1 row checked. [Bulk Approve] + [Bulk Hide] buttons, disabled during in-flight requests. Disappears and clears selection on completion.
UX-DR33: Label manager — 3-column grid (desktop), 1-column (mobile). Each card: color swatch (24px circle), label name, type badge color-coded (category=purple, model=blue, difficulty=green, state=orange), prompt count, [Edit] + [Delete]. Inline add form with color picker (preset swatches), name input with uniqueness validation, type selector with auto-prefix enforcement.
UX-DR34: Moderation log — table with Action, Target Prompt, Performed By, Date, Outcome columns. Filterable by action type (multiselect) and date range (date picker). Paginated 20 items/page, newest first.
UX-DR35: Featured prompts tab — grid/list of state:featured issues with [Remove from Featured] buttons. Inline search below to find and [Add to Featured]. Empty state: "No featured prompts yet".
UX-DR36: User profile hero — avatar (80px circle, GitHub avatar_url, initials fallback), display name (h1, 24px/700), @username link (↗ opens GitHub), bio (optional, gray placeholder if empty), location, website (↗ external), joined date. [Edit Profile] button (own profile only, opens GitHub settings in new tab).
UX-DR37: Profile stats row — clickable metrics: N Prompts | N Total Votes | N Comments (+ N Saved for own profile). Clicking a stat switches to corresponding tab.
UX-DR38: Profile tabs — Submitted (default), Saved (own profile only), Activity. Tab state in component reactive variable (not URL hash).
UX-DR39: Submitted tab — 2-column prompt card grid (desktop), 1-column (mobile/tablet). Sort toggle [Most Voted | Newest]. Card: title link, category+model tags, description excerpt (2-line truncated), vote count, comment count, date. Bookmark/star icon on card for save/unsave.
UX-DR40: Saved tab — grid of saved prompts with [Remove from saved] (red/danger) button. Own profile only. Backed by localStorage via @vueuse/core useLocalStorage.
UX-DR41: Activity tab — chronological list: action type icon (💬/👍), action text (e.g., "commented on [Prompt Title]"), comment excerpt (50 chars), relative date. Paginated 20 items/page with "Load more" or infinite scroll.
UX-DR42: Profile skeleton loading — placeholder avatar, skeleton text for name/bio, skeleton cards for prompt grid. Replaced by actual content on data load.
UX-DR43: Profile not found state — centered 👤 + "User not found. Check the username and try again." + [Back to Browse] link.
UX-DR44: Mobile profile — avatar 64px (slightly smaller), single column, centered text, stats row horizontal scroll or 2×2, all buttons 48px minimum height.

### FR Coverage Map

FR01: Epic 2 — Any user can browse the full prompt list without authenticating
FR02: Epic 2 — Filter by category (Engineering, Business, General)
FR03: Epic 2 — Filter by AI model
FR04: Epic 2 — Sort by Most Voted / Newest / Most Commented
FR05: Epic 2 — Client-side keyword search via MiniSearch (< 50ms)
FR06: Epic 2 — Read full rendered markdown with syntax-highlighted code blocks
FR07: Epic 2 — View prompt metadata (type, category, model, difficulty, votes, comments, tags, author)
FR08: Epic 2 — Copy prompt to clipboard with a single action
FR09: Epic 2 — Share direct permalink to a prompt
FR10: Epic 2 — Infinite scroll with skeleton loading states
FR11: Epic 3 — Create a new prompt submission with title, markdown, metadata, up to 5 tags
FR12: Epic 3 — Create a skill file as a distinct content type
FR13: Epic 3 — Create a grouped skill set as a distinct content type
FR14: Epic 3 — Add usage instructions to any submission
FR15: Epic 3 — Upload images via drag-and-drop or file picker
FR16: Epic 3 — Live split-pane markdown preview while composing
FR17: Epic 3 — Publish submission as GitHub Issue with YAML frontmatter
FR18: Epic 3 — Edit own existing submission
FR19: Epic 3 — Fork an existing prompt as starting point for new submission
FR20: Epic 3 — Auto-save draft to localStorage every 30 seconds
FR21: Epic 3 — Unsaved changes warning when navigating away
FR22: Epic 5 — Publish updated version with optional changelog message
FR23: Epic 5 — View full version history timeline for a prompt
FR24: Epic 5 — Compare any two versions in side-by-side or unified diff
FR25: Epic 5 — Author or maintainer can restore previous version (non-destructive)
FR26: Epic 5 — Confirm required before restore is applied
FR27: Epic 4 — Add reaction (👍 ❤️ 🚀) with optimistic UI
FR28: Epic 4 — Remove own previously added reaction
FR29: Epic 4 — Post a comment on a prompt
FR30: Epic 4 — Read all comments without authenticating
FR31: Epic 4 — Anonymous user sees sign-in CTA when attempting to react or comment
FR32: Epic 4 — Flag a prompt for moderator review
FR33: Epic 2 — GitHub OAuth popup flow (no page redirect, popup closes automatically)
FR34: Epic 2 — Sign out from the platform
FR35: Epic 6 — View another user's public profile with submissions and stats
FR36: Epic 6 — Own profile with submitted prompts, saved prompts, and activity tabs
FR37: Epic 6 — Bookmark/save a prompt to saved tab (localStorage)
FR38: Epic 6 — Profile displays total vote count and submission count
FR39: Epic 7 — Admin panel access (non-maintainers redirected immediately)
FR40: Epic 7 — Stats overview: total prompts, flagged count, featured count
FR41: Epic 7 — Moderation queue of flagged prompts
FR42: Epic 7 — Approve, hide, or delete prompts from moderation queue
FR43: Epic 7 — Bulk actions across multiple queue items
FR44: Epic 7 — Add, edit, delete GitHub labels with namespace prefix conventions
FR45: Epic 7 — Mark prompts as featured to elevate visibility
FR46: Epic 7 — Moderation log with full action history, filterable by date
FR47: Epic 2 — Global search via ⌘K keyboard shortcut from any screen
FR48: Epic 2 — Navigate Browse (G+B) and New Prompt (G+N) via keyboard shortcuts
FR49: Epic 2 — Toggle light/dark theme, persisted to localStorage
FR50: Epic 2 — Collapse sidebar to icon-only mode (48px)
FR51: Epic 2 — In-app notifications in slide-out notification drawer (authenticated)
FR52: Epic 2 — Mobile sidebar accessible via sheet overlay
FR53: Epic 2 — Browse cached prompts while offline (PWA service worker)
FR54: Epic 2 — Offline write actions queued for sync on connectivity restore

## Epic List

### Epic 1: Foundation & Infrastructure
Engineers have a working project scaffold, Cloudflare edge functions, and a baseline testing harness — the technical precondition for all user-facing epics.
**ARCH items covered:** ARCH-STARTER, ARCH-TS, ARCH-WORKER (OAuth proxy + image upload), ARCH-TWOREPO, ARCH-DEPLOY, ARCH-TEST, ARCH-PWA
**FRs covered:** *(none directly — enables all subsequent FRs)*

### Epic 2: App Shell, Authentication & Browse
Any employee can open the app, navigate the shell, browse/filter/search all prompts anonymously, read full prompt content, and copy prompts to their clipboard — with no login required. Engineers with GitHub accounts can sign in and out, with their identity surfaced throughout the shell.
**FRs covered:** FR01, FR02, FR03, FR04, FR05, FR06, FR07, FR08, FR09, FR10, FR33, FR34, FR47, FR48, FR49, FR50, FR51, FR52, FR53, FR54
**ARCH items covered:** ARCH-VUE, ARCH-STORES (all 5), ARCH-CACHE (3-layer), ARCH-SEARCH (MiniSearch), ARCH-KEYBOARD, ARCH-ERRORS, ARCH-NOTIFY, ARCH-DARK, ARCH-FRONTMATTER (parsing)

### Epic 3: Content Creation & Publishing
Authenticated practitioners can compose prompts, skill files, and grouped skill sets using a full markdown editor with live preview, upload images, auto-save drafts, and publish to the community — creating the content the platform runs on.
**FRs covered:** FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21
**ARCH items covered:** ARCH-FRONTMATTER (serialization), ARCH-OPTIMISTIC (create/update mutations)

### Epic 4: Community Engagement
Authenticated engineers can react to prompts with emoji reactions, post comments, and flag inappropriate content. Anonymous visitors see clear sign-in CTAs at each interaction point. The platform gains its social quality signal layer.
**FRs covered:** FR27, FR28, FR29, FR30, FR31, FR32

### Epic 5: Version History
Any user can view the full edit history of a prompt and compare any two versions in side-by-side or unified diff. Authors and maintainers can restore a previous version non-destructively. Prompts become living documents with full accountability.
**FRs covered:** FR22, FR23, FR24, FR25, FR26

### Epic 6: User Profiles & Bookmarks
Any visitor can view a contributor's public profile showing their submissions and community stats. Authenticated users can manage their own profile view, save useful prompts to a personal bookmark tab, and track their contribution impact over time.
**FRs covered:** FR35, FR36, FR37, FR38

### Epic 7: Administration & Moderation
Maintainers can access the admin panel to review flagged content, perform bulk moderation actions, manage the label taxonomy, curate featured prompts, and audit the full moderation history. Community self-governance is supported with a thin curator safety net.
**FRs covered:** FR39, FR40, FR41, FR42, FR43, FR44, FR45, FR46

## Epic 1: Foundation & Infrastructure

Engineers have a working project scaffold, Cloudflare edge functions, and a baseline testing harness — the technical precondition for all user-facing epics.

### Story 1.1: Scaffold Vue 3 + TypeScript Project

As a developer,
I want the Vue 3 TypeScript project scaffolded with all core dependencies installed and a working local dev server,
So that the team has a clean, correctly-configured foundation to build all features on.

**Acceptance Criteria:**

**Given** the project directory does not yet exist
**When** the scaffold commands are run (`npm create vite@latest prompt-community -- --template vue-ts`, `npx shadcn-vue@latest init`, and all dependency installs)
**Then** the project builds without TypeScript errors, `npm run dev` starts the Vite dev server, and the default app renders in the browser
**And** TypeScript strict mode is enabled in `tsconfig.json`, path alias `@/` → `src/` is configured, and the `src/` folder structure matches the architecture spec (components/ui, components/layout, views, stores, composables, lib, workers, router, types)
**And** Vue Router 5, Pinia 3, TanStack Vue Query 5, @vueuse/core, @octokit/graphql, @octokit/core, markdown-it, shiki, @shikijs/markdown-it, yaml, minisearch, jsdiff, idb-keyval, zod, and vite-plugin-pwa are all installed and importable without errors
**And** ESLint + Prettier are configured (by shadcn-vue init) and `npm run lint` passes on the clean scaffold

### Story 1.2: Configure Cloudflare Pages Deployment

As a developer,
I want the app deployed to Cloudflare Pages with SPA routing correctly configured,
So that the team can access the app at a stable URL for integration testing and the deployment pipeline is ready for all future features.

**Acceptance Criteria:**

**Given** the scaffolded project from Story 1.1
**When** `wrangler deploy` is run for the Pages project
**Then** the app is accessible at the Cloudflare Pages URL and renders without errors
**And** a `public/_redirects` file with `/* /index.html 200` is in place so that deep links (e.g., `/browse`, `/prompts/123`) load the SPA correctly instead of returning 404
**And** the two-repo architecture is documented: data repo name and owner are stored as Cloudflare Pages environment variables (`GITHUB_DATA_REPO_OWNER`, `GITHUB_DATA_REPO_NAME`) and accessible via `import.meta.env` in the app

### Story 1.3: Implement GitHub OAuth Cloudflare Worker

As a developer,
I want a Cloudflare Worker handling GitHub OAuth token exchange,
So that the GitHub client secret is never exposed to the browser and the popup-based sign-in flow has a secure server-side component ready.

**Acceptance Criteria:**

**Given** a GitHub OAuth App is registered with callback URL pointing to the Worker `/callback` endpoint
**When** the Worker `/login` endpoint is called
**Then** it generates a cryptographic UUID `state`, stores it as an `HttpOnly; Secure; SameSite=Lax` cookie, and redirects to GitHub's OAuth authorization URL with correct `client_id`, `scope=public_repo`, and `state` parameters
**When** GitHub redirects to the Worker `/callback` endpoint with `code` and `state`
**Then** the Worker validates the `state` cookie matches the parameter (CSRF check), exchanges the `code` for an access token via GitHub's token endpoint, and returns the token to the opener window via `window.opener.postMessage` so the popup closes automatically
**And** the client secret (`GITHUB_CLIENT_SECRET`) is stored as a Cloudflare Worker secret and never appears in any client-side code or build output (NFR-S2)
**And** the Worker responds with appropriate CORS headers to allow the SPA origin

### Story 1.4: Implement Image Upload Cloudflare Worker

As a developer,
I want a Cloudflare Worker proxying image uploads to Cloudflare R2,
So that users can attach images to prompts without the R2 bucket being publicly writable or exposing storage credentials to the browser.

**Acceptance Criteria:**

**Given** a Cloudflare R2 bucket is configured and bound to the Worker
**When** an authenticated POST request is sent to the Worker `/api/upload` endpoint with multipart form-data containing an image file
**Then** the Worker validates the file type (PNG, JPG, GIF, WebP only) and size (≤ 10MB per NFR-I3), stores the file in R2 with a unique key, and returns JSON `{ url: "https://..." }` with the public-accessible URL
**And** requests missing a valid GitHub token in the Authorization header receive a 401 response
**And** files exceeding 10MB or with unsupported MIME types receive a 400 response with a descriptive error message
**And** the R2 bucket is not publicly accessible directly — only via the Worker proxy (NFR-S6)

### Story 1.5: Configure Vitest Testing Harness

As a developer,
I want Vitest configured with @vue/test-utils and coverage reporting,
So that the team can write and run co-located unit and component tests from day one with no additional setup required.

**Acceptance Criteria:**

**Given** the project from Story 1.1
**When** `npm run test` is executed
**Then** Vitest runs and a sample co-located test (`src/components/ui/Button.spec.ts`) passes
**And** `npm run test:coverage` produces a coverage report via `@vitest/coverage-v8`
**And** the Vitest config finds all `*.spec.ts` files co-located with source files, with jsdom as the test environment for component tests
**And** a basic smoke test for `AppLayout.vue` (renders without errors) is included as a baseline template for future component tests

## Epic 2: App Shell, Authentication & Browse

Any employee can open the app, navigate the shell, browse/filter/search all prompts anonymously, read full prompt content, and copy prompts to their clipboard — with no login required. Engineers with GitHub accounts can sign in and out, with their identity surfaced throughout the shell.

### Story 2.1: App Shell Layout

As any user,
I want a persistent navbar, collapsible sidebar, and router-view content area on every page,
So that I can navigate the app and understand its structure from my very first visit.

**Acceptance Criteria:**

**Given** the app loads at any route
**When** the page renders
**Then** a 48px fixed navbar (bg #13131a, 1px border #2a2a3a) is visible at the top containing: logo/app name (left, links to /browse), search bar placeholder (center), notification bell (right), sign-in button (right)
**And** a 200px sidebar (bg #13131a, right border #2a2a3a) is rendered with a BROWSE section (All Prompts, Trending, Recent), SORT section (Most Voted, Newest, Most Discussed), and a version badge at the bottom
**And** the `<RouterView />` container occupies the remaining space (flex-grow, bg #08080f)
**And** clicking the sidebar collapse toggle (or pressing `[`) animates the sidebar width from 200px to 48px in 0.3s; text labels hide, icons remain visible, and a tooltip appears on hover per icon (NFR-A5)
**And** `useUIStore` is wired: `sidebarCollapsed` drives the sidebar width; `notificationDrawerOpen` is scaffolded

### Story 2.2: Sidebar Category, Model & Sort Filters

As any user,
I want to filter the prompt list by category and AI model and sort by votes, date, or comments from the sidebar,
So that I can quickly narrow to content relevant to my work without any search typing.

**Acceptance Criteria:**

**Given** the app shell from Story 2.1
**When** the user clicks a category item (Coding, Writing, Analysis, Creative, System, Other)
**Then** `usePromptsStore.filterState.category` is set to that value, the item highlights (bg #1e1b4b, 3px left border #7c3aed, text #c4b5fd), and TanStack Query refetches the prompt list with the new filter
**And** the CATEGORIES section shows a colored dot per category and is collapsible; only one category is active at a time (radio behavior)
**And** the AI MODELS section (GPT-4, Claude, Gemini, Llama, Other) follows the same radio behavior via `usePromptsStore.filterState.model`
**And** the SORT section (Most Voted, Newest, Most Discussed) sets `usePromptsStore.sortOrder` with radio behavior
**And** all five Pinia stores are scaffolded with TypeScript interfaces: `useAuthStore`, `usePromptsStore`, `useUIStore`, `useSearchStore`, `useDraftStore`
**And** the ADMIN section placeholder is present in sidebar markup, hidden until `useAuthStore.isMaintainer` is true (with red accent #ef4444)

### Story 2.3: GitHub OAuth Sign-In & Sign-Out

As any user,
I want to sign in with my GitHub account via a popup and sign out cleanly,
So that I can authenticate without a page redirect and my session token never persists to localStorage.

**Acceptance Criteria:**

**Given** the user is unauthenticated
**When** they click "Sign in with GitHub"
**Then** a popup opens to the CF Worker `/login` endpoint, GitHub OAuth completes, the Worker posts the token via `window.opener.postMessage`, the popup closes automatically, and `useAuthStore.isAuthenticated` becomes true (NFR-P5: < 5s)
**And** the token is stored only in Pinia memory — never in localStorage, sessionStorage, or cookies (NFR-S1)
**And** the navbar replaces the sign-in button with the user's GitHub avatar (32px circle, initials fallback) and a DropdownMenu with Profile and Sign Out options
**And** the `+New` button appears in the navbar only when `isAuthenticated` is true (rendered via `v-if`, not just visually hidden)
**And** on Sign Out, the token is cleared from Pinia, `isAuthenticated` becomes false, and the user remains on the current page
**And** maintainer status is resolved by calling the GitHub collaborators API on login and stored in `useAuthStore.isMaintainer`

### Story 2.4: Browse Master Panel — Prompt List

As any user,
I want to see a paginated list of prompts with metadata, filter chips, and skeleton loading states,
So that I can browse the full community contribution library without signing in.

**Acceptance Criteria:**

**Given** the user navigates to `/browse`
**When** the page loads
**Then** a master panel (default 320px, bg #13131a) renders with a search input ("Filter prompts..."), result count, and a list of `PromptCard` rows fetched via a single GraphQL query to the data repo (NFR-P2: < 2s)
**And** each `PromptCard` row (~65px height) shows: author avatar (18px circle), author + relative timestamp, title (bold, one-line truncated), tag chips (category, model, difficulty), vote count and comment count
**And** all GitHub GraphQL requests include `If-None-Match` ETag headers and handle 304 responses without re-rendering (NFR-SC2, NFR-I1)
**And** as the user scrolls near the bottom, the next page is fetched and appended (infinite scroll via `useIntersectionObserver`) with 3–5 skeleton pulse rows shown during fetch (FR10)
**And** when filters produce zero results, an empty state shows: centered icon + "No prompts found" + "Clear filters" button
**And** active filter chips (category, model) appear below the search input with × to remove individual filters
**And** clicking a prompt row highlights it (bg #1a1a2e, 3px left border #7c3aed) and navigates to `/prompts/:id`

### Story 2.5: Browse Detail Panel — Prompt View

As any user,
I want to read the full rendered content of a selected prompt with syntax-highlighted code blocks and copy the prompt to my clipboard,
So that I can evaluate the prompt and immediately use it in my AI tool.

**Acceptance Criteria:**

**Given** the user clicks a prompt row in the master panel
**When** the detail panel loads
**Then** a sticky header (40px, bg #13131a, border-bottom #2a2a3a) shows the prompt title (truncated) and action buttons: [Copy], [History], [Share]
**And** the detail content area shows: large title (22px bold), tag chips (category, model, difficulty), stats row (vote count, comment count, timestamp), and the full prompt body rendered by `markdown-it` 14 with `shiki` 4 syntax highlighting via `@shikijs/markdown-it` — all `v-html` output sanitized to prevent XSS (FR06)
**And** each code block has a dark background (#12121e), a language badge, and a per-block copy button that copies the code and shows brief "Copied!" feedback
**And** [Copy] in the sticky header copies the full prompt markdown to clipboard via `useClipboard()` and shows a "Copied!" toast for 2 seconds (FR08)
**And** [Share] copies the direct permalink `/prompts/:id` to clipboard with a "Link copied!" toast (FR09)
**And** when no prompt is selected, the detail panel shows the empty state: centered 📋 + "Select a prompt to view details"
**And** the detail panel uses semantic HTML: `<article>` wrapper, `<h1>`–`<h3>` hierarchy, `<pre><code>` for code blocks (NFR-A1)

### Story 2.6: MiniSearch Client-Side Search & Command Palette

As any user,
I want to search prompts in real-time using a Command palette that opens with ⌘K, with results appearing under 50ms,
So that I can find specific content across the entire library without any API calls or waiting.

**Acceptance Criteria:**

**Given** the app loads
**When** all open issues are fetched (paginated, per_page=100) during initialization
**Then** a MiniSearch 7 index is built in memory supporting title, body, and tag fields with prefix and fuzzy matching, and persisted to IndexedDB via `idb-keyval` for reuse on subsequent visits
**When** the user presses ⌘K or clicks the search bar
**Then** the shadcn `Command` palette opens, showing real-time results as the user types with results appearing in < 50ms (NFR-P3), supporting arrow key navigation and Enter to navigate to `/prompts/:id`
**And** the master panel filter input also uses the MiniSearch index for real-time in-panel filtering (FR05)
**And** `useSearchStore.query` and `useSearchStore.results` are updated reactively as the user types
**And** the index is invalidated and rebuilt when the authenticated user publishes or edits a prompt (NFR-I4)

### Story 2.7: Global Keyboard Shortcuts

As any user,
I want to navigate the app using keyboard shortcuts including chord sequences,
So that I can work at speed without reaching for the mouse.

**Acceptance Criteria:**

**Given** focus is not inside a text input, textarea, or select element
**When** the user presses ⌘K (or `/`)
**Then** the global search Command palette opens (FR47)
**When** the user presses `[`
**Then** the sidebar toggles between 200px and 48px (FR50)
**When** the user presses `G` then `B` within 1000ms
**Then** the router navigates to `/browse` (FR48)
**When** the user presses `G` then `N` within 1000ms
**Then** the router navigates to `/prompts/new` if authenticated; if not authenticated, shows a toast "Sign in to create a prompt" (FR48)
**And** a `useKeyboardShortcuts` composable implements all shortcuts via `@vueuse/core` `useEventListener('keydown')` with timeout-based chord sequence detection
**And** all shortcuts are suppressed when `document.activeElement` is an `<input>`, `<textarea>`, or `<select>`

### Story 2.8: Dark/Light Theme Toggle

As any user,
I want to toggle between dark and light themes with my preference remembered across sessions,
So that I can use the app comfortably in any lighting environment.

**Acceptance Criteria:**

**Given** the user's first visit
**When** the app loads
**Then** the theme matches the user's system preference detected via `@vueuse/core` `useDark()`
**When** the user clicks the theme toggle button in the navbar
**Then** the theme switches between dark and light modes and the preference is persisted to localStorage (FR49)
**And** all shadcn-vue components adapt correctly via Tailwind CSS 4 `dark:` variants in both modes
**And** text meets 4.5:1 colour contrast ratio in both light and dark mode (NFR-A4)
**And** the toggle button is keyboard-accessible with a visible 2px solid focus indicator (NFR-A2)

### Story 2.9: Notification Drawer

As an authenticated user,
I want to see my GitHub notifications in a slide-out drawer without leaving the current page,
So that I can stay informed about activity on my prompts without interrupting my browsing.

**Acceptance Criteria:**

**Given** the user is authenticated
**When** the page loads or the route changes
**Then** the GitHub Notifications API (`GET /notifications`) is called once (no polling), the unread count is stored in `useUIStore.notificationCount`, and the bell badge in the navbar reflects that count (FR51)
**When** the user clicks the notification bell
**Then** a shadcn `Sheet` slides in from the right showing a scrollable list of notifications, each with action description, relative timestamp, and a link to the related prompt
**And** clicking a notification navigates to the related prompt and closes the drawer
**And** closing the drawer via the X button or Escape sets `notificationDrawerOpen = false`
**And** the badge count is announced via `aria-live="polite"` for screen readers (NFR-A3)
**And** unauthenticated users see the bell icon without a badge; clicking it shows "Sign in to view notifications"

### Story 2.10: PWA & Offline Support

As any user,
I want to browse previously cached prompts while offline and have my write actions queued for when connectivity returns,
So that a lost connection doesn't stop me from referencing saved content.

**Acceptance Criteria:**

**Given** the app has been visited at least once while online
**When** the user goes offline and navigates to `/browse`
**Then** the cached prompt list and previously viewed detail panels are served by the Workbox service worker without any network error (FR53, NFR-R3)
**And** `vite-plugin-pwa` Workbox config applies `StaleWhileRevalidate` for GitHub API responses and `CacheFirst` for R2 images and static assets
**When** the user attempts a write action while offline
**Then** a toast shows "You're offline — this action will sync when you reconnect" and the action is queued for background sync on reconnect (FR54)
**And** the PWA manifest and service worker are present (app is installable) but no forced install prompt is shown

### Story 2.11: Mobile Responsive Shell

As a user on mobile or tablet,
I want the sidebar accessible as a sheet overlay and the master-detail layout to adapt to my screen size,
So that I can use the full app on a phone without controls being unreachable or the layout breaking.

**Acceptance Criteria:**

**Given** the viewport is less than 640px (mobile)
**When** the page loads
**Then** the sidebar is hidden by default; a hamburger icon in the navbar opens it as a shadcn `Sheet` overlay containing all sidebar sections (BROWSE, CATEGORIES, AI MODELS, SORT) (FR52)
**And** the master-detail layout stacks vertically: the master list fills the screen; selecting a prompt shows the detail panel full-screen with a back arrow to return to the list
**And** all tap targets are ≥ 44px height (WCAG AA, NFR-A2)
**When** the viewport is 640–1023px (tablet)
**Then** the sidebar defaults to collapsed icon-only (48px), is expandable by the user, and the master panel narrows to ~280px
**And** `@vueuse/core` `useWindowSize()` drives breakpoint-responsive layout decisions throughout the shell components

## Epic 3: Content Creation & Publishing

Authenticated practitioners can compose prompts, skill files, and grouped skill sets using a full markdown editor with live preview, upload images, auto-save drafts, and publish to the community — creating the content the platform runs on.

### Story 3.1: Prompt Editor Shell, Auth Guard & Metadata Form

As an authenticated contributor,
I want to open a full-page editor with a metadata form and be redirected to sign in if I'm not authenticated,
So that I can start composing a prompt with all the required fields available immediately.

**Acceptance Criteria:**

**Given** an unauthenticated user navigates to `/prompts/new`
**When** the route guard runs
**Then** the user is shown the GitHub OAuth prompt before the editor renders
**Given** an authenticated user navigates to `/prompts/new`
**When** the editor loads in create mode
**Then** `PromptEditorView.vue` renders with: a top bar containing a back link, dynamic status badge, [Save Draft] and [Publish] buttons; a title input (28px, 600 weight, max 120 chars); and the metadata form with Category Select, AI Model Select, Difficulty Select, and Tags chip input
**And** the tags chip input accepts Enter to add a tag, × to remove, enforces max 5 tags and alphanumeric + hyphen validation, and prevents duplicates (FR11)
**And** selecting "Skill File" or "Grouped Skill Set" from a content type selector sets the appropriate type on the draft (FR12, FR13)
**And** `useDraftStore` is initialized with empty state for create mode; all form inputs bind to `useDraftStore` via v-model and set `isDirty = true` on any change

### Story 3.2: Markdown Editor with Live Preview

As an authenticated contributor,
I want to write my prompt in a markdown editor with a 14-button formatting toolbar and see it rendered live in a preview pane,
So that I can craft well-formatted content and verify its appearance before publishing.

**Acceptance Criteria:**

**Given** the editor from Story 3.1
**When** the user types in the editor textarea
**Then** the preview pane updates (debounced 300ms) showing rendered markdown via `markdown-it` 14 with `shiki` 4 syntax highlighting for code blocks (FR16)
**And** the desktop layout is 55% editor column | 45% preview column (CSS Grid); on mobile (< 768px) two tabs "Write" and "Preview" replace the side-by-side layout
**And** the markdown toolbar renders 14 icon buttons: H1, H2, H3, Bold, Italic, Strikethrough, Inline Code, Code Block, Quote, Horizontal Rule, Link, Image; each wraps selected text in the appropriate syntax or inserts at cursor; Link and Image open a Dialog for URL input
**And** the editor textarea uses monospace font (Menlo/Monaco, 13px), min-height 300px, grows with content, and supports Tab key for 2-space indentation
**And** a real-time word and character count is displayed below the editor: "N words · N chars"
**And** all toolbar buttons have `aria-label` for screen reader accessibility (NFR-A1)
**And** a Rendered | Raw toggle above the preview pane switches between parsed HTML and raw markdown source

### Story 3.3: Auto-Save Draft & Unsaved Changes Guard

As an authenticated contributor,
I want my draft saved automatically every 30 seconds and to be warned if I try to navigate away with unsaved changes,
So that I never lose work due to an accidental click or browser crash.

**Acceptance Criteria:**

**Given** the user is composing in the editor
**When** 30 seconds elapse since the last save
**Then** the current `useDraftStore` state is written to `localStorage` under key `draft:new` (or `draft:${id}` in edit mode) and `useDraftStore.lastSaved` is updated (FR20, NFR-P6: < 100ms, NFR-R4)
**And** the top bar status badge reflects the state: "Saved Xm ago" (green) after save, "Saving..." (yellow) during write, "Unsaved changes" (orange) when `isDirty = true` and save is pending
**And** [Save Draft] manually triggers the same localStorage save immediately and shows a "Draft saved" toast
**When** the user navigates away via back link or browser back button while `isDirty = true`
**Then** a `ConfirmDialog` appears with three options: "Save Draft" (saves then navigates), "Discard" (clears draft and navigates), "Cancel" (stays on page) (FR21)
**And** when the user returns to `/prompts/new`, any existing draft from localStorage is restored into all form fields automatically (NFR-R4)

### Story 3.4: Image Upload via Cloudflare R2

As an authenticated contributor,
I want to upload images by dragging them onto the editor or clicking to browse,
So that I can include visual examples or diagrams in my prompt without leaving the editor.

**Acceptance Criteria:**

**Given** the user is in the editor
**When** they drag a PNG, JPG, or WebP file (≤ 5MB) onto the upload zone or click it to browse
**Then** the file is POSTed to the CF Worker `/api/upload` endpoint with the user's GitHub token in the Authorization header, a progress spinner is shown during upload, and on success `![Uploaded image](r2-url)` is inserted at the current cursor position in the editor (FR15)
**And** the upload zone shows a dashed border, upload icon, and "Drop image here or click to upload" in its default state
**And** files exceeding 5MB show a toast error: "File too large — maximum 5MB"
**And** unsupported file types show a toast error: "Unsupported format — use PNG, JPG, or WebP"
**And** network errors during upload show a toast error with a retry option (NFR-R2)

### Story 3.5: Publish & Edit Prompt

As an authenticated contributor,
I want to publish my prompt as a GitHub Issue and edit it later,
So that my content becomes visible to the community and I can keep it up to date.

**Acceptance Criteria:**

**Given** the user has filled in title and content and clicks [Publish] (or presses ⌘↵)
**When** the form is validated (title non-empty, content non-empty)
**Then** a GitHub Issue is created in the data repo with the body containing YAML frontmatter followed by markdown content: `category`, `model`, `difficulty`, `tags` (max 5), `version: 1`, `changelog: "Initial prompt"` — serialized via `serializeFrontmatter()` (FR17)
**And** the appropriate GitHub labels (`category:coding`, `model:claude`, `difficulty:intermediate`) are applied to the issue on creation
**And** on success the TanStack Query prompts cache is invalidated, the MiniSearch index is updated, and the user is navigated to `/prompts/:newId` with a "Prompt published!" toast
**And** if title or content is empty, inline validation errors are shown beneath the fields and the API call is not made (ARCH-ERRORS)
**And** GitHub REST 401, 403, and 422 errors are caught and displayed as descriptive toast messages — no silent failure (NFR-I2)
**When** the user navigates to `/prompts/:id/edit`
**Then** the editor pre-populates all fields from the existing issue (parsed via `parseFrontmatter()`) and shows an "Editing Version X" badge; publishing calls PATCH on the existing issue (FR18)
**And** keyboard shortcut ⌘S saves the draft; ⌘↵ triggers publish

### Story 3.6: Fork Existing Prompt

As an authenticated contributor,
I want to fork an existing prompt as the starting point for a new submission,
So that I can build on colleagues' work without modifying their original.

**Acceptance Criteria:**

**Given** the user is viewing a prompt in the detail panel and clicks [Fork]
**When** the fork action runs
**Then** the user is navigated to `/prompts/new` with all editor fields pre-populated from the source prompt: title prefixed with "Fork of: ", content, category, model, difficulty, and tags (FR19)
**And** the draft is saved to `useDraftStore` and localStorage as a new draft without overwriting any existing draft
**And** if the user is unauthenticated, the [Fork] button is disabled with a tooltip "Sign in to fork"
**And** when published, the forked prompt creates a new GitHub Issue — it does not modify the source issue in any way
**And** the status badge shows "Unsaved changes" immediately so the user knows they have a new draft to work with

## Epic 4: Community Engagement

Authenticated engineers can react to prompts with emoji reactions, post comments, and flag inappropriate content. Anonymous visitors see clear sign-in CTAs at each interaction point. The platform gains its social quality signal layer.

### Story 4.1: Emoji Reactions with Optimistic UI

As an authenticated user,
I want to react to a prompt with 👍, ❤️, or 🚀 and see the count update instantly,
So that I can signal which prompts are valuable without waiting for the API to confirm.

**Acceptance Criteria:**

**Given** the user is viewing a prompt's detail panel
**When** the reactions bar renders
**Then** three toggle buttons (👍 ❤️ 🚀) are shown, each displaying the current reaction count; buttons the user has already reacted to are highlighted (bg #1e1b4b, border #7c3aed, text #a78bfa); unreacted buttons are muted (FR27, FR28)
**When** an authenticated user clicks a reaction button
**Then** the optimistic mutation runs immediately: the local count updates and the button state toggles before the API call — using the TanStack Query 5-step pattern (cancel in-flight → snapshot → apply optimistic → rollback on error → invalidate on success)
**And** the GitHub GraphQL `addReaction` or `removeReaction` mutation is sent in the background; on error the optimistic update is rolled back and a toast shows the failure (ARCH-OPTIMISTIC, NFR-I2)
**And** vote count updates are announced via `aria-live="polite"` for screen readers (NFR-A3)
**When** an unauthenticated user clicks a reaction button
**Then** the sign-in CTA is shown: "Sign in to react & comment" + "Sign in with GitHub" button (FR31)

### Story 4.2: Comments — Read, Post & Auth CTA

As any user,
I want to read all comments on a prompt without signing in, and as an authenticated user post my own comments,
So that I can learn from the community's feedback and contribute my own perspective.

**Acceptance Criteria:**

**Given** any user opens a prompt's detail panel
**When** the comments section loads
**Then** all comments are fetched via `useCommentsQuery(promptId)` and displayed in chronological order; each comment shows: author avatar (32px), author name (bold, #c4b5fd), relative timestamp, and rendered markdown body (FR30)
**And** the comment count in the section header "Comments (N)" updates when new comments are added, announced via `aria-live="polite"` (NFR-A3)
**When** an authenticated user types in the comment textarea and clicks Submit
**Then** `useCreateCommentMutation(promptId, text)` is called, the new comment is optimistically appended to the list, the textarea clears, and the count increments (FR29, ARCH-OPTIMISTIC)
**And** the Submit button is disabled when the textarea is empty; GitHub API errors show a toast and the optimistic comment is rolled back (NFR-I2, NFR-R2)
**When** an unauthenticated user scrolls to the comment composer area
**Then** a CTA card is shown in place of the composer: 🔒 + "Sign in to react & comment" + "Sign in with GitHub" button that triggers `useAuthStore.login()` (FR31)

### Story 4.3: Flag Prompt for Moderation

As an authenticated user,
I want to flag a prompt that violates community standards,
So that moderators can review and remove harmful or spammy content.

**Acceptance Criteria:**

**Given** the user is viewing a prompt's detail panel and opens the [⋯] more menu
**When** the dropdown renders
**Then** a "Flag this prompt" option is visible to authenticated users only (FR32)
**When** the user clicks "Flag this prompt"
**Then** a confirmation dialog appears: "Flag this prompt for moderator review?" with [Confirm] and [Cancel] buttons
**And** on confirmation, the `state:flagged` label is added to the GitHub Issue via the REST API and a toast confirms "Prompt flagged for review — thank you"
**And** if the `state:flagged` label is already present, the option is disabled with tooltip "Already flagged"
**And** unauthenticated users do not see the "Flag" option in the menu

## Epic 5: Version History

Any user can view the full edit history of a prompt and compare any two versions in side-by-side or unified diff. Authors and maintainers can restore a previous version non-destructively. Prompts become living documents with full accountability.

### Story 5.1: Version History View & Timeline

As any user,
I want to see the full edit history of a prompt as a chronological list,
So that I can understand how the prompt has evolved and who contributed each change.

**Acceptance Criteria:**

**Given** any user navigates to `/prompts/:id/versions`
**When** the page loads
**Then** `usePromptVersions(id)` fetches all GitHub issue comments, filters those whose body starts with `## Version N — YYYY-MM-DD`, and parses each into a `VersionObject { version, date, author, message, content, commentId }` (FR23)
**And** the left panel (280px on desktop) renders a scrollable version list in chronological order; each item shows: version badge (v1, v2...), author avatar (24px), username, relative timestamp (updated every 60s, full date on tooltip), and changelog message
**And** the latest version is marked with a "Current" badge; on first load the latest version is auto-selected and shown in the right panel
**And** if only one version exists, the right panel shows "This is the original prompt. No previous versions to compare." and no [Restore] button appears (FR23)
**And** on mobile (< 768px) the layout stacks: version list at top (max-height 300px), diff panel below

### Story 5.2: Side-by-Side & Unified Diff View

As any user,
I want to compare any two versions of a prompt in side-by-side or unified diff view,
So that I can see exactly what changed between edits before deciding whether to restore.

**Acceptance Criteria:**

**Given** a version is selected in the list
**When** the diff view renders
**Then** the previous version is auto-selected as version A and the selected version as version B; `jsdiff` computes a line-by-line diff client-side (FR24)
**And** a toolbar above the diff shows: "Comparing:" label, two version Select dropdowns (A and B) populated with all available versions, [View Raw] toggle, and [Side by Side | Unified] layout toggle
**And** in Side by Side mode: two columns with per-column line numbers; removed lines have bg #2e0a0a and text #f87171; added lines have bg #0a2e10 and text #4ade80; unchanged lines are normal; monospace font (Menlo/Monaco, 12px)
**And** in Unified mode: a single column with − (red) / + (green) / space prefix per line, color-coded identically
**And** sections with 5 or more consecutive unchanged lines collapse into a "… X unchanged lines …" button that expands on click
**And** [View Raw] switches the right panel to display the full raw markdown of version B with `shiki` syntax highlighting
**And** a metadata card below the diff shows: author (clickable GitHub profile link), full date + time, changelog message, "+X lines, −Y lines" summary, and a [View on GitHub ↗] link to the issue comment

### Story 5.3: Restore Previous Version

As an author or maintainer,
I want to restore a previous version of a prompt with a confirmation step,
So that I can safely roll back a broken edit without permanently destroying any history.

**Acceptance Criteria:**

**Given** the user is viewing the version history
**When** they hover over a non-current version item in the list
**Then** a [Restore] button becomes visible; if the user is neither the prompt author nor a maintainer, the button is disabled with tooltip "Only the author or maintainer can restore" (FR25)
**When** an authorized user clicks [Restore] on a non-current version
**Then** a `ConfirmDialog` appears: "Restore version N (YYYY-MM-DD)? A new version will be created with the old content." with [Confirm] and [Cancel] (FR26)
**And** on confirmation, `useRestoreVersion(promptId, versionCommentId)` POSTs a new GitHub issue comment with header `## Version M — YYYY-MM-DD` and the full content from the selected version — the original comment is never deleted (non-destructive) (FR25)
**And** on success, `usePromptVersions` cache is invalidated, the version list refreshes showing the new version M, and the user sees a "Version restored" toast
**And** GitHub API errors during restore show a toast with the error message and a retry option (NFR-I2, NFR-R2)

## Epic 6: User Profiles & Bookmarks

Any visitor can view a contributor's public profile showing their submissions and community stats. Authenticated users can manage their own profile view, save useful prompts to a personal bookmark tab, and track their contribution impact over time.

### Story 6.1: Public Profile Hero & Stats

As any user,
I want to view a contributor's public profile showing their avatar, bio, and contribution stats,
So that I can learn who is creating the best prompts and discover more of their work.

**Acceptance Criteria:**

**Given** any user navigates to `/users/:username`
**When** the page loads
**Then** `useUserProfile(username)` fetches the GitHub user via `GET /users/:username` and displays: avatar (80px circle, `avatar_url`, initials fallback), display name (`<h1>`), @username link with ↗ (opens GitHub profile in new tab), bio (gray placeholder "No bio yet" if empty), location, website link (↗, optional), and "Joined [Month Year]" date (FR35)
**And** a stats row shows clickable metrics: N Prompts | N Total Votes | N Comments; clicking a stat switches to the corresponding tab (FR38)
**And** all data is limited to GitHub public profile fields — no PII beyond what GitHub already exposes publicly (NFR-S5)
**And** while data is loading, skeleton placeholders show for avatar, name/bio, and the prompt grid
**And** if the GitHub username does not exist (404), a centered error state shows: 👤 + "User not found. Check the username and try again." + [Back to Browse] link — no crash or raw error (FR35)
**And** on mobile (< 640px) avatar is 64px, layout is single column centered, all buttons are ≥ 44px height

### Story 6.2: Submitted Prompts Tab

As any user,
I want to see all prompts a contributor has submitted, sorted by votes or date,
So that I can explore their best work and discover quality content through trusted community members.

**Acceptance Criteria:**

**Given** the profile page from Story 6.1
**When** the Submitted tab is active (default on load)
**Then** `useUserPrompts(username)` fetches all open issues authored by the user from the data repo and renders them in a 2-column grid (desktop) / 1-column (mobile/tablet) (FR35)
**And** each prompt card shows: title (clickable link to `/prompts/:id`), category + model tag chips, description excerpt (2-line truncated with ellipsis), vote count, comment count, and relative submission date
**And** a sort toggle [Most Voted | Newest] above the grid re-fetches with the appropriate sort parameter; the active sort is visually highlighted
**And** clicking any part of the prompt card navigates to `/prompts/:id`
**And** if the user has no submitted prompts, an empty state shows: "🎉 [username] hasn't submitted any prompts yet"; on own profile a CTA button [Submit your first prompt] links to `/prompts/new`
**And** the [Edit Profile] button is visible only when the authenticated user is viewing their own profile (compare `useAuthStore.user.login === route.params.username`); clicking opens `https://github.com/settings/profile` in a new tab (FR36)

### Story 6.3: Saved Prompts & Bookmark Management

As an authenticated user,
I want to bookmark prompts and access them in my profile's Saved tab,
So that I can quickly return to prompts I find useful without searching again.

**Acceptance Criteria:**

**Given** an authenticated user is viewing any prompt's detail panel
**When** they click the bookmark icon
**Then** the prompt's issue ID is added to `useLocalStorage('savedPrompts', [])` via `@vueuse/core`, the bookmark icon fills visually, and the "N Saved" count in their profile stats row increments (FR37)
**And** clicking the bookmark icon again removes the ID from localStorage, the icon becomes unfilled, and the count decrements
**When** the authenticated user views their own profile and clicks the Saved tab
**Then** the tab is visible (hidden on other users' profiles) and shows a grid of saved prompt cards resolved from the localStorage IDs (FR36)
**And** each saved card has a [Remove from saved] button (red/danger styling) that removes the ID from localStorage and optimistically removes the card from the grid
**And** if the Saved tab is empty, the empty state shows: "No saved prompts yet. Browse prompts and bookmark the ones you want to revisit."

### Story 6.4: Activity Tab

As any user,
I want to see a contributor's recent commenting activity,
So that I can understand how they engage with the community and discover prompts they've found interesting.

**Acceptance Criteria:**

**Given** the user clicks the Activity tab on any profile
**When** the tab loads
**Then** `useUserActivity(username, page)` fetches the user's recent comments on prompts and renders a chronological list; each item shows: 💬 icon, "commented on [Prompt Title]" (title is a link to `/prompts/:id`), comment excerpt (max 50 chars, truncated), and relative date (FR36)
**And** a "Load more" button or infinite scroll loads the next page of 20 activity items
**And** if the user has no activity, the empty state shows: "No activity yet. [username] hasn't commented on any prompts."
**And** all activity links are keyboard-accessible with visible focus indicators (NFR-A2)

## Epic 7: Administration & Moderation

Maintainers can access the admin panel to review flagged content, perform bulk moderation actions, manage the label taxonomy, curate featured prompts, and audit the full moderation history. Community self-governance is supported with a thin curator safety net.

### Story 7.1: Admin Panel Access Control & Stats Overview

As a maintainer,
I want to access a dedicated admin panel that is immediately inaccessible to non-maintainers, showing a live stats overview,
So that I have a single workspace for platform governance without non-maintainers ever seeing admin controls.

**Acceptance Criteria:**

**Given** a non-maintainer (or unauthenticated) user navigates to `/admin`
**When** the route guard runs
**Then** they are immediately redirected to `/browse` and shown a red error toast "Access Denied: Only maintainers can view this page" — no admin content ever renders (FR39, NFR-S4)
**Given** a maintainer navigates to `/admin`
**When** the page loads
**Then** maintainer status is verified by calling the GitHub collaborators API before rendering any content — client-side `isMaintainer` flag alone is not sufficient (NFR-S4)
**And** a stats bar displays four stat cards: Total Prompts (all open issues), Open/Active, Flagged (count of `state:flagged` issues — red text if > 0), and Featured (count of `state:featured` issues) (FR40)
**And** clicking the Flagged or Total Prompts card navigates to the `#queue` tab
**And** hash-based tab navigation renders four tabs: Moderation Queue (#queue, default), Label Manager (#labels), Moderation Log (#log), Featured Prompts (#featured); the URL hash updates on tab click and deep-links work on page load (FR41)
**And** the ADMIN section in the sidebar shows a badge with the current flagged count

### Story 7.2: Moderation Queue — Individual Actions

As a maintainer,
I want to review flagged prompts one at a time and approve, hide, or delete each from a sortable table,
So that I can handle community reports efficiently without navigating away from the admin panel.

**Acceptance Criteria:**

**Given** the maintainer is on the Moderation Queue tab
**When** the queue loads
**Then** all issues with `state:flagged` label are fetched via `useAdminQueue()` and displayed in a DataTable with columns: checkbox, title (link to `/prompts/:id`), author avatar + name, date flagged, flag reason label badges, and action buttons [Approve] (green) / [Hide] (yellow) / [Delete] (red) (FR41, FR42)
**And** the table is sortable by date (newest first by default) and searchable by title; empty state shows "🎉 No flagged prompts" in green
**When** the maintainer clicks [Approve]
**Then** the `state:flagged` label is removed via `useRemoveLabelFromIssue`; the row is removed optimistically; on error the row reappears and a toast shows the failure (FR42, ARCH-OPTIMISTIC)
**When** the maintainer clicks [Hide]
**Then** the `state:hidden` label is added and the issue is closed; the row is removed optimistically; a toast confirms "Prompt hidden & closed" (FR42)
**When** the maintainer clicks [Delete]
**Then** the issue is closed via `useCloseIssue`; the row is removed optimistically; a toast confirms "Prompt deleted" (FR42)
**And** all mutations invalidate `['admin', 'queue']` and stats bar queries so counts update automatically (FR40)

### Story 7.3: Moderation Queue — Bulk Actions

As a maintainer,
I want to select multiple flagged prompts and approve or hide them all at once,
So that I can clear a large backlog of reports in seconds rather than clicking through each one individually.

**Acceptance Criteria:**

**Given** the maintainer is on the Moderation Queue tab
**When** they check one or more row checkboxes
**Then** a bulk action bar slides up from the bottom of the screen containing [Bulk Approve] and [Bulk Hide] buttons; buttons are disabled during in-flight requests (FR43)
**When** the maintainer clicks [Bulk Approve]
**Then** `useRemoveLabelFromIssue` is called in parallel for all selected rows via `Promise.all()`; all rows are removed optimistically; on completion the bulk bar disappears and selection clears; a toast confirms "N prompts approved" (FR43)
**When** the maintainer clicks [Bulk Hide]
**Then** `useAddLabelToIssue('state:hidden')` and `useCloseIssue` are called in parallel for all selected rows; all rows are removed optimistically; a toast confirms "N prompts hidden" (FR43)
**And** if any individual mutation in the batch fails, a toast lists the failures and successfully actioned rows remain removed
**And** a "Select all" checkbox in the table header selects all visible rows at once

### Story 7.4: Label Manager

As a maintainer,
I want to add, edit, and delete GitHub labels with namespace prefix conventions enforced,
So that the platform's category taxonomy stays clean and consistent without requiring direct GitHub UI access.

**Acceptance Criteria:**

**Given** the maintainer is on the Label Manager tab
**When** the tab loads
**Then** all repository labels are fetched via `useAllLabels()` and displayed in a 3-column grid (desktop) / 1-column (mobile); each label card shows: colored swatch (24px circle), label name, type badge color-coded by prefix (category=purple, model=blue, difficulty=green, state=orange, custom=gray), prompt count, [Edit] and [Delete] buttons (FR44)
**And** an inline add form below the grid has: a color picker with preset swatches, a name input with real-time uniqueness validation, and a type selector (category | model | difficulty | state | custom) that auto-prepends the appropriate prefix (e.g., selecting "model" auto-prefixes with "model:")
**When** the maintainer fills the form and clicks [Add Label]
**Then** the label is created in GitHub; the new card appears instantly in the grid; the form clears; if the label name already exists, an inline validation error appears without an API call (FR44)
**When** the maintainer clicks [Edit] on a label card
**Then** an inline edit form opens allowing color and name changes; [Save] calls `PATCH /repos/:owner/:repo/labels/:name` and the card updates instantly (FR44)
**When** the maintainer clicks [Delete] on a label card
**Then** a confirmation popover appears "Remove this label from N prompts?"; confirming calls `DELETE /repos/:owner/:repo/labels/:name`; the card disappears; conflict errors show a descriptive toast (FR44)

### Story 7.5: Featured Prompts Management

As a maintainer,
I want to mark high-quality prompts as featured and remove the featured status when needed,
So that the best community contributions get elevated visibility for all users.

**Acceptance Criteria:**

**Given** the maintainer is on the Featured Prompts tab
**When** the tab loads
**Then** all issues with `state:featured` label are fetched and displayed in a list; each item shows title, category + model tags, description excerpt, and a [Remove from Featured] button (FR45)
**And** an inline search input below the list allows searching prompts by title; each result has an [Add to Featured] button
**When** the maintainer clicks [Add to Featured]
**Then** `useAddLabelToIssue(issueId, 'state:featured')` is called; the prompt appears in the featured list; a toast confirms "Prompt featured" (FR45)
**When** the maintainer clicks [Remove from Featured]
**Then** the `state:featured` label is removed optimistically from the list; a toast confirms "Removed from featured" (FR45)
**And** the empty state shows "No featured prompts yet. Search and add one below."

### Story 7.6: Moderation Log

As a maintainer,
I want to view a full history of moderation actions filterable by action type and date range,
So that I can audit governance decisions and understand how the platform has been managed over time.

**Acceptance Criteria:**

**Given** the maintainer is on the Moderation Log tab
**When** the tab loads
**Then** `useModerationLog(filters)` fetches GitHub issue events and renders a table with columns: Action ("Flagged", "Unflagged", "Closed", "Reopened"), Target Prompt (title, link to detail), Performed By (username, link to GitHub profile), Date (relative, full date on hover), Outcome (badge) (FR46)
**And** the log is sorted by date descending (newest first) and paginated at 20 items per page
**And** a multiselect dropdown filters by action type; a date range picker filters by date; filters update the query immediately (FR46)
**And** all filter inputs have associated `<label>` elements and `aria-describedby` helper text (NFR-A1)
**And** the empty state shows "No moderation actions match the current filters" with a [Clear filters] button
