# Roadmap: prompt-community

## Overview

Four phases deliver the complete experience MVP. Phase 1 builds the app skeleton with auth and infrastructure so every subsequent phase can build on a working shell. Phase 2 delivers the reading and writing core — browse, contribute, and version history — the three capabilities that justify the platform's existence. Phase 3 adds the social layer (reactions, comments, profiles) that transforms isolated prompts into a community knowledge base. Phase 4 completes the platform with admin moderation tools and PWA offline support, making the platform operable and resilient at scale.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - App shell, GitHub data layer, OAuth authentication, and infrastructure scaffolding (completed 2026-03-15)
- [ ] **Phase 2: Read & Contribute** - Browse/discover prompts, content editor, and version history (the core product loop)
- [ ] **Phase 3: Community & Profiles** - Reactions, comments, user profiles, saves, and flags
- [ ] **Phase 4: Admin & PWA** - Moderation panel, label management, offline support, and background sync

## Phase Details

### Phase 1: Foundation
**Goal**: The app shell is deployed and navigable; users can authenticate via GitHub OAuth and the GitHub API layer is operational
**Depends on**: Nothing (first phase)
**Requirements**: SHEL-01, SHEL-02, SHEL-03, SHEL-04, SHEL-05, SHEL-06, USER-01, USER-02, INFR-04, INFR-07, INFR-08, INFR-09, INFR-10
**Success Criteria** (what must be TRUE):
  1. Any user can open the app, see the app shell with sidebar navigation, and switch between light and dark themes
  2. Any user can invoke global search with ⌘K and navigate to Browse or New Prompt using keyboard shortcuts (G+B, G+N) from any screen
  3. Any user can trigger GitHub OAuth from any screen, complete sign-in via popup (no page redirect), and the popup closes automatically
  4. Authenticated user can sign out and their token is no longer held anywhere in the browser
  5. The app is deployed to Cloudflare Pages and loads within infrastructure cost constraints at target scale
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold project, Pinia stores, Vue Router, Vitest Wave 0 stubs, CF Pages deployment config
- [ ] 01-02-PLAN.md — Octokit client factory, verifyMaintainerStatus GitHub API check, OAuth Worker end-to-end
- [ ] 01-03-PLAN.md — App shell: Navbar, Sidebar, NotificationDrawer stub, keyboard shortcuts, mobile responsive Sheet

### Phase 2: Read & Contribute
**Goal**: Any user can browse, search, and read prompts; authenticated users can create, edit, fork, and version their content
**Depends on**: Phase 1
**Requirements**: DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06, DISC-07, DISC-08, DISC-09, DISC-10, CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09, CONT-10, CONT-11, VERS-01, VERS-02, VERS-03, VERS-04, VERS-05, INFR-01, INFR-02, INFR-03, INFR-05, INFR-06
**Success Criteria** (what must be TRUE):
  1. Any user can browse the full prompt list without logging in, filter by category and AI model, sort by votes/newest/comments, and scroll through results with skeleton loading states
  2. Any user can search prompts instantly (under 50ms, no API call) and copy any prompt to clipboard with a single click
  3. Any user can open a prompt and read its full markdown content with syntax-highlighted code blocks, all metadata fields, and a shareable permalink
  4. Authenticated user can create, edit, and fork prompts using a split-pane editor with live markdown preview, image upload, and auto-save every 30 seconds
  5. Any user can view the full version history timeline for a prompt and compare any two versions in diff view; author or maintainer can restore a previous version
**Plans**: 3 plans

Plans:
- [ ] 02-01-PLAN.md — lib utilities (search/markdown/frontmatter/etag), GraphQL data layer, usePromptsQuery, usePromptDetail, BrowseView + PromptDetailView with all browse/discovery UI
- [ ] 02-02-PLAN.md — Content editor: useDraftStore, split-pane editor, image upload CF Worker, useCreatePrompt/useUpdatePrompt mutations, PromptEditorView with create/edit/fork/version modes
- [ ] 02-03-PLAN.md — Version history: usePromptVersions, diff library, DiffView (side-by-side/unified), RestoreDialog with confirmation, useRestoreVersion mutation

### Phase 3: Community & Profiles
**Goal**: Authenticated users can engage with prompts through reactions and comments; all users can view public profiles and authenticated users manage their own
**Depends on**: Phase 2
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, USER-03, USER-04, USER-05, USER-06
**Success Criteria** (what must be TRUE):
  1. Authenticated user can add and remove reactions (👍 ❤️ 🚀) to a prompt with optimistic UI; unauthenticated user sees a sign-in CTA when attempting to react
  2. Any user can read all comments on a prompt without logging in; authenticated user can post a comment
  3. Any user can view another user's public profile showing their submissions and aggregate stats (total votes, total submissions)
  4. Authenticated user can view their own profile with separate tabs for submitted prompts, saved prompts, and activity
  5. Authenticated user can bookmark any prompt and find it in their saved tab; authenticated user can flag a prompt for moderator review
**Plans**: 3 plans

Plans:
- [ ] 03-01-PLAN.md — Type extensions (nodeId, viewerHasReacted), Wave 0 test stubs, addReaction/removeReaction mutations, useReactions composable with optimistic UI
- [ ] 03-02-PLAN.md — postComment/flagPrompt mutations, useComments/useFlagPrompt composables, ReactionBar + CommentSection components wired into PromptDetail
- [ ] 03-03-PLAN.md — useBookmarksStore (localStorage), useUserProfile (GraphQL search), ProfileStats/ProfileTabs components, UserProfileView, router routes /users/:login and /profile, bookmark button in PromptActions

### Phase 4: Admin & PWA
**Goal**: Maintainers can moderate content via an admin panel; all users can browse cached prompts offline and writes sync on reconnect
**Depends on**: Phase 3
**Requirements**: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, SHEL-07, SHEL-08
**Success Criteria** (what must be TRUE):
  1. Non-maintainers are immediately redirected away from the admin panel; maintainer access is verified via GitHub API on every panel load (client-side check alone is not sufficient)
  2. Maintainer can view the moderation queue of flagged prompts and perform approve, hide, or delete actions individually or in bulk
  3. Maintainer can add, edit, and delete GitHub labels with namespace prefix conventions enforced, and can mark prompts as featured
  4. Maintainer can view a filterable moderation log with full action history and see a stats overview (total prompts, flagged count, featured count)
  5. Any user can browse previously cached prompts while offline; authenticated user's write actions taken offline are queued and synced when connectivity restores
**Plans**: 3 plans

Plans:
- [ ] 04-01: Admin panel — access control, stats overview, moderation queue with bulk actions, label management, featured prompts, moderation log
- [ ] 04-02: PWA — service worker (vite-plugin-pwa), offline cache strategy, background sync queue for writes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete   | 2026-03-15 |
| 2. Read & Contribute | 2/3 | In Progress|  |
| 3. Community & Profiles | 1/3 | In Progress|  |
| 4. Admin & PWA | 0/2 | Not started | - |
