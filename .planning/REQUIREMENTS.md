# Requirements: prompt-community

**Defined:** 2026-03-14
**Core Value:** Any employee can find a proven AI prompt and use it immediately — no login, no friction, zero time between discovery and value.

## v1 Requirements

Requirements for initial release. All screens must ship together (experience MVP).

### Discovery & Browse (DISC)

- [x] **DISC-01**: Any user can browse the full prompt list without authenticating
- [x] **DISC-02**: Any user can filter the prompt list by category (Engineering, Business, General)
- [x] **DISC-03**: Any user can filter the prompt list by AI model (e.g., Claude, GPT-4, Gemini)
- [x] **DISC-04**: Any user can sort the prompt list by Most Voted, Newest, or Most Commented
- [x] **DISC-05**: Any user can search prompts client-side (results appear in < 50ms, no API call)
- [x] **DISC-06**: Any user can open a prompt and read its full rendered markdown content with syntax-highlighted code blocks
- [x] **DISC-07**: Any user can view a prompt's metadata: content type, category, AI model, difficulty, vote count, comment count, tags, and author
- [x] **DISC-08**: Any user can copy a prompt's full content to clipboard with a single action
- [x] **DISC-09**: Any user can share a direct permalink to a specific prompt
- [x] **DISC-10**: Any user can browse a paginated prompt list with infinite scroll and skeleton loading states

### Content Contribution (CONT)

- [x] **CONT-01**: Authenticated user can create a new prompt submission with title, markdown body, category, AI model, difficulty, and up to 5 tags
- [x] **CONT-02**: Authenticated user can create a skill file as a distinct content type
- [x] **CONT-03**: Authenticated user can create a grouped skill set as a distinct content type
- [x] **CONT-04**: Authenticated user can add usage instructions to any submission
- [x] **CONT-05**: Authenticated user can upload images via drag-and-drop or file picker (max 10MB; PNG/JPG/GIF/WebP)
- [x] **CONT-06**: Authenticated user can preview rendered markdown in a live split-pane while composing
- [x] **CONT-07**: Authenticated user can publish a submission (creates a GitHub Issue with YAML frontmatter in the data repo)
- [x] **CONT-08**: Authenticated user can edit their own existing submission
- [x] **CONT-09**: Authenticated user can fork an existing prompt as the starting point for a new submission
- [x] **CONT-10**: Editor auto-saves draft content to localStorage every 30 seconds
- [x] **CONT-11**: Authenticated user is warned about unsaved changes when navigating away from the editor

### Version Management (VERS)

- [x] **VERS-01**: Authenticated user can publish an updated version of their own submission with an optional changelog message
- [x] **VERS-02**: Any user can view the full version history timeline for a prompt
- [x] **VERS-03**: Any user can compare any two versions in side-by-side or unified diff view
- [x] **VERS-04**: Author or maintainer can restore a previous version (non-destructive — restored as new version)
- [x] **VERS-05**: Author or maintainer must confirm a version restore before it is applied

### Community Engagement (COMM)

- [x] **COMM-01**: Authenticated user can add a reaction to a prompt (👍 ❤️ 🚀) with optimistic UI
- [x] **COMM-02**: Authenticated user can remove their own previously added reaction
- [x] **COMM-03**: Authenticated user can post a comment on a prompt
- [x] **COMM-04**: Any user can read all comments on a prompt without authenticating
- [x] **COMM-05**: Anonymous user is shown a sign-in CTA when attempting to react or comment
- [x] **COMM-06**: Authenticated user can flag a prompt for moderator review

### User Identity & Profile (USER)

- [x] **USER-01**: Any user can authenticate via GitHub OAuth using a popup flow (no page redirect; popup closes automatically)
- [x] **USER-02**: Authenticated user can sign out from the platform
- [x] **USER-03**: Any user can view another user's public profile showing submissions and aggregate stats
- [x] **USER-04**: Authenticated user can view their own profile with submitted prompts, saved prompts, and activity tabs
- [x] **USER-05**: Authenticated user can bookmark/save a prompt to their saved tab (persisted to localStorage)
- [x] **USER-06**: Authenticated user's profile displays total vote count and total submission count

### Administration & Moderation (ADMN)

- [x] **ADMN-01**: Maintainer/Curator can access the admin panel (non-maintainers redirected immediately)
- [x] **ADMN-02**: Maintainer/Curator can view stats overview: total prompts, flagged count, featured count
- [x] **ADMN-03**: Maintainer/Curator can view the moderation queue of flagged prompts
- [x] **ADMN-04**: Maintainer/Curator can approve, hide, or delete prompts from the moderation queue
- [x] **ADMN-05**: Maintainer/Curator can perform bulk actions across multiple items in the moderation queue
- [x] **ADMN-06**: Maintainer/Curator can add, edit, and delete GitHub labels with namespace prefix conventions enforced
- [x] **ADMN-07**: Maintainer/Curator can mark prompts as featured to elevate their visibility
- [x] **ADMN-08**: Maintainer/Curator can view a moderation log with full action history, filterable by date

### App Shell & Navigation (SHEL)

- [x] **SHEL-01**: Any user can invoke global search from any screen using ⌘K keyboard shortcut
- [x] **SHEL-02**: Any user can navigate to Browse (G+B) and New Prompt editor (G+N) via keyboard shortcuts
- [x] **SHEL-03**: Any user can toggle between light and dark themes from the navbar, with preference persisted to localStorage
- [x] **SHEL-04**: Any user can collapse the sidebar to icon-only mode (48px) to maximise content area
- [x] **SHEL-05**: Authenticated user can view in-app notifications in a slide-out notification drawer
- [x] **SHEL-06**: Any user on mobile can access sidebar filters via a sheet overlay
- [ ] **SHEL-07**: Any user can browse previously cached prompts while offline (PWA — service worker cache)
- [ ] **SHEL-08**: Authenticated user's write actions taken offline are queued for sync when connectivity restores

### Infrastructure & Performance (INFR)

- [x] **INFR-01**: First Contentful Paint < 1.5s on first visit (Cloudflare CDN)
- [x] **INFR-02**: Initial prompt list load < 2s (single GraphQL query + TanStack Query cache)
- [x] **INFR-03**: Client-side search response < 50ms (MiniSearch — no network round-trip)
- [x] **INFR-04**: GitHub OAuth popup completes token exchange in < 5s
- [x] **INFR-05**: ETag conditional requests used for all cacheable GitHub API reads (304 responses = zero rate limit cost)
- [x] **INFR-06**: MiniSearch index eliminates all dependency on GitHub Search API for user-facing search
- [x] **INFR-07**: GitHub OAuth access tokens held in Pinia memory only — never localStorage or cookies
- [x] **INFR-08**: Admin panel access control enforced via GitHub API on every panel load — client-side check alone not sufficient
- [x] **INFR-09**: Platform operates within GitHub API limits at 50–400 concurrent users without architectural changes
- [x] **INFR-10**: All Cloudflare Pages, Workers, and R2 usage stays within free tier limits at target scale

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Growth Features

- **GROW-01**: Team collections — curated prompt sets per squad or domain
- **GROW-02**: Slack/Teams integration hooks for new/featured prompts
- **GROW-03**: AI-assisted discovery — surface prompts based on role or browsing behaviour

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time chat | High complexity, not core to community value |
| Video posts | Storage/bandwidth costs, defer to v2+ |
| Mobile app | Web-first, mobile later |
| SSR / Nuxt 3 | No benefit when backend is GitHub API; static CDN is the right deployment model |
| GitHub App (vs OAuth App) | Simpler setup for trusted internal users; upgrade path documented but deferred |
| Separate backend/database | Zero-cost constraint; GitHub Issues + Cloudflare free tiers is the entire stack |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHEL-01 | Phase 1 | Complete |
| SHEL-02 | Phase 1 | Complete |
| SHEL-03 | Phase 1 | Complete |
| SHEL-04 | Phase 1 | Complete |
| SHEL-05 | Phase 1 | Complete |
| SHEL-06 | Phase 1 | Complete |
| USER-01 | Phase 1 | Complete |
| USER-02 | Phase 1 | Complete |
| INFR-04 | Phase 1 | Complete |
| INFR-07 | Phase 1 | Complete |
| INFR-08 | Phase 1 | Complete |
| INFR-09 | Phase 1 | Complete |
| INFR-10 | Phase 1 | Complete |
| DISC-01 | Phase 2 | Complete |
| DISC-02 | Phase 2 | Complete |
| DISC-03 | Phase 2 | Complete |
| DISC-04 | Phase 2 | Complete |
| DISC-05 | Phase 2 | Complete |
| DISC-06 | Phase 2 | Complete |
| DISC-07 | Phase 2 | Complete |
| DISC-08 | Phase 2 | Complete |
| DISC-09 | Phase 2 | Complete |
| DISC-10 | Phase 2 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| CONT-05 | Phase 2 | Complete |
| CONT-06 | Phase 2 | Complete |
| CONT-07 | Phase 2 | Complete |
| CONT-08 | Phase 2 | Complete |
| CONT-09 | Phase 2 | Complete |
| CONT-10 | Phase 2 | Complete |
| CONT-11 | Phase 2 | Complete |
| VERS-01 | Phase 2 | Complete |
| VERS-02 | Phase 2 | Complete |
| VERS-03 | Phase 2 | Complete |
| VERS-04 | Phase 2 | Complete |
| VERS-05 | Phase 2 | Complete |
| INFR-01 | Phase 2 | Complete |
| INFR-02 | Phase 2 | Complete |
| INFR-03 | Phase 2 | Complete |
| INFR-05 | Phase 2 | Complete |
| INFR-06 | Phase 2 | Complete |
| COMM-01 | Phase 3 | Complete |
| COMM-02 | Phase 3 | Complete |
| COMM-03 | Phase 3 | Complete |
| COMM-04 | Phase 3 | Complete |
| COMM-05 | Phase 3 | Complete |
| COMM-06 | Phase 3 | Complete |
| USER-03 | Phase 3 | Complete |
| USER-04 | Phase 3 | Complete |
| USER-05 | Phase 3 | Complete |
| USER-06 | Phase 3 | Complete |
| ADMN-01 | Phase 4 | Complete |
| ADMN-02 | Phase 4 | Complete |
| ADMN-03 | Phase 4 | Complete |
| ADMN-04 | Phase 4 | Complete |
| ADMN-05 | Phase 4 | Complete |
| ADMN-06 | Phase 4 | Complete |
| ADMN-07 | Phase 4 | Complete |
| ADMN-08 | Phase 4 | Complete |
| SHEL-07 | Phase 4 | Pending |
| SHEL-08 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 64 total (DISC×10, CONT×11, VERS×5, COMM×6, USER×6, ADMN×8, SHEL×8, INFR×10)
- Mapped to phases: 64/64 ✓
- Unmapped: 0 ✓

**Note:** The requirements file header stated 54 total but the actual count across all 8 categories is 64. All 64 are mapped.

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 — traceability filled in after roadmap creation*
