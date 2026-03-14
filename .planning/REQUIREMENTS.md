# Requirements: prompt-community

**Defined:** 2026-03-14
**Core Value:** Any employee can find a proven AI prompt and use it immediately — no login, no friction, zero time between discovery and value.

## v1 Requirements

Requirements for initial release. All screens must ship together (experience MVP).

### Discovery & Browse (DISC)

- [ ] **DISC-01**: Any user can browse the full prompt list without authenticating
- [ ] **DISC-02**: Any user can filter the prompt list by category (Engineering, Business, General)
- [ ] **DISC-03**: Any user can filter the prompt list by AI model (e.g., Claude, GPT-4, Gemini)
- [ ] **DISC-04**: Any user can sort the prompt list by Most Voted, Newest, or Most Commented
- [ ] **DISC-05**: Any user can search prompts client-side (results appear in < 50ms, no API call)
- [ ] **DISC-06**: Any user can open a prompt and read its full rendered markdown content with syntax-highlighted code blocks
- [ ] **DISC-07**: Any user can view a prompt's metadata: content type, category, AI model, difficulty, vote count, comment count, tags, and author
- [ ] **DISC-08**: Any user can copy a prompt's full content to clipboard with a single action
- [ ] **DISC-09**: Any user can share a direct permalink to a specific prompt
- [ ] **DISC-10**: Any user can browse a paginated prompt list with infinite scroll and skeleton loading states

### Content Contribution (CONT)

- [ ] **CONT-01**: Authenticated user can create a new prompt submission with title, markdown body, category, AI model, difficulty, and up to 5 tags
- [ ] **CONT-02**: Authenticated user can create a skill file as a distinct content type
- [ ] **CONT-03**: Authenticated user can create a grouped skill set as a distinct content type
- [ ] **CONT-04**: Authenticated user can add usage instructions to any submission
- [ ] **CONT-05**: Authenticated user can upload images via drag-and-drop or file picker (max 10MB; PNG/JPG/GIF/WebP)
- [ ] **CONT-06**: Authenticated user can preview rendered markdown in a live split-pane while composing
- [ ] **CONT-07**: Authenticated user can publish a submission (creates a GitHub Issue with YAML frontmatter in the data repo)
- [ ] **CONT-08**: Authenticated user can edit their own existing submission
- [ ] **CONT-09**: Authenticated user can fork an existing prompt as the starting point for a new submission
- [ ] **CONT-10**: Editor auto-saves draft content to localStorage every 30 seconds
- [ ] **CONT-11**: Authenticated user is warned about unsaved changes when navigating away from the editor

### Version Management (VERS)

- [ ] **VERS-01**: Authenticated user can publish an updated version of their own submission with an optional changelog message
- [ ] **VERS-02**: Any user can view the full version history timeline for a prompt
- [ ] **VERS-03**: Any user can compare any two versions in side-by-side or unified diff view
- [ ] **VERS-04**: Author or maintainer can restore a previous version (non-destructive — restored as new version)
- [ ] **VERS-05**: Author or maintainer must confirm a version restore before it is applied

### Community Engagement (COMM)

- [ ] **COMM-01**: Authenticated user can add a reaction to a prompt (👍 ❤️ 🚀) with optimistic UI
- [ ] **COMM-02**: Authenticated user can remove their own previously added reaction
- [ ] **COMM-03**: Authenticated user can post a comment on a prompt
- [ ] **COMM-04**: Any user can read all comments on a prompt without authenticating
- [ ] **COMM-05**: Anonymous user is shown a sign-in CTA when attempting to react or comment
- [ ] **COMM-06**: Authenticated user can flag a prompt for moderator review

### User Identity & Profile (USER)

- [ ] **USER-01**: Any user can authenticate via GitHub OAuth using a popup flow (no page redirect; popup closes automatically)
- [ ] **USER-02**: Authenticated user can sign out from the platform
- [ ] **USER-03**: Any user can view another user's public profile showing submissions and aggregate stats
- [ ] **USER-04**: Authenticated user can view their own profile with submitted prompts, saved prompts, and activity tabs
- [ ] **USER-05**: Authenticated user can bookmark/save a prompt to their saved tab (persisted to localStorage)
- [ ] **USER-06**: Authenticated user's profile displays total vote count and total submission count

### Administration & Moderation (ADMN)

- [ ] **ADMN-01**: Maintainer/Curator can access the admin panel (non-maintainers redirected immediately)
- [ ] **ADMN-02**: Maintainer/Curator can view stats overview: total prompts, flagged count, featured count
- [ ] **ADMN-03**: Maintainer/Curator can view the moderation queue of flagged prompts
- [ ] **ADMN-04**: Maintainer/Curator can approve, hide, or delete prompts from the moderation queue
- [ ] **ADMN-05**: Maintainer/Curator can perform bulk actions across multiple items in the moderation queue
- [ ] **ADMN-06**: Maintainer/Curator can add, edit, and delete GitHub labels with namespace prefix conventions enforced
- [ ] **ADMN-07**: Maintainer/Curator can mark prompts as featured to elevate their visibility
- [ ] **ADMN-08**: Maintainer/Curator can view a moderation log with full action history, filterable by date

### App Shell & Navigation (SHEL)

- [ ] **SHEL-01**: Any user can invoke global search from any screen using ⌘K keyboard shortcut
- [ ] **SHEL-02**: Any user can navigate to Browse (G+B) and New Prompt editor (G+N) via keyboard shortcuts
- [ ] **SHEL-03**: Any user can toggle between light and dark themes from the navbar, with preference persisted to localStorage
- [ ] **SHEL-04**: Any user can collapse the sidebar to icon-only mode (48px) to maximise content area
- [ ] **SHEL-05**: Authenticated user can view in-app notifications in a slide-out notification drawer
- [ ] **SHEL-06**: Any user on mobile can access sidebar filters via a sheet overlay
- [ ] **SHEL-07**: Any user can browse previously cached prompts while offline (PWA — service worker cache)
- [ ] **SHEL-08**: Authenticated user's write actions taken offline are queued for sync when connectivity restores

### Infrastructure & Performance (INFR)

- [ ] **INFR-01**: First Contentful Paint < 1.5s on first visit (Cloudflare CDN)
- [ ] **INFR-02**: Initial prompt list load < 2s (single GraphQL query + TanStack Query cache)
- [ ] **INFR-03**: Client-side search response < 50ms (MiniSearch — no network round-trip)
- [ ] **INFR-04**: GitHub OAuth popup completes token exchange in < 5s
- [ ] **INFR-05**: ETag conditional requests used for all cacheable GitHub API reads (304 responses = zero rate limit cost)
- [ ] **INFR-06**: MiniSearch index eliminates all dependency on GitHub Search API for user-facing search
- [ ] **INFR-07**: GitHub OAuth access tokens held in Pinia memory only — never localStorage or cookies
- [ ] **INFR-08**: Admin panel access control enforced via GitHub API on every panel load — client-side check alone not sufficient
- [ ] **INFR-09**: Platform operates within GitHub API limits at 50–400 concurrent users without architectural changes
- [ ] **INFR-10**: All Cloudflare Pages, Workers, and R2 usage stays within free tier limits at target scale

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
| DISC-01–10 | TBD | Pending |
| CONT-01–11 | TBD | Pending |
| VERS-01–05 | TBD | Pending |
| COMM-01–06 | TBD | Pending |
| USER-01–06 | TBD | Pending |
| ADMN-01–08 | TBD | Pending |
| SHEL-01–08 | TBD | Pending |
| INFR-01–10 | TBD | Pending |

**Coverage:**
- v1 requirements: 54 total (DISC×10, CONT×11, VERS×5, COMM×6, USER×6, ADMN×8, SHEL×8, INFR×10)
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 54 ⚠️

---
*Requirements defined: 2026-03-14*
*Last updated: 2026-03-14 after initial definition from PRD*
