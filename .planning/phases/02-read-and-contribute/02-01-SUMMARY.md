---
phase: 02-read-and-contribute
plan: "01"
subsystem: ui
tags: [vue, tanstack-query, minisearch, markdown-it, shiki, graphql, github, pinia, vueuse]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: AppLayout, Sidebar, Navbar, useAuthStore, usePromptsStore, useSearchStore, useUIStore, router, octokit client, shadcn-vue base components

provides:
  - GitHub GraphQL data layer (GET_PROMPTS, GET_PROMPT_DETAIL) with cursor pagination
  - MiniSearch client-side search index (createSearchIndex, searchPrompts)
  - Markdown rendering singleton (initMarkdown, renderMarkdown) with Shiki syntax highlighting
  - ETag conditional request caching (etagFetchWrapper)
  - YAML frontmatter round-trip (parseFrontmatter, buildFrontmatter)
  - usePromptsQuery (TanStack useInfiniteQuery) and usePromptDetail (TanStack useQuery)
  - BrowseView with ResizablePanelGroup split pane, search, sort, infinite scroll
  - PromptDetailView standalone for /prompts/:id direct navigation
  - Full browse/prompt component suite (PromptList, PromptRow, SkeletonRow, EmptyState, FilterChips, PromptDetail, PromptMetadata, MarkdownBody, PromptActions)
  - Phase 2 types: Prompt, VersionObject, ContentType, DraftState, PromptFrontmatter

affects:
  - 02-02-contribute (uses usePromptDetail, PromptFrontmatter, buildFrontmatter)
  - 02-03-versions (uses usePromptDetail, VersionObject, MarkdownBody)

# Tech tracking
tech-stack:
  added:
    - markdown-it 14.x — HTML-safe markdown renderer
    - shiki 4.x — async syntax highlighter
    - "@shikijs/markdown-it" — shiki plugin for markdown-it
    - diff — text diff utilities (for Plan 02-03)
    - date-fns — relative date formatting
    - vue-sonner — toast notification integration for Vue
    - "@types/markdown-it" — TypeScript types
    - "@types/diff" — TypeScript types
    - shadcn-vue components: input, textarea, select, scroll-area, resizable, tabs, skeleton, card, sonner
  patterns:
    - Async singleton pattern for initMarkdown() — initializes once, cached in module-level variable
    - Module-level MiniSearch instance (non-reactive) accessed via buildIndex/searchPrompts functions
    - TanStack useInfiniteQuery with cursor pagination and getNextPageParam
    - VueUse useIntersectionObserver on sentinel div for infinite scroll trigger
    - VueUse useClipboard + vue-sonner toast for clipboard actions
    - Wave 0 it.todo stubs for TDD test scaffolding

key-files:
  created:
    - src/lib/search.ts — createSearchIndex/searchPrompts (MiniSearch inverted index)
    - src/lib/markdown.ts — initMarkdown/renderMarkdown async singleton
    - src/lib/frontmatter.ts — parseFrontmatter/buildFrontmatter YAML round-trip
    - src/lib/github/etag.ts — etagFetchWrapper conditional request caching
    - src/lib/github/queries.ts — GET_PROMPTS and GET_PROMPT_DETAIL GraphQL strings
    - src/composables/queries/usePromptsQuery.ts — TanStack useInfiniteQuery composable
    - src/composables/queries/usePromptDetail.ts — TanStack useQuery composable
    - src/components/browse/PromptList.vue — list with IntersectionObserver infinite scroll
    - src/components/browse/PromptRow.vue — row with active state highlight
    - src/components/browse/SkeletonRow.vue — animate-pulse loading skeleton
    - src/components/browse/EmptyState.vue — empty state with clear-filters
    - src/components/browse/FilterChips.vue — dismissible active filter chips
    - src/components/prompt/PromptDetail.vue — prompt detail container
    - src/components/prompt/PromptMetadata.vue — 8-field metadata display
    - src/components/prompt/MarkdownBody.vue — v-html markdown renderer
    - src/components/prompt/PromptActions.vue — copy + share clipboard actions
    - src/lib/search.spec.ts — Wave 0 search test stubs
    - src/lib/markdown.spec.ts — Wave 0 markdown test stubs
    - src/lib/frontmatter.spec.ts — Wave 0 frontmatter test stubs
  modified:
    - src/types/index.ts — added Prompt, VersionObject, ContentType, DraftState
    - src/stores/useSearchStore.ts — added buildIndex(), MiniSearch instance, results computed
    - src/stores/usePromptsStore.ts — added selectedPromptId, setSelectedPrompt
    - src/stores/useUIStore.ts — added markdownReady, diffLayout
    - src/views/BrowseView.vue — full browse split-pane implementation
    - src/views/PromptDetailView.vue — standalone /prompts/:id view
    - src/App.vue — initMarkdown() onMounted + Sonner toaster
    - src/router/index.ts — added /prompts/:id/versions stub route

key-decisions:
  - "MiniSearch instance stored in module-level variable (not reactive ref) — MiniSearch objects are not reactive-friendly; buildIndex() rebuilds on data change"
  - "initMarkdown() is async singleton — called in App.vue onMounted, markdownReady flag guards v-html rendering to prevent FCP blocking (INFR-01)"
  - "usePromptsQuery queryKey includes filters as computed ref — filter changes trigger fresh TanStack Query fetch automatically"
  - "PromptRow active state uses border-l-2 border-l-purple-500 pattern — same visual language as Sidebar active item from Phase 1"
  - "date-fns and vue-sonner installed as unlisted dependencies — required for relative dates and toast notifications"

patterns-established:
  - "Wave 0 TDD: write it.todo stubs before implementing lib code to establish test contract first"
  - "Async lib singleton: initMarkdown() module-level singleton with markdownReady flag prevents race conditions"
  - "Non-reactive instance pattern: module-level MiniSearch outside Pinia store for performance"

requirements-completed:
  - DISC-01
  - DISC-02
  - DISC-03
  - DISC-04
  - DISC-05
  - DISC-06
  - DISC-07
  - DISC-08
  - DISC-09
  - DISC-10
  - INFR-01
  - INFR-02
  - INFR-03
  - INFR-05
  - INFR-06

# Metrics
duration: 9min
completed: 2026-03-15
---

# Phase 2 Plan 01: Read and Contribute — Discovery Layer Summary

**GitHub GraphQL data layer with MiniSearch client-side search, markdown-it + Shiki rendering, and full browse/detail UI: any user can discover and read prompts without logging in**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-15T05:58:03Z
- **Completed:** 2026-03-15T06:07:16Z
- **Tasks:** 3
- **Files modified:** 38

## Accomplishments

- Complete data layer: GET_PROMPTS/GET_PROMPT_DETAIL GraphQL queries, usePromptsQuery (useInfiniteQuery) and usePromptDetail (useQuery) composables with TanStack Query
- Client-side MiniSearch inverted index (DISC-05/INFR-03/INFR-06) — search never calls GitHub API, results in <50ms
- Async markdown-it + Shiki singleton (INFR-01) — syntax highlighting for 10 languages, html:false (no XSS), loaded non-blocking via onMounted
- BrowseView with ResizablePanelGroup split pane, real-time search + sort, VueUse IntersectionObserver infinite scroll (DISC-10)
- PromptActions: VueUse useClipboard + vue-sonner toast for copy (DISC-08) and share permalink (DISC-09)
- YAML frontmatter round-trip (parseFrontmatter/buildFrontmatter) and ETag conditional request caching (INFR-05)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 test stubs + lib utilities** - `cac7146` (feat)
2. **Task 2: Data composables and store extensions** - `4a74332` (feat)
3. **Task 3: BrowseView, PromptDetailView and components** - `d3a047d` (feat)

## Files Created/Modified

- `src/lib/search.ts` — MiniSearch createSearchIndex/searchPrompts with boost weights
- `src/lib/markdown.ts` — async initMarkdown singleton + renderMarkdown pure function
- `src/lib/frontmatter.ts` — PromptFrontmatter interface, parseFrontmatter/buildFrontmatter
- `src/lib/github/etag.ts` — etagFetchWrapper for conditional GitHub requests
- `src/lib/github/queries.ts` — GET_PROMPTS and GET_PROMPT_DETAIL GraphQL strings
- `src/composables/queries/usePromptsQuery.ts` — useInfiniteQuery, cursor pagination, label filters
- `src/composables/queries/usePromptDetail.ts` — useQuery, enabled guard, staleTime 300s
- `src/stores/useSearchStore.ts` — extended with buildIndex, MiniSearch instance, results computed
- `src/stores/usePromptsStore.ts` — extended with selectedPromptId and setSelectedPrompt
- `src/stores/useUIStore.ts` — extended with markdownReady and diffLayout
- `src/views/BrowseView.vue` — full ResizablePanelGroup split-pane browse view
- `src/views/PromptDetailView.vue` — standalone /prompts/:id view
- `src/components/browse/` — PromptList, PromptRow, SkeletonRow, EmptyState, FilterChips
- `src/components/prompt/` — PromptDetail, PromptMetadata, MarkdownBody, PromptActions
- `src/types/index.ts` — Prompt, VersionObject, ContentType, DraftState types
- `src/App.vue` — initMarkdown() in onMounted, Sonner toaster

## Decisions Made

- MiniSearch instance stored outside Vue reactivity (module-level let) — reactive proxy breaks MiniSearch internal state; buildIndex() creates fresh instance on data change
- initMarkdown() async singleton pattern — App.vue calls it in onMounted, sets markdownReady flag; MarkdownBody guards rendering with v-if to avoid blocking FCP (INFR-01)
- date-fns and vue-sonner added — required for relative dates in PromptRow/PromptMetadata and toast feedback in PromptActions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused import TypeScript errors in multiple components**
- **Found during:** Task 3 (build verification)
- **Issue:** Badge, Button, computed, watch, uiStore declared but unused in FilterChips, PromptList, PromptActions, PromptDetail
- **Fix:** Removed unused imports from each component
- **Files modified:** src/components/browse/FilterChips.vue, src/components/browse/PromptList.vue, src/components/prompt/PromptActions.vue, src/components/prompt/PromptDetail.vue
- **Verification:** `npm run build` zero errors
- **Committed in:** d3a047d (Task 3 commit)

**2. [Rule 3 - Blocking] Sonner component exports Toaster not Sonner**
- **Found during:** Task 3 (build verification)
- **Issue:** shadcn-vue sonner index.ts exports `Toaster` but App.vue imported `Sonner`
- **Fix:** Changed import to `import { Toaster as Sonner } from '@/components/ui/sonner'`
- **Files modified:** src/App.vue
- **Verification:** Build passes
- **Committed in:** d3a047d (Task 3 commit)

**3. [Rule 3 - Blocking] PromptsQueryVars index signature required by @octokit/graphql**
- **Found during:** Task 3 (build verification)
- **Issue:** @octokit/graphql RequestParameters requires `[key: string]: unknown` index signature
- **Fix:** Added index signature to PromptsQueryVars interface
- **Files modified:** src/composables/queries/usePromptsQuery.ts
- **Verification:** Build passes
- **Committed in:** d3a047d (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact on plan:** All auto-fixes necessary for TypeScript correctness and build success. No scope creep.

## Issues Encountered

- shadcn-vue `add` batch command silently skipped some components — added input, textarea, select, scroll-area, resizable, tabs, skeleton, card individually to ensure all were installed

## User Setup Required

None - no external service configuration required for the library layer. GitHub data requires VITE_GITHUB_OWNER and VITE_GITHUB_REPO env vars (already documented in .env.example).

## Next Phase Readiness

- usePromptDetail composable ready for Plan 02-02 (contribute/edit) and Plan 02-03 (version history)
- PromptFrontmatter interface and buildFrontmatter available for Plan 02-02 editor
- MarkdownBody component available for Plan 02-03 diff view
- /prompts/:id/versions route stub wired, ready for VersionHistoryView in Plan 02-03

---
*Phase: 02-read-and-contribute*
*Completed: 2026-03-15*
