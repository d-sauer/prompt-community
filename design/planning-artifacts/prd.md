---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish']
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
inputDocuments:
  - design/planning-artifacts/product-brief-prompt-community-2026-03-14.md
  - design/research/vue-github-issues-platform-research.md
  - design/research/wireframe/00-screen-flow-and-interactions.md
  - design/research/wireframe/S01-app-shell-requirements.md
  - design/research/wireframe/S02-master-detail-requirements.md
  - design/research/wireframe/S03-new-prompt-editor-requirements.md
  - design/research/wireframe/S04-version-history-requirements.md
  - design/research/wireframe/S05-admin-panel-requirements.md
  - design/research/wireframe/S06-user-profile-requirements.md
workflowType: 'prd'
---

# Product Requirements Document - prompt-community

> **Updated 2026-05-09:** v2.0 Backend Migration complete. GitHub API dependencies removed.
> See `design/change-request-v2.md` for the migration PRD.

**Author:** Davor
**Date:** 2026-03-14

---

## Executive Summary

prompt-community is a greenfield internal web application — the company's shared AI knowledge base. It enables all employees to discover, share, and build on AI prompts, skill files, and multi-step instruction sets submitted by colleagues. Anonymous read access removes all friction for consumers; GitHub OAuth gates contribution, maintaining identity and accountability without a separate auth system.

The platform solves a specific organisational failure mode: AI adoption that happens individually and invisibly. Without a shared space, engineers develop effective prompts in isolation, never propagating what works across teams. prompt-community makes that knowledge visible, searchable, and improvable through community signals — votes, comments, forks, and version history.

**Target users:**
- **AI Explorers** (any employee): browse and copy proven prompts anonymously; no login required
- **AI Practitioners** (engineers): contribute prompts and skill files via structured submission form; build internal reputation through community engagement
- **Community Curators**: lightweight moderation; quality surfaces naturally through voting

**Success threshold:** 150 monthly active engineers; 3–5 daily sessions per active user; leadership observing cross-team prompt sharing organically within 3–6 months of launch.

**What makes this special:**

1. **Structured for reuse, not just storage.** Skill files, grouped skill sets, and usage instructions are first-class content types alongside prompts. Each submission carries YAML frontmatter metadata (category, AI model, difficulty, tags), making content machine-readable and filterable.

2. **Community signals drive quality without overhead.** Voting, commenting, forking, and version history surface the best content naturally. No editorial process — the community self-governs, with a thin curator layer for edge cases only.

3. **Zero-cost, zero-infrastructure.** GitHub Issues is the data store (accessed via API); Cloudflare handles hosting, OAuth proxying, and image storage. The entire platform runs within free tiers at 50–400 users — sustainable indefinitely without budget approval.

---

## Project Classification

- **Project Type:** Web Application (Vue 3 SPA + PWA, Cloudflare Pages)
- **Domain:** General — internal company tool, no regulated industry
- **Complexity:** Low — no compliance requirements, trusted internal users, modern browser targets only
- **Project Context:** Greenfield — building from scratch on a defined technology stack

---

## Success Criteria

### User Success

- **AI Explorer** finds a relevant prompt, copies it, and uses it in their AI tool within their first session — no login required, zero friction
- **AI Practitioner** submits a prompt and receives community engagement (votes, comments) from colleagues they don't work with directly — proof their knowledge is travelling across the org
- Users return 3–5 times per day, treating the platform as a daily work tool rather than a one-off reference
- Prompt copy rate is trackable and rising — content is being used, not just browsed

### Business Success

| Objective | Target | Timeframe |
|---|---|---|
| Initial active user base | 150 MAU (engineers) | 0–3 months |
| Daily engagement | 3–5 sessions/user/day | 3 months |
| Unique contributors | 20+ submitters/month | 3 months |
| Cross-team prompt sharing | Leadership observes organically | 3–6 months |
| Content self-sustainability | New submissions weekly without admin push | 3 months |
| Broader adoption | Non-engineers browsing and adopting prompts | 6–12 months |

### Technical Success

- First Contentful Paint < 1.5s; initial prompt list load < 2s; instant on return (stale-while-revalidate)
- No third-party API rate limits exposed to users (first-party Cloudflare Workers + D1 backend; no GitHub API calls for data reads)
- Zero infrastructure cost at target scale (all Cloudflare free tiers — Pages, Workers, D1, R2)
- Anonymous access works without any login prompt or redirect
- OAuth popup flow completes in < 5s under normal conditions

### Measurable Outcomes

- **Copy rate**: % of prompt detail views resulting in a copy action (target: >30%)
- **Return rate**: % of users returning within 7 days of first visit (target: >60%)
- **Contribution rate**: ratio of active contributors to active readers (target: >13% — 20 of 150)
- **Vote density**: average votes per prompt per category — rising trend signals content quality and community health
- **Category coverage**: prompts exist across Engineering, Business, and General within month 1

---

## Product Scope & Phased Development

### MVP Philosophy

**Experience MVP** — the minimum viable experience requires all six screens simultaneously. A browse-only version has no content; a contribution-only version has no audience. The community value loop (submit → vote → discover → copy → return) only closes when all screens are functional.

**Resource requirement:** 1–2 frontend engineers familiar with Vue 3 + TypeScript. No backend engineers required — Cloudflare Workers are minimal (~40 lines each).

### MVP Feature Set (Phase 1)

| Screen | Must-Have Capabilities |
|---|---|
| S01 App Shell | Navbar, sidebar filters, GitHub OAuth, anonymous access, global search (MiniSearch), light/dark theme toggle, notifications, keyboard shortcuts |
| S02 Browse & Discover | Split-pane master-detail, prompt cards, voting (👍 ❤️ 🚀), comments, copy/fork/share, infinite scroll |
| S03 Prompt Editor | Create/edit prompts + skill files + grouped sets, markdown + live preview, auto-save, image upload (Cloudflare R2) |
| S04 Version History | Full timeline, side-by-side and unified diff, restore |
| S05 Admin Panel | Moderation queue, label manager, featured prompts, moderation log (maintainer-only) |
| S06 User Profile | Submitted tab, saved/bookmarked tab (own only), activity tab |
| Infrastructure | GitHub Issues as data store, Cloudflare Pages + Workers + R2, two-repo architecture |

### Post-MVP Features

**Phase 2 — Growth** (after adoption is validated):
- Team collections: curated prompt sets per squad or domain (e.g., "QA Team Toolkit")
- Integration hooks: push new/featured prompts to Slack or Teams — deferred until adoption is proven

**Phase 3 — Expansion** (when usage data informs direction):
- AI-assisted discovery: surface prompts based on role or browsing behaviour — only if data supports the investment

### Risk Mitigation

| Risk | Mitigation |
|---|---|
| Low contribution rate | Seed with 10–15 high-quality prompts pre-launch; identify 5 engineer champions for week one |
| Discovery fatigue | Set up category taxonomy correctly at launch (Engineering, Business, General + AI model labels); label manager enables rapid iteration |
| GitHub API rate limits | ETag caching + MiniSearch index reduces API calls to near zero for reads; low risk at 150-user scale |
| GitHub outage | TanStack Query stale cache serves read content; acceptable downtime for internal tool |
| Reduced team | Single-engineer architecture — SPA + two Cloudflare Workers, no operational overhead post-launch |

---

## User Journeys

### Journey 1: The AI Explorer — First Discovery (Happy Path)

**Meet Sara**, a QA engineer who heard a colleague mention "there's a prompt that auto-generates test case matrices from a feature spec." She has no GitHub account set up with the company app.

- **Opening scene**: Sara lands on the browse view, no login prompt. She sees a sidebar with categories — she clicks "Engineering". The master list fills with prompts tagged for her domain.
- **Rising action**: She types "test" in the search bar. MiniSearch filters instantly — no API call, no spinner. She finds "Test Case Generator v2" with 42 upvotes and 8 comments. She clicks it; the detail panel shows full rendered markdown, usage instructions, and a code block.
- **Climax**: She clicks [Copy]. The prompt is in her clipboard. She pastes it into Claude. It works exactly as described.
- **Resolution**: Sara bookmarks the platform. By week two she's visiting 4–5 times a day. The platform is now part of her workflow.

**Capabilities revealed**: anonymous browse, category filter, client-side search, prompt detail with rendered markdown, copy button.

---

### Journey 2: The AI Practitioner — First Contribution

**Meet Matej**, a senior backend engineer who has spent two weeks refining a multi-step prompt for generating OpenAPI specs from code comments. He's shared it in Slack twice but it keeps getting buried.

- **Opening scene**: Matej signs in with GitHub (one OAuth popup, closes automatically). He clicks "+ New".
- **Rising action**: The editor loads. He fills in the title, selects "Engineering" + "Claude" + "Advanced". He pastes his prompt into the markdown editor — the preview pane renders it live. He adds a usage instruction section and tags it "openapi, backend, codegen".
- **Climax**: He clicks [Publish]. A GitHub Issue is created with YAML frontmatter in the background. He's redirected to the detail view. Within an hour: 6 upvotes, 2 comments from engineers he's never met.
- **Resolution**: Matej checks his profile the next morning — 18 total votes across 3 submissions. He starts checking the platform daily. He forks a colleague's writing prompt and adds a code variant.

**Capabilities revealed**: GitHub OAuth, prompt editor with metadata form, markdown + live preview, publish flow, profile vote totals, forking.

---

### Journey 3: The AI Practitioner — Version Refinement (Edge Case)

**Meet Matej again**, three weeks later. A colleague commented that his OpenAPI prompt breaks on Python type hints. He wants to fix it without losing the original.

- **Opening scene**: He navigates to his submission, clicks [Edit]. The editor pre-populates with his existing content.
- **Rising action**: He makes the fix, adds a changelog note: "Fixed Python type hint handling". He publishes the update — a new version comment is posted to the GitHub Issue.
- **Edge case**: He realises the fix introduced a different bug. He opens [History], sees v1 and v2 side-by-side in the diff view. He clicks [Restore v1] — a confirmation dialog appears. He confirms.
- **Resolution**: v1 is restored as v3. A comment from another engineer: "Good call reverting — v2 broke mine too."

**Capabilities revealed**: edit mode, version history, side-by-side diff, restore flow, changelog messages.

---

### Journey 4: The Community Curator — Moderation

**Meet Lena**, a tech lead with curator access. She gets a Slack ping: "There's a spam prompt in the Engineering category."

- **Opening scene**: Lena opens the admin panel. The moderation queue shows 1 flagged item — a prompt that's just a link to an external site, flagged by two community members.
- **Rising action**: She clicks [View] to confirm it's spam. Returns to the queue, clicks [Delete]. Optimistic UI removes the row immediately.
- **Resolution**: Done in under 60 seconds. No GitHub UI needed. She adds Matej's OpenAPI prompt to the featured list before closing.

**Capabilities revealed**: admin panel access control, moderation queue, delete/approve/hide actions, featured prompts management.

---

### Journey Requirements Summary

| Capability Area | Revealed By |
|---|---|
| Anonymous browse, filter, search | Journey 1 |
| Prompt detail with rendered markdown + copy | Journey 1 |
| GitHub OAuth popup flow | Journeys 2, 3 |
| Prompt editor (create + edit) with metadata | Journey 2 |
| Publish → GitHub Issue creation | Journey 2 |
| User profile with contribution stats | Journey 2 |
| Forking existing prompts | Journey 2 |
| Version history + diff view + restore | Journey 3 |
| Admin panel + moderation queue | Journey 4 |
| Featured prompts management | Journey 4 |

---

## Innovation & Novel Patterns

### [HISTORICAL — v1 only] GitHub Issues as Community Data Store

The v1 architectural approach was the deliberate elimination of a traditional backend. Every AI prompt, skill file, and grouped skill set was stored as a GitHub Issue with YAML frontmatter in the issue body. Community interactions mapped directly to GitHub primitives:

| Platform concept | GitHub primitive (v1) |
|---|---|
| Prompt / skill file | Issue (title + body with YAML frontmatter) |
| Category / tag | Label (namespaced: `category:coding`, `model:claude`) |
| Upvote / reaction | Issue reaction (👍 ❤️ 🚀) |
| Discussion | Issue comment |
| Version history | Structured version comments (`## Version N — YYYY-MM-DD`) |
| Prompt status | Issue state + labels (`state:featured`, `state:hidden`) |

This approach was validated by open-source precedent (utterances ~9.5k stars, giscus ~9k stars) and worked well at launch scale. It was replaced in v2.0 due to rate limit ceilings, schema opacity, and two-repo complexity.

### v2.0 First-Party Backend Architecture

The v2 architecture replaces GitHub-as-DB with a purpose-built Cloudflare stack. Community interactions map to D1 tables:

| Platform concept | v2 implementation |
|---|---|
| Prompt / skill file | `prompts` table in D1 (SQLite via Drizzle ORM) |
| Category / tag | `labels` table + `prompt_tags` join table |
| Upvote / reaction | `reactions` table (user_id, prompt_id, emoji) |
| Discussion | `comments` table |
| Version history | `prompt_versions` table (version_number, body, changelog) |
| Prompt status | `prompts.status` enum (`draft` \| `published` \| `hidden` \| `flagged`) |
| Auth session | HS256 JWT in HttpOnly cookie; `users.role` field for maintainer check |

The Hono REST API worker is the backend. Cloudflare D1 is the data store. The Vue SPA connects only to the first-party API.

### v2 Risk Mitigation

| Risk | Mitigation |
|---|---|
| Cloudflare Workers/D1 unavailability | TanStack Query stale cache serves cached prompts; acceptable for internal tool |
| JWT expiry / auth issues | 7-day JWT with clear 401 handling; re-login via OAuth popup |
| D1 SQLite limitations | Well within D1 free tier at 50–400 users; FTS5 virtual table for search |
| GitHub OAuth dependency | Only for identity (login); all data is in D1, no GitHub data calls |

---

## Web App Specific Requirements

### Architecture Overview

prompt-community is a **Vue 3 SPA** deployed to Cloudflare Pages, operating as a PWA with offline browsing of cached prompts. No server-side rendering.

**v2.0 Backend (current):**

**Single-Repo Architecture:**
- `app repo` (this repo): Vue SPA, Hono API worker, CI/CD, Cloudflare deployment configuration. All application code and data worker in one repo.
- `prompt-community-data` repo: **archived** — no longer in use.

**Cloudflare Stack:**
- **Pages**: Static SPA hosting, unlimited bandwidth (free tier)
- **Workers (Hono API)**: First-party REST API for all prompt, auth, search, and admin operations. JWT-authenticated. No GitHub API calls from SPA.
- **D1 (SQLite)**: Primary data store. Managed via Drizzle ORM. 10 tables: `users`, `prompts`, `prompt_tags`, `prompt_versions`, `comments`, `reactions`, `bookmarks`, `moderation_log`, `labels`, `notifications`. FTS5 virtual table for server-side full-text search.
- **R2**: Image storage (10 GB free, zero egress fees)

**API Strategy (v2):**
- REST API on Hono worker for all data operations (GET/POST/PATCH/DELETE per resource)
- GitHub OAuth → Hono worker exchanges code → signs HS256 JWT → sets HttpOnly cookie
- TanStack Query staleTime + standard HTTP Cache-Control headers for client-side caching
- MiniSearch client-side index: retained for offline PWA browsing; D1 FTS5 handles server-side search

**[HISTORICAL — v1 only] Two-Repo Architecture:**
- `app repo`: Vue SPA, CI/CD, Cloudflare deployment configuration
- `data repo`: GitHub Issues (prompts), Labels (categories). Separate permission models.

**[HISTORICAL — v1 only] GitHub API Strategy:**
- GraphQL for reads (Octokit); REST for writes
- ETag conditional requests: 304 Not Modified responses consumed zero rate limit points
- MiniSearch client-side index: eliminated dependency on GitHub Search API

### Browser Support

Modern browsers only — no polyfill burden. Internal company tool eliminates legacy browser concerns.

| Browser | Support |
|---|---|
| Chrome 120+ | Full |
| Firefox 120+ | Full |
| Safari 17+ | Full |
| Edge 120+ | Full |

### Responsive Layout

| Breakpoint | Layout |
|---|---|
| Desktop (≥1024px) | Full split-pane browse, 200px sidebar, all features |
| Tablet (640–1023px) | Collapsed sidebar (48px icons), narrower master panel |
| Mobile (<640px) | Single column, sheet-based sidebar, stacked panels |

Mobile sidebar is a shadcn Sheet overlay, not a layout-integrated component.

### Accessibility Implementation

Target: **WCAG 2.1 AA** (see NFR-A1–A5 for measurable criteria).

- shadcn-vue components built on Reka UI (WAI-ARIA compliant primitives)
- Semantic HTML: `<nav>`, `<aside>`, `<main>`, `<article>`, `<ul>`, `<h1>`–`<h3>`
- Visible focus indicators: 2px solid #7c3aed outline on all interactive elements

### PWA Configuration

- `vite-plugin-pwa` with Workbox
- `StaleWhileRevalidate` strategy for GitHub API responses
- `CacheFirst` for Cloudflare R2 images and static assets
- Offline: cached prompts are browsable; write actions queue for background sync on reconnect

### Implementation Stack

- **Routing**: Vue Router 5 with `createWebHistory()` on Cloudflare Pages (`_redirects` SPA fallback)
- **State**: Pinia 3 for client state (auth, UI, filters); TanStack Vue Query 5 for server state (prompts, comments, user data)
- **Theme**: Light and dark mode in MVP. `@vueuse/core` `useDark()` composable — detects system preference on first visit, persists to localStorage. All shadcn-vue components adapt via Tailwind CSS 4 `dark:` variants. Toggle button in navbar.

---

## Functional Requirements

### Capability Area 1: Content Discovery & Browse

| ID | Requirement |
|---|---|
| FR01 | Any user can browse the full prompt list without authenticating |
| FR02 | Any user can filter the prompt list by category (Engineering, Business, General) |
| FR03 | Any user can filter the prompt list by AI model (e.g., Claude, GPT-4, Gemini) |
| FR04 | Any user can sort the prompt list by Most Voted, Newest, or Most Commented |
| FR05 | Any user can search prompts client-side using a keyword search (results appear in < 50ms, no API call) |
| FR06 | Any user can open a prompt and read its full rendered markdown content with syntax-highlighted code blocks |
| FR07 | Any user can view a prompt's metadata: content type, category, AI model, difficulty, vote count, comment count, tags, and author |
| FR08 | Any user can copy a prompt's full content to clipboard with a single action |
| FR09 | Any user can share a direct permalink to a specific prompt |
| FR10 | Any user can browse a paginated prompt list with infinite scroll and skeleton loading states |

### Capability Area 2: Content Contribution

| ID | Requirement |
|---|---|
| FR11 | Authenticated user can create a new prompt submission with title, markdown body, category, AI model, difficulty, and up to 5 tags |
| FR12 | Authenticated user can create a skill file as a distinct content type |
| FR13 | Authenticated user can create a grouped skill set as a distinct content type |
| FR14 | Authenticated user can add usage instructions to any submission |
| FR15 | Authenticated user can upload images to a submission via drag-and-drop or file picker |
| FR16 | Authenticated user can preview rendered markdown in a live split-pane while composing |
| FR17 | Authenticated user can publish a submission (POST /prompts to Cloudflare D1 via Hono REST API) |
| FR18 | Authenticated user can edit their own existing submission |
| FR19 | Authenticated user can fork an existing prompt as the starting point for a new submission |
| FR20 | The editor auto-saves draft content to localStorage every 30 seconds |
| FR21 | Authenticated user is warned about unsaved changes when navigating away from the editor |

### Capability Area 3: Version Management

| ID | Requirement |
|---|---|
| FR22 | Authenticated user can publish an updated version of their own submission with an optional changelog message |
| FR23 | Any user can view the full version history timeline for a prompt |
| FR24 | Any user can compare any two versions of a prompt in side-by-side or unified diff view |
| FR25 | Author or maintainer can restore a previous version (restored as a new version — non-destructive) |
| FR26 | Author or maintainer must confirm a version restore before it is applied |

### Capability Area 4: Community Engagement

| ID | Requirement |
|---|---|
| FR27 | Authenticated user can add a reaction to a prompt (👍 ❤️ 🚀) with optimistic UI |
| FR28 | Authenticated user can remove their own previously added reaction |
| FR29 | Authenticated user can post a comment on a prompt |
| FR30 | Any user can read all comments on a prompt without authenticating |
| FR31 | Anonymous user is shown a sign-in call-to-action when attempting to react or comment |
| FR32 | Authenticated user can flag a prompt for moderator review |

### Capability Area 5: User Identity & Profile

| ID | Requirement |
|---|---|
| FR33 | Any user can authenticate via GitHub OAuth using a popup flow (no page redirect; popup closes automatically on completion) |
| FR34 | Authenticated user can sign out from the platform |
| FR35 | Any user can view another user's public profile showing their submissions and aggregate stats |
| FR36 | Authenticated user can view their own profile with submitted prompts, saved prompts, and activity tabs |
| FR37 | Authenticated user can bookmark/save a prompt to their own saved tab (persisted to localStorage) |
| FR38 | Authenticated user's profile displays total vote count across all their submissions and total submission count |

### Capability Area 6: Administration & Moderation

| ID | Requirement |
|---|---|
| FR39 | Maintainer/Curator can access the admin panel (non-maintainers are redirected immediately) |
| FR40 | Maintainer/Curator can view a stats overview: total prompts, flagged count, featured count |
| FR41 | Maintainer/Curator can view the moderation queue of flagged prompts |
| FR42 | Maintainer/Curator can approve, hide, or delete prompts from the moderation queue |
| FR43 | Maintainer/Curator can perform bulk actions across multiple items in the moderation queue |
| FR44 | Maintainer/Curator can add, edit, and delete GitHub labels with namespace prefix conventions enforced |
| FR45 | Maintainer/Curator can mark prompts as featured to elevate their visibility |
| FR46 | Maintainer/Curator can view a moderation log with full action history, filterable by date |

### Capability Area 7: App Shell & Navigation

| ID | Requirement |
|---|---|
| FR47 | Any user can invoke global search from any screen using the ⌘K keyboard shortcut |
| FR48 | Any user can navigate to Browse (G+B) and New Prompt editor (G+N) via keyboard shortcuts |
| FR49 | Any user can toggle between light and dark themes from the navbar, with preference persisted to localStorage |
| FR50 | Any user can collapse the sidebar to icon-only mode (48px) to maximise content area |
| FR51 | Authenticated user can view in-app notifications in a slide-out notification drawer |
| FR52 | Any user on mobile can access sidebar filters via a sheet overlay |
| FR53 | Any user can browse previously cached prompts while offline (PWA — service worker cache) |
| FR54 | Authenticated user's write actions (submit, vote, comment) taken offline are queued for sync when connectivity restores |

---

## Non-Functional Requirements

### Performance

| ID | Requirement |
|---|---|
| NFR-P1 | First Contentful Paint < 1.5s on first visit (static SPA served from Cloudflare CDN) |
| NFR-P2 | Initial prompt list load < 2s (single GraphQL query + TanStack Query cache) |
| NFR-P3 | Client-side search response < 50ms (MiniSearch — no network round-trip) |
| NFR-P4 | Subsequent in-app navigation renders immediately using stale-while-revalidate cached data |
| NFR-P5 | GitHub OAuth popup completes token exchange in < 5s under normal network conditions |
| NFR-P6 | Editor auto-save writes to localStorage in < 100ms — no perceptible interruption to the user |

### Security

| ID | Requirement |
|---|---|
| NFR-S1 | GitHub OAuth access tokens are never exposed to the browser. The Hono worker exchanges the OAuth code for a GitHub token server-side, then issues an HS256 JWT stored in an HttpOnly + Secure + SameSite=Lax cookie. No token is written to localStorage |
| NFR-S2 | GitHub OAuth client secret and JWT signing secret are never exposed to the browser — token exchange and signing occur exclusively inside the Cloudflare Worker (Hono API) |
| NFR-S3 | All communication with GitHub and Cloudflare services occurs over HTTPS |
| NFR-S4 | Admin panel access control is enforced by checking the `role` field in the D1 `users` table via the JWT-authenticated `/me` endpoint — client-side role check alone is not sufficient |
| NFR-S5 | No user PII is stored beyond GitHub public profile data (login, avatar_url, name, bio) written to the D1 `users` table on first OAuth login |
| NFR-S6 | Image uploads are proxied via Cloudflare Worker — R2 bucket is not publicly accessible directly |

### Scalability

| ID | Requirement |
|---|---|
| NFR-SC1 | Platform operates against a first-party backend (Cloudflare Workers + D1); no GitHub API rate limits apply to data reads or writes |
| NFR-SC2 | [HISTORICAL — v1 only] ETag conditional requests were used for GitHub API reads. In v2, TanStack Query staleTime + standard HTTP Cache-Control headers replace this layer |
| NFR-SC3 | Client-side MiniSearch index retained for offline PWA browsing; D1 FTS5 virtual table handles server-side full-text search for fresh queries |
| NFR-SC4 | Platform must remain fully functional for 50–400 concurrent users without architectural changes |
| NFR-SC5 | All Cloudflare Pages, Workers, D1, and R2 usage must remain within free tier limits at target scale of 50–400 users |

### Accessibility

| ID | Requirement |
|---|---|
| NFR-A1 | All screens comply with WCAG 2.1 AA |
| NFR-A2 | All interactive elements are keyboard-navigable with visible focus indicators (2px solid outline) |
| NFR-A3 | `aria-live` regions announce dynamic content changes: vote count updates, new comment additions, notification badge updates |
| NFR-A4 | All text meets 4.5:1 colour contrast ratio in both light and dark mode |
| NFR-A5 | All icon-only UI elements (collapsed sidebar buttons, editor toolbar icons) have tooltip labels |

### Integration

| ID | Requirement |
|---|---|
| NFR-I1 | [HISTORICAL — v1 only] GitHub GraphQL read queries used `If-None-Match` ETag headers. In v2, all data reads go to the first-party Hono API; TanStack Query staleTime + standard HTTP Cache-Control headers replace the ETag layer |
| NFR-I2 | First-party API write operations (POST/PATCH/DELETE on Hono routes) must handle 401 (no or expired JWT), 403 (insufficient role), and 422 (validation error) with user-facing error messages and no silent failure |
| NFR-I3 | Cloudflare R2 image uploads are limited to 10MB per file; supported formats are PNG, JPG, GIF, and WebP |
| NFR-I4 | MiniSearch index is built on first load from the `/prompts` API endpoint and invalidated when the authenticated user publishes or edits a prompt |

### Reliability

| ID | Requirement |
|---|---|
| NFR-R1 | During Cloudflare Workers or D1 unavailability, TanStack Query stale cache serves read content for up to 24 hours without user disruption |
| NFR-R2 | Write operations that fail (network error, 5xx from Hono API) surface a clear error state with a retry CTA — no silent failure or data loss |
| NFR-R3 | PWA offline mode allows browsing of previously cached prompts; write actions (submit, vote, comment) are queued for background sync on reconnection |
| NFR-R4 | Editor auto-save to localStorage ensures draft content survives browser crashes or accidental navigation |
