---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: complete
completedAt: '2026-03-14'
workflowType: architecture
project_name: prompt-community
user_name: Davor
date: '2026-03-14'
inputDocuments:
  - design/planning-artifacts/prd.md
  - design/planning-artifacts/product-brief-prompt-community-2026-03-14.md
  - design/planning-artifacts/prd-validation-report-2026-03-14.md
  - design/research/vue-github-issues-platform-research.md
  - design/research/wireframe/00-screen-flow-and-interactions.md
  - design/research/wireframe/S01-app-shell-requirements.md
  - design/research/wireframe/S02-master-detail-requirements.md
  - design/research/wireframe/S03-new-prompt-editor-requirements.md
  - design/research/wireframe/S04-version-history-requirements.md
  - design/research/wireframe/S05-admin-panel-requirements.md
  - design/research/wireframe/S06-user-profile-requirements.md
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
54 FRs across 7 capability areas: Content Discovery & Browsing, Prompt Viewing &
Interaction, Prompt Creation & Editing, Authentication & User Management, Community
Engagement (voting, comments, forking), Administration & Moderation, Infrastructure
& Caching. All data operations route through the GitHub Issues API — there is no
application-specific backend.

**Non-Functional Requirements:**
24 NFRs across 6 quality categories: Performance (sub-2s initial load, sub-100ms
search response), Scalability (50–400 users within GitHub API free tier limits),
Security (GitHub OAuth CSRF protection, XSS prevention in markdown rendering,
token storage), Accessibility (WCAG AA throughout via Reka UI primitives),
Reliability (ETag caching, PWA offline support, optimistic update rollback),
Maintainability (Vitest unit + integration coverage, TypeScript strict mode).

**Scale & Complexity:**
- Primary domain: SPA + edge functions (Cloudflare Pages + Workers + R2)
- Complexity level: Low (greenfield, single-tenant, no regulatory compliance)
- User scale: 50–400 company engineers on GitHub API free tier
- Integration surface: Single (GitHub REST + GraphQL API via Octokit)
- Estimated architectural components: ~15 (6 views + 5 Pinia stores + 3 CF Worker
  endpoints + MiniSearch index + TanStack Query layer)

### Technical Constraints & Dependencies

- **GitHub Issues as sole data store**: All reads via GraphQL (batched, efficient),
  all writes via REST. YAML frontmatter in issue bodies is the schema layer.
- **ETag-based caching is mandatory**: 304 responses don't count against rate limits.
  Without ETags, 400 users polling would exhaust the 5,000 req/hour ceiling.
- **No GitHub Search API for user-facing search**: 30 req/min cap makes it unusable
  for real-time filtering. MiniSearch client-side index is the required alternative.
- **Version history lives in issue comments**: `## Version N — YYYY-MM-DD` pattern.
  Diff computed client-side (jsdiff). No external versioning system.
- **Zero server-side infrastructure**: Cloudflare Workers free tier covers OAuth proxy
  (~40 lines) and image upload proxy to R2. No persistent compute.
- **GitHub OAuth App (not GitHub App)**: Simpler setup, tokens don't expire.
  Trade-off: `public_repo` scope broader than ideal. Upgrade path to GitHub App
  documented but deferred.

### Cross-Cutting Concerns Identified

1. **Auth state propagation**: Three tiers (anonymous / authenticated / maintainer)
   affect rendering decisions on every screen. `useAuthStore` is the single source
   of truth; maintainer status resolved against GitHub collaborators API on login.

2. **Rate limit / caching strategy**: ETag conditional requests + TanStack Query
   staleTime configuration + MiniSearch IndexedDB cache form a layered defense.
   Every query hook must be designed with this in mind.

3. **Optimistic mutations with rollback**: Required across reactions (S02), comments
   (S02), moderation actions (S05), fork (S02), restore version (S04). TanStack
   Query mutation `onMutate`/`onError` lifecycle handles this consistently.

4. **Global keyboard shortcuts with chord detection**: ⌘K (search), [ (sidebar),
   G+B (go browse), G+N (go new), C (copy), N (new) — some global, some scoped.
   Must avoid conflicts with native browser shortcuts and input focus states.

5. **Responsive layout (3 breakpoints)**: Mobile (<640px), tablet (640–1023px),
   desktop (1024px+). Mobile sidebar uses Sheet overlay (S01). Master-detail
   stacks vertically (S02). Editor switches to tab layout (S03).

6. **LocalStorage as client persistence layer**: auth token, draft content
   (`draft:new`, `draft:${id}`), split pane position, saved/bookmarked prompts.
   All managed via `@vueuse/core` `useLocalStorage()`.

7. **MiniSearch index lifecycle**: Built on first app load from all open issues
   (paginated, per_page=100). Updated when new prompts are submitted. Cached in
   IndexedDB via `idb-keyval`. Background sync fetches only changed issues using
   `since` parameter + ETags.

8. **Toast notification system**: All mutation outcomes (success, error, rollback)
   surface via a unified toast system. Required across all 6 screens.

9. **Markdown rendering pipeline**: `markdown-it` 14 for parsing + `shiki` 4 for
   syntax highlighting. Used in S02 (prompt detail), S03 (live preview), S04
   (raw view). XSS prevention is critical — sanitize HTML output from `v-html`.

10. **Dark theme as default**: shadcn-vue + Tailwind 4 dark mode via `.dark` class
    on `<html>`. `@vueuse/core` `useDark()` persists preference. No light/dark
    toggle complexity required — dark is the single designed mode.

## Starter Template Evaluation

### Primary Technology Domain

Vue 3 SPA (Single-Page Application) with Cloudflare edge functions, based on
project requirements analysis. A pure SPA on Vite is preferred over Nuxt 3 —
Nuxt's SSR layer, Nitro runtime, and file-based conventions add complexity that
provides no benefit when the entire backend is the GitHub API and the deployment
target is a static CDN.

### Starter Options Considered

| Option | Verdict | Reason |
|---|---|---|
| `npm create vite@latest` (vue-ts) | **Selected** | Minimal, fast, gives full control over all layers |
| `npm create nuxt@latest` | Rejected | SSR overhead not needed; Nitro server layer adds complexity |
| Community Vue + Shadcn starters | Rejected | Outdated or opinionated in ways that conflict with our stack |

### Selected Starter: Vite Vue-TS + shadcn-vue init

**Rationale for Selection:**
- Vite 8 is the research-verified build tool for this stack (weekly patches, very active)
- `vue-ts` template provides TypeScript + Vue 3 Composition API out of the box
- shadcn-vue has its own `init` command that scaffolds Tailwind 4, Reka UI, and component
  conventions on top of the Vite base
- All versions verified as actively maintained (March 2026 research audit)

**Initialization Commands:**

```bash
# 1. Scaffold Vue 3 + TypeScript SPA
npm create vite@latest prompt-community -- --template vue-ts
cd prompt-community

# 2. Initialize shadcn-vue (Tailwind 4 + Reka UI + component system)
npx shadcn-vue@latest init

# 3. Install core dependencies
npm install vue-router@5 pinia@3 @tanstack/vue-query@5
npm install @vueuse/core @octokit/graphql @octokit/core
npm install markdown-it shiki yaml minisearch
npm install vite-plugin-pwa

# 4. Install dev dependencies
npm install -D vitest @vitest/coverage-v8 @vue/test-utils
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
TypeScript strict mode. Vue 3 Composition API (`<script setup>` syntax throughout).
No Options API. All composables typed with generics where applicable.

**Styling Solution:**
Tailwind CSS 4 (configured by shadcn-vue init). Component styles via shadcn-vue
copy-in model — components are copied into `src/components/ui/` and owned by the
project, not imported from a package. Full customization without library lock-in.

**Build Tooling:**
Vite 8 with `vite-plugin-pwa` for Workbox-powered service worker generation.
`StaleWhileRevalidate` strategy for API responses; `CacheFirst` for CDN assets.
Hash-based asset fingerprinting. Tree-shaking on Shiki language grammars.

**Testing Framework:**
Vitest 4 for unit and integration tests. `@vue/test-utils` for component testing.
Coverage via `@vitest/coverage-v8`. Co-located test files (`*.spec.ts` adjacent
to source files).

**Code Organization:**
```
src/
  components/
    ui/          # shadcn-vue copied components (Button, Sheet, Command, etc.)
    layout/      # AppLayout.vue, Navbar.vue, Sidebar.vue
    prompts/     # PromptCard.vue, PromptDetail.vue, PromptList.vue
    editor/      # MarkdownEditor.vue, MetadataForm.vue
    admin/       # ModerationQueue.vue, LabelManager.vue
  views/         # BrowseView, PromptEditorView, VersionHistoryView, AdminView, UserProfileView
  stores/        # useAuthStore, usePromptsStore, useUIStore, useSearchStore, useDraftStore
  composables/   # useGitHub, useMiniSearch, useOptimisticMutation, useKeyboardShortcuts
  lib/
    github/      # Octokit GraphQL queries, REST helpers, ETag cache
    frontmatter/ # yaml wrapper (parseFrontmatter, serializeFrontmatter)
    diff/        # jsdiff wrapper for version comparison
    search/      # MiniSearch index management, IndexedDB persistence
  workers/       # Cloudflare Worker source (OAuth proxy, image upload)
  router/        # Vue Router config, route guards
  types/         # Shared TypeScript interfaces (Prompt, Comment, User, Version)
```

**Development Experience:**
- Vite HMR for instant dev feedback
- TypeScript strict mode with path aliases (`@/` → `src/`)
- ESLint + Prettier (configured by shadcn-vue init)
- `wrangler dev` for local Cloudflare Worker development

**Note:** Project initialization using the commands above should be the first
implementation story, with Cloudflare Pages + Workers infrastructure setup as
the second.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- GitHub Issues as data store with GraphQL/REST split
- GitHub OAuth App popup flow via Cloudflare Worker
- ETag-based caching + TanStack Vue Query as caching layer
- MiniSearch client-side search index (replaces GitHub Search API)
- Two-repo architecture (app repo + data repo)

**Important Decisions (Shape Architecture):**
- YAML frontmatter as schema layer inside issue bodies
- Version history via structured issue comments
- Pinia 5-store topology (Auth, Prompts, UI, Search, Draft)
- Optimistic mutations with TanStack Query onMutate/onError
- Cloudflare R2 image storage via Worker proxy

**Deferred Decisions (Post-MVP):**
- CI/CD pipeline (manual wrangler deploy until launch is stable)
- Virtual scrolling (add @tanstack/virtual if prompt count exceeds ~300)
- Upgrade from GitHub OAuth App to GitHub App (if tighter scopes needed)
- AI-assisted discovery / recommendation features

---

### Data Architecture

**Data Store: GitHub Issues via GitHub API**
- Decision: GitHub Issues is the sole data store. No application database.
- All prompts = open issues. Categories/tags = labels (`category:coding`, `model:claude`,
  `difficulty:intermediate`). Votes = reactions. Comments = issue comments.
  Version history = structured issue comments. Moderation state = labels + issue state.
- Rationale: Zero infrastructure cost, inherits GitHub auth/permissions, battle-tested
  by utterances (~9.5k stars) and giscus (~9k stars) at comparable scale.

**Schema Layer: YAML Frontmatter**
- Decision: Structured metadata stored in issue body as YAML frontmatter.
- Parsed via custom 15-line `parseFrontmatter()` wrapper around `yaml` 2.8.2
  (85M weekly downloads). `front-matter` and `gray-matter` packages rejected as
  unmaintained (5–6 years stale).
- Contract: Every issue body starts with `---\n{metadata}\n---\n{markdown content}`.

**Version History: Structured Comment Pattern**
- Decision: Each prompt edit is posted as a new issue comment with header
  `## Version N — YYYY-MM-DD`, followed by optional changelog message and full
  prompt content.
- Restore = post new comment with old content. Diff computed client-side via `jsdiff`.
- No external versioning system required.

**Caching Strategy: Three-Layer Defense**
- Layer 1: ETag conditional requests — `If-None-Match` header on all GitHub API calls.
  304 responses are free (do not count against 5,000 req/hour limit).
- Layer 2: TanStack Vue Query staleTime configuration per query type:
  - Prompt lists: 60s (browsing expects near-fresh data)
  - Individual prompt detail: 60s
  - Comments: 30s (discussion moves faster)
  - User profile: 300s (changes infrequently)
  - Admin queue: 30s (moderation urgency)
  - Labels: 60s
- Layer 3: MiniSearch IndexedDB cache — all issues pre-fetched and indexed on first
  load, persisted via `idb-keyval`. Background sync via `since` param + ETags fetches
  only changed issues. Subsequent visits load from cache instantly.

**Search: Client-Side MiniSearch Index**
- Decision: MiniSearch 7.2.0 replaces GitHub Search API for all user-facing search.
- GitHub Search API (30 req/min cap) is unsuitable for real-time filtering.
- MiniSearch builds an inverted index supporting prefix search, fuzzy matching,
  and field boosting. Index updates dynamically when new prompts are submitted.

---

### Authentication & Security

**Authentication: GitHub OAuth App + Cloudflare Worker Popup**
- Decision: GitHub OAuth App (not GitHub App). Popup flow via ~40-line CF Worker.
- Scope: `public_repo`. Tokens do not expire — no refresh logic required.
- Trade-off: `public_repo` is broader than ideal, but app only ever calls Issues API
  on the data repo. Acceptable for trusted internal company users.
- Upgrade path to GitHub App documented but deferred post-MVP.

**CSRF Protection**
- Decision: `state` parameter (cryptographic UUID) generated in Worker `/login`,
  stored as `HttpOnly; Secure; SameSite=Lax` cookie, validated in `/callback`.
- Token exchange (`client_secret`) never exposed to frontend.

**Authorization Tiers**
- Anonymous: Read-only (browse, view prompts, view profiles)
- Authenticated: Read + write (vote, comment, fork, create/edit own prompts)
- Maintainer: Full access including admin panel
- Maintainer check: `GET /repos/:owner/:repo/collaborators/:username` on login.
  Result stored in `useAuthStore.isMaintainer`.

**Token Storage**
- Decision: GitHub OAuth token stored in `localStorage` via `@vueuse/core`
  `useLocalStorage('github_token')`. Acceptable trade-off for internal tooling
  where users are trusted. No httpOnly cookie alternative without a backend.

**XSS Prevention**
- All markdown rendered via `markdown-it` must be sanitized before `v-html` binding.
- Use `markdown-it`'s `html: false` option (disables raw HTML in markdown) +
  explicit sanitization of any user-generated content.

---

### API & Communication Patterns

**API Split: GraphQL for Reads, REST for Writes**
- Decision: `@octokit/graphql` 9.x for all read queries (issues, comments, reactions,
  user data). `@octokit/core` 7.x for all write operations (create issue, add label,
  post comment, add reaction).
- Rationale: Single GraphQL query replaces 5 REST calls for prompt detail
  (issue + labels + reactions + comments + author). REST writes are simpler and
  more predictable for mutations.

**Error Handling Standard**
- Decision: Two-tier error handling.
  - API/mutation errors (network failure, rate limit, permission denied) →
    toast notification (auto-dismiss 3s success, 5s error). UI reverts via
    TanStack Query optimistic rollback.
  - Form validation errors (empty title, max tags exceeded, invalid label name) →
    inline error messages adjacent to the offending field. No toast for validation.
- Implementation: Shared `useToast()` composable (shadcn-vue Sonner). Validation
  errors managed by form component local state.

**Rate Limit Strategy**
- Primary defense: ETag 304 responses (free). Most repeat reads become zero-cost.
- Secondary defense: TanStack Query staleTime prevents unnecessary refetches.
- Search: MiniSearch index eliminates all Search API calls.
- Content-generating secondary limit (80/min, 500/hr): Optimistic UI hides latency.
  At 50–400 users, this limit is not a realistic constraint.

---

### Frontend Architecture

**State Management: 5-Store Pinia Topology**

| Store | Responsibility |
|---|---|
| `useAuthStore` | GitHub token, user object, isAuthenticated, isMaintainer |
| `usePromptsStore` | selectedPromptId, filterState (category, model), sortOrder |
| `useUIStore` | sidebarCollapsed, splitPanePosition, notificationDrawerOpen, diffMode/Layout |
| `useSearchStore` | MiniSearch query string, search results array |
| `useDraftStore` | title, content, metadata, tags, lastSaved, isDirty |

**Server State: TanStack Vue Query 5**
- All GitHub API data managed via query/mutation hooks in `src/composables/`.
- Optimistic updates via `onMutate` / `onError` rollback pattern on all mutations.
- Cache invalidation after mutations targets affected cache keys only.

**Routing: vue-router 5 + Route Guards**
- `createWebHistory()` + `_redirects` file for CF Pages SPA fallback.
- Route guards on `/prompts/new`, `/prompts/:id/edit` → redirect to `/browse` + toast
  if not authenticated.
- Route guard on `/admin` → redirect to `/browse` + toast if not maintainer.
- Edit guard on `/prompts/:id/edit` → redirect if not author AND not maintainer.

**Notification System: Load-on-Demand**
- Decision: Notification count fetched on page load and on route navigation.
  No continuous polling within a session.
- Implementation: `useNotificationsQuery` with `enabled: true` on mount only.
  Count updates when user navigates between routes (vue-router `afterEach` hook
  triggers manual refetch). Zero ongoing rate limit cost.

**Virtual Scrolling**
- Decision: Basic infinite scroll via `useIntersectionObserver` for MVP.
  `@tanstack/virtual` added only if prompt list exceeds ~300 items.
- Threshold for addition: measurable jank on mid-tier devices at current prompt count.

**PWA**
- `vite-plugin-pwa` + Workbox. `StaleWhileRevalidate` for GitHub API responses.
  `CacheFirst` for Cloudflare CDN-hosted assets. Offline = read cached prompts.
  Background sync queues writes when offline and flushes on reconnect.

---

### Infrastructure & Deployment

**Hosting: Cloudflare Pages + Workers + R2**
- App: Cloudflare Pages (unlimited free bandwidth; Netlify/Vercel cap at 100GB/mo).
- OAuth proxy + image upload: Cloudflare Workers (free tier: 100k req/day).
- Image storage: Cloudflare R2 (10GB free, zero egress fees).
- Two-repo architecture: `prompt-community` (this repo, Vue SPA) +
  `prompt-community-data` (GitHub Issues only, separate permission model).

**CI/CD: Manual Deploy for MVP**
- Decision: `wrangler pages deploy dist/` run locally after `npm run build`.
  GitHub Actions CI/CD pipeline added post-launch once deployment cadence is stable.
- Worker deployment: `wrangler deploy src/workers/oauth.ts` and
  `wrangler deploy src/workers/upload.ts`.

**Environment Configuration**
- CF Pages: `VITE_GITHUB_OWNER`, `VITE_GITHUB_DATA_REPO`, `VITE_OAUTH_WORKER_URL`
  as build-time env vars.
- CF Worker secrets (never in frontend): `CLIENT_ID`, `CLIENT_SECRET`, `APP_ORIGIN`,
  `R2_BUCKET` binding — stored via `wrangler secret put`.

**Analytics: Matomo**
- Decision: Matomo (self-hosted or cloud). GDPR-compliant, cookie-free mode
  available, full SPA navigation tracking support.
- Integration: Matomo JS snippet in `index.html` + `router.afterEach` hook to
  track virtual page views.
- Tracking: Prompt copy events, reaction toggles, session counts. No PII.

---

### Decision Impact Analysis

**Implementation Sequence:**
1. Project scaffold + CF Pages/Workers/R2 setup
2. GitHub OAuth Worker + `useAuthStore`
3. Data layer: Octokit query/mutation composables + ETag cache
4. MiniSearch index lifecycle + IndexedDB persistence
5. App Shell (S01) + routing + Pinia store topology
6. Browse/Master-Detail view (S02) — core user value
7. Prompt Editor (S03)
8. Version History (S04)
9. Admin Panel (S05)
10. User Profile (S06)
11. PWA + Workbox configuration
12. Matomo integration

**Cross-Component Dependencies:**
- Auth state (`useAuthStore`) is a prerequisite for all write operations across S02–S06.
- MiniSearch index must be built before S02 search is functional.
- YAML frontmatter parser is shared between S02 (read), S03 (write), and S04 (diff).
- TanStack Query cache keys are shared — mutations in S03/S05 must invalidate keys
  consumed by S02 (prompt list, prompt detail).
- Toast system is shared across all 6 screens — initialize in App.vue root.

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices and produce incompatible code.

---

### Naming Patterns

**Composable Naming — Query Hooks vs Stores**

Agents frequently confuse query hook names with store names since both use the
`use` prefix. The rule:

- Pinia stores: `use{Domain}Store` — e.g., `usePromptsStore`, `useAuthStore`
- TanStack Query hooks: `use{Resource}Query` / `use{Action}Mutation`
  — e.g., `usePromptsQuery`, `usePromptDetailQuery`, `useCreateCommentMutation`
- General composables (not query/store): `use{Behavior}`
  — e.g., `useKeyboardShortcuts`, `useMiniSearch`, `useOptimisticMutation`

```typescript
// ✅ CORRECT
const { data } = usePromptsQuery(filters)   // TanStack query hook
const store = usePromptsStore()             // Pinia store
useKeyboardShortcuts()                      // General composable

// ❌ WRONG — ambiguous, conflicts with store
const prompts = usePrompts()
```

**Component Naming**

All Vue SFCs use PascalCase filename AND component name. No kebab-case files.

```
✅ PromptCard.vue, AppLayout.vue, ModerationQueue.vue
❌ prompt-card.vue, app-layout.vue
```

**TypeScript Interface/Type Naming**

No `I` prefix. No `Type` suffix. Plain PascalCase nouns.

```typescript
// ✅ CORRECT
interface Prompt { ... }
interface Comment { ... }
interface GitHubUser { ... }
type SortOrder = 'votes' | 'newest' | 'discussed'

// ❌ WRONG
interface IPrompt { ... }
type PromptType = { ... }
```

**Variable & Function Naming**

- Variables/functions: `camelCase`
- Constants (module-level): `SCREAMING_SNAKE_CASE`
- CSS classes: Tailwind utility classes only (no custom class names except
  for scoped component-specific overrides in `<style scoped>`)

```typescript
// ✅ CORRECT
const selectedPromptId = ref<string | null>(null)
const MAX_TAGS = 5
function parseFrontmatter(input: string) { ... }

// ❌ WRONG
const selected_prompt_id = ref(null)
const maxTags = 5
function ParseFrontmatter(input: string) { ... }
```

**GitHub Label Naming Convention**

Labels follow `prefix:value` with lowercase kebab-case values. This is the
contract between the editor (S03), the browse filter (S02), and the admin
label manager (S05).

```
✅ category:coding   model:claude   difficulty:intermediate
   state:featured   state:flagged  state:hidden   state:draft

❌ category/coding   Category:Coding   coding   model_claude
```

**Route Naming**

All routes use plural resource names. Route params use `:id` (not `:promptId`).

```
✅ /browse  /prompts/:id  /prompts/:id/edit  /prompts/:id/versions
   /users/:username  /admin  /prompts/new

❌ /prompt/:promptId  /prompt/:id/edit  /user/:username
```

---

### Structure Patterns

**Where Query Hooks Live**

All TanStack Query hooks live in `src/composables/`. Views and components
import from composables — they never call Octokit directly.

```
src/composables/
  queries/
    usePromptsQuery.ts        # list + pagination
    usePromptDetailQuery.ts   # single prompt
    useCommentsQuery.ts
    useUserProfileQuery.ts
    usePromptVersionsQuery.ts
    useAdminQueueQuery.ts
  mutations/
    useCreatePromptMutation.ts
    useUpdatePromptMutation.ts
    useToggleReactionMutation.ts
    useCreateCommentMutation.ts
    useRestoreVersionMutation.ts
    useModerationMutation.ts
```

**Where GitHub API Logic Lives**

Octokit instances, GraphQL query strings, and ETag management live in
`src/lib/github/`. Composables call lib functions — they never instantiate
Octokit or write raw GraphQL inline.

```typescript
// ✅ CORRECT — composable calls lib function
import { fetchPrompts } from '@/lib/github/prompts'
export function usePromptsQuery(filters: PromptFilters) {
  return useQuery({ queryKey: ['prompts', filters], queryFn: () => fetchPrompts(filters) })
}

// ❌ WRONG — raw Octokit in composable
import { graphql } from '@octokit/graphql'
export function usePromptsQuery() {
  return useQuery({ queryFn: () => graphql(`query { ... }`) })
}
```

**Test File Location**

Co-located with source files. `*.spec.ts` suffix. No separate `__tests__` folder.

```
src/lib/frontmatter/parseFrontmatter.ts
src/lib/frontmatter/parseFrontmatter.spec.ts   ✅

src/__tests__/parseFrontmatter.test.ts          ❌
```

---

### Format Patterns

**TanStack Query Cache Key Structure**

Cache keys are arrays. Follow this exact structure — agents must not invent
new key formats that break cross-component cache sharing.

```typescript
['prompts', { category, model, sortOrder }]   // Prompt list (filtered)
['prompt', promptId]                           // Single prompt detail
['comments', promptId]                         // Comments for a prompt
['promptVersions', promptId]                   // Prompt versions
['user', username]                             // User profile
['user', username, 'prompts', sortBy]          // User's submitted prompts
['user', username, 'activity', page]           // User activity
['admin', 'queue']                             // Admin queue (flagged)
['admin', 'featured']                          // Admin featured
['admin', 'log', filters]                      // Admin moderation log
['labels']                                     // All labels
['notifications']                              // Notifications
```

**YAML Frontmatter Schema**

Every prompt issue body must begin with this exact YAML block. Field names
are canonical — no variations.

```yaml
---
category: coding          # one of: coding | writing | analysis | creative | system | other
model: claude             # one of: gpt-4 | gpt-4o | claude-3-5 | claude-3 | gemini | llama-3 | other
difficulty: intermediate  # one of: beginner | intermediate | advanced
tags: [api-design, testing]  # max 5, alphanumeric + hyphens, lowercase
version: 1                # integer, increments on each edit
changelog: "Initial prompt"  # string, describes this version
---
{markdown content}
```

**Version Comment Schema**

Version comments must begin with exactly this header pattern for
`usePromptVersionsQuery` to parse correctly.

```markdown
## Version 2 — 2026-03-14

Optional changelog message on this line.

{full prompt markdown content — same as issue body content section}
```

**TypeScript: GitHub API Response Mapping**

GitHub API returns snake_case. App types use camelCase. Transformation
happens exclusively in `src/lib/github/mappers.ts`. No snake_case fields
leak into components or stores.

```typescript
// ✅ CORRECT — mapper transforms at the boundary
// src/lib/github/mappers.ts
export function mapIssueToPrompt(issue: GitHubIssue): Prompt {
  return {
    id: String(issue.number),
    title: issue.title,
    authorLogin: issue.user.login,
    createdAt: new Date(issue.created_at),
  }
}

// ❌ WRONG — snake_case in component
<template>{{ prompt.created_at }}</template>
```

---

### Communication Patterns

**Pinia Store Action Naming**

Store actions use imperative verbs. No `set` prefix for complex actions.

```typescript
// ✅ CORRECT
usePromptsStore().selectPrompt(id)
usePromptsStore().setFilter({ category: 'coding' })
usePromptsStore().clearFilters()
useUIStore().toggleSidebar()
useUIStore().setSplitPanePosition(320)

// ❌ WRONG
usePromptsStore().setSelectedPrompt(id)
useUIStore().sidebarCollapsed = !sidebarCollapsed  // mutating directly outside store
```

**Vue Component Event Naming**

Component emits use `camelCase` event names (no kebab-case in `<script setup>`).

```typescript
// ✅ CORRECT
const emit = defineEmits<{
  promptSelected: [id: string]
  filterChanged: [filter: PromptFilters]
}>()

// ❌ WRONG
const emit = defineEmits(['prompt-selected', 'filter-changed'])
```

**Optimistic Mutation Pattern**

All write mutations that modify cached data must follow this exact 5-step structure.

```typescript
export function useToggleReactionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ promptId, emoji }: ToggleReactionPayload) =>
      toggleReaction(promptId, emoji),
    onMutate: async ({ promptId, emoji }) => {
      await queryClient.cancelQueries({ queryKey: ['prompt', promptId] })  // 1. Cancel
      const previous = queryClient.getQueryData(['prompt', promptId])       // 2. Snapshot
      queryClient.setQueryData(['prompt', promptId], (old: Prompt) => ({   // 3. Optimistic
        ...old,
        reactions: updateReactions(old.reactions, emoji),
      }))
      return { previous }
    },
    onError: (_err, { promptId }, context) => {
      queryClient.setQueryData(['prompt', promptId], context?.previous)    // 4. Rollback
      toast.error('Failed to update reaction')
    },
    onSettled: (_data, _err, { promptId }) => {
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] })    // 5. Invalidate
    },
  })
}
```

---

### Process Patterns

**Loading State Naming**

Use TanStack Query's native flags. Never create manual `isLoading` refs.

```typescript
// ✅ CORRECT
const { data, isPending, isError, error } = usePromptsQuery(filters)

// ❌ WRONG
const isLoading = ref(false)
```

**Error Handling at Component Level**

Components handle display only. All API error catching is in mutation hooks.
Components never call `try/catch` around query/mutation invocations.

```typescript
// ✅ CORRECT — error handled in mutation hook's onError
const { mutate: createComment } = useCreateCommentMutation()
function submitComment() {
  createComment({ promptId, text: commentText.value })
}

// ❌ WRONG — try/catch in component
async function submitComment() {
  try { await createComment(...) } catch (e) { toast.error(e.message) }
}
```

**Form Validation Timing**

Validate on `blur` for individual fields. Validate all fields on submit attempt.
Never validate on every keystroke.

**Keyboard Shortcut Registration**

All global keyboard shortcuts registered via a single `useKeyboardShortcuts`
composable initialized in `AppLayout.vue`. No `addEventListener` calls in
individual components for global shortcuts.

```typescript
// ✅ CORRECT — in AppLayout.vue
useKeyboardShortcuts({
  'cmd+k': () => openCommandPalette(),
  '[': () => uiStore.toggleSidebar(),
  'g b': () => router.push('/browse'),   // chord
  'g n': () => navigateToNew(),          // chord
})

// ❌ WRONG — scattered in Navbar.vue
onMounted(() => {
  window.addEventListener('keydown', (e) => { ... })
})
```

---

### Enforcement Guidelines

**All AI Agents MUST:**
- Use `use{Domain}Store` for Pinia stores, `use{Resource}Query` / `use{Action}Mutation`
  for TanStack hooks
- Use PascalCase for all `.vue` SFC filenames
- Use the exact cache key arrays defined in the Format Patterns section above
- Transform GitHub API snake_case to camelCase exclusively in `src/lib/github/mappers.ts`
- Follow the 5-step optimistic mutation pattern (cancel → snapshot → optimistic →
  rollback → invalidate)
- Store all query hooks in `src/composables/queries/`, all mutation hooks in
  `src/composables/mutations/`
- Register global keyboard shortcuts only via `useKeyboardShortcuts` in AppLayout
- Apply the `category:value` label naming format for all GitHub label operations

**Anti-Patterns (Never Do):**
- Never call Octokit directly from a component or Pinia store
- Never write raw GraphQL strings outside `src/lib/github/`
- Never use snake_case field names in components or stores
- Never create manual `isLoading` refs for GitHub API calls
- Never catch errors from TanStack mutations inside components
- Never add a 6th Pinia store without updating this architecture document

## Project Structure & Boundaries

### Complete Project Directory Structure

```
prompt-community/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── components.json             # shadcn-vue configuration
├── wrangler.toml               # Cloudflare Workers + R2 bindings
├── .env.example                # VITE_GITHUB_OWNER, VITE_GITHUB_DATA_REPO,
│                               # VITE_OAUTH_WORKER_URL, VITE_MATOMO_URL
├── .gitignore
├── .eslintrc.cjs
├── .prettierrc
├── public/
│   ├── favicon.ico
│   ├── manifest.webmanifest    # PWA manifest
│   └── robots.txt
├── dist/                       # build output (gitignored)
└── src/
    ├── main.ts                 # App entry: createApp, Pinia, Router, VueQuery
    ├── App.vue                 # Root component: Toaster, RouterView
    ├── assets/
    │   └── icons/
    │
    ├── components/
    │   ├── ui/                 # shadcn-vue copy-in components
    │   │   ├── Avatar.vue
    │   │   ├── Badge.vue
    │   │   ├── Button.vue
    │   │   ├── Card.vue
    │   │   ├── Checkbox.vue
    │   │   ├── Collapsible.vue
    │   │   ├── Command.vue
    │   │   ├── Dialog.vue
    │   │   ├── DropdownMenu.vue
    │   │   ├── Input.vue
    │   │   ├── Popover.vue
    │   │   ├── ResizablePanelGroup.vue
    │   │   ├── ScrollArea.vue
    │   │   ├── Select.vue
    │   │   ├── Separator.vue
    │   │   ├── Sheet.vue
    │   │   ├── Skeleton.vue
    │   │   ├── Table.vue
    │   │   ├── Tabs.vue
    │   │   ├── Textarea.vue
    │   │   ├── Toast.vue
    │   │   └── Tooltip.vue
    │   │
    │   ├── layout/             # S01 — App Shell
    │   │   ├── AppLayout.vue       # outer wrapper, keyboard shortcuts init
    │   │   ├── Navbar.vue          # logo, search, bell, avatar, +New
    │   │   ├── Sidebar.vue         # filters, categories, models, sort, admin
    │   │   └── NotificationDrawer.vue  # Sheet overlay from right
    │   │
    │   ├── prompts/            # S02 — Browse & Detail
    │   │   ├── PromptList.vue          # master panel (infinite scroll)
    │   │   ├── PromptCard.vue          # single row in master list
    │   │   ├── FilterChips.vue         # active filter chip strip
    │   │   ├── PromptDetail.vue        # detail panel container
    │   │   ├── PromptDetailHeader.vue  # sticky header (Copy/Fork/History/Share)
    │   │   ├── PromptBody.vue          # markdown + code blocks
    │   │   ├── ReactionsBar.vue        # 👍 ❤️ 🚀 toggle buttons
    │   │   ├── CommentList.vue         # paginated comment thread
    │   │   ├── CommentItem.vue         # single comment
    │   │   ├── CommentComposer.vue     # textarea + submit (auth) or CTA (anon)
    │   │   └── ResizeHandle.vue        # drag handle between panels
    │   │
    │   ├── editor/             # S03 — Prompt Editor
    │   │   ├── PromptEditorForm.vue    # metadata fields (title, category, model…)
    │   │   ├── MarkdownEditor.vue      # monospace textarea + line numbers
    │   │   ├── MarkdownToolbar.vue     # H1–H3, Bold, Italic, Code, Link, Image…
    │   │   ├── MarkdownPreview.vue     # live preview (rendered | raw toggle)
    │   │   ├── TagsInput.vue           # chip input, max 5 tags
    │   │   ├── ImageUploadZone.vue     # drag-drop + click, POST to CF Worker
    │   │   ├── DraftStatusBadge.vue    # "Saved 2m ago" / "Unsaved changes"
    │   │   └── UnsavedChangesDialog.vue  # Save/Discard/Cancel guard
    │   │
    │   ├── versions/           # S04 — Version History
    │   │   ├── VersionList.vue         # left panel: chronological version list
    │   │   ├── VersionItem.vue         # single version row + Restore button
    │   │   ├── DiffViewer.vue          # right panel: diff display
    │   │   ├── DiffToolbar.vue         # version A/B selectors, Raw, Side-by-Side/Unified
    │   │   ├── DiffLine.vue            # single diff line (added/removed/unchanged)
    │   │   └── RestoreVersionDialog.vue  # confirm restore
    │   │
    │   ├── admin/              # S05 — Admin Panel
    │   │   ├── StatCard.vue            # total/flagged/featured stat cards
    │   │   ├── ModerationQueue.vue     # flagged prompts DataTable
    │   │   ├── ModerationRow.vue       # single row (approve/hide/delete)
    │   │   ├── BulkActionBar.vue       # fixed bottom bar on row selection
    │   │   ├── LabelGrid.vue           # label management grid
    │   │   ├── LabelCard.vue           # single label card (edit/delete)
    │   │   ├── LabelForm.vue           # add/edit label inline form
    │   │   ├── ModerationLog.vue       # action history table + filters
    │   │   └── FeaturedPromptsTab.vue  # add/remove featured prompts
    │   │
    │   ├── profile/            # S06 — User Profile
    │   │   ├── ProfileHero.vue         # avatar, name, bio, stats row
    │   │   ├── SubmittedPromptsGrid.vue  # 2-col prompt grid
    │   │   ├── PromptGridCard.vue      # card in submitted/saved grid
    │   │   ├── SavedPromptsTab.vue     # own-profile-only saved prompts
    │   │   └── ActivityFeed.vue        # comment/vote activity list
    │   │
    │   └── shared/             # Reused across all screens
    │       ├── EmptyState.vue          # icon + message + optional CTA
    │       ├── ErrorState.vue          # error banner + retry
    │       ├── LoadingSkeleton.vue     # configurable skeleton rows/cards
    │       └── SearchCommand.vue       # global ⌘K command palette
    │
    ├── views/                  # Route-level page components
    │   ├── BrowseView.vue          # S02: /browse, /prompts/:id
    │   ├── PromptEditorView.vue    # S03: /prompts/new, /prompts/:id/edit
    │   ├── VersionHistoryView.vue  # S04: /prompts/:id/versions
    │   ├── AdminView.vue           # S05: /admin
    │   ├── UserProfileView.vue     # S06: /users/:username
    │   └── NotFoundView.vue
    │
    ├── stores/                 # Pinia stores (5 — do not add more without arch review)
    │   ├── useAuthStore.ts         # token, user, isAuthenticated, isMaintainer
    │   ├── usePromptsStore.ts      # selectedPromptId, filterState, sortOrder
    │   ├── useUIStore.ts           # sidebarCollapsed, splitPanePosition,
    │   │                           # notificationDrawerOpen, diffMode, diffLayout
    │   ├── useSearchStore.ts       # MiniSearch query string, results array
    │   └── useDraftStore.ts        # title, content, metadata, tags, lastSaved, isDirty
    │
    ├── composables/
    │   ├── queries/            # TanStack Query read hooks (use{Resource}Query)
    │   │   ├── usePromptsQuery.ts          # list + cursor pagination
    │   │   ├── usePromptDetailQuery.ts     # single prompt full detail
    │   │   ├── useCommentsQuery.ts         # paginated comments
    │   │   ├── usePromptVersionsQuery.ts   # version history comments
    │   │   ├── useUserProfileQuery.ts      # GitHub user profile
    │   │   ├── useUserPromptsQuery.ts      # user's submitted prompts
    │   │   ├── useUserActivityQuery.ts     # user's comment activity
    │   │   ├── useAdminQueueQuery.ts       # flagged issues
    │   │   ├── useAdminFeaturedQuery.ts    # featured issues
    │   │   ├── useModerationLogQuery.ts    # issue events log
    │   │   ├── useLabelsQuery.ts           # all repository labels
    │   │   └── useNotificationsQuery.ts    # user notifications (load-on-demand)
    │   │
    │   ├── mutations/          # TanStack Query write hooks (use{Action}Mutation)
    │   │   ├── useCreatePromptMutation.ts
    │   │   ├── useUpdatePromptMutation.ts
    │   │   ├── useToggleReactionMutation.ts
    │   │   ├── useCreateCommentMutation.ts
    │   │   ├── useRestoreVersionMutation.ts
    │   │   ├── useForkPromptMutation.ts
    │   │   ├── useModerationMutation.ts    # approve / hide / delete + bulk
    │   │   ├── useLabelMutation.ts         # create / edit / delete label
    │   │   └── useFeatureMutation.ts       # add / remove state:featured
    │   │
    │   ├── useKeyboardShortcuts.ts   # global chord detection, AppLayout only
    │   ├── useMiniSearch.ts          # index lifecycle, search, IndexedDB sync
    │   └── useRelativeTime.ts        # "2 hours ago" formatting, 60s refresh
    │
    ├── lib/
    │   ├── github/
    │   │   ├── client.ts               # Octokit graphql + rest singletons
    │   │   ├── etag.ts                 # ETag cache (If-None-Match / 304 handling)
    │   │   ├── mappers.ts              # GitHubIssue → Prompt, etc. (snake→camel)
    │   │   ├── prompts.ts              # fetchPrompts, fetchPromptDetail
    │   │   ├── comments.ts             # fetchComments, createComment
    │   │   ├── reactions.ts            # addReaction, removeReaction
    │   │   ├── issues.ts               # createIssue, updateIssue, closeIssue
    │   │   ├── labels.ts               # getLabels, createLabel, updateLabel, deleteLabel
    │   │   ├── user.ts                 # fetchUser, checkCollaborator (isMaintainer)
    │   │   └── queries/                # GraphQL query strings (template literals)
    │   │       ├── prompts.graphql.ts
    │   │       ├── comments.graphql.ts
    │   │       ├── user.graphql.ts
    │   │       └── admin.graphql.ts
    │   │
    │   ├── frontmatter/
    │   │   ├── schema.ts               # PromptMetadata type + Zod validation
    │   │   ├── parseFrontmatter.ts     # --- YAML --- → { data, content }
    │   │   ├── parseFrontmatter.spec.ts
    │   │   ├── serializeFrontmatter.ts # PromptMetadata + content → issue body string
    │   │   └── serializeFrontmatter.spec.ts
    │   │
    │   ├── diff/
    │   │   ├── computeDiff.ts          # jsdiff wrapper → DiffLine[]
    │   │   ├── computeDiff.spec.ts
    │   │   ├── parseVersionComment.ts  # "## Version N — YYYY-MM-DD" → PromptVersion
    │   │   └── parseVersionComment.spec.ts
    │   │
    │   ├── search/
    │   │   ├── buildIndex.ts           # MiniSearch index construction from Prompt[]
    │   │   ├── indexedDbCache.ts       # idb-keyval read/write for index persistence
    │   │   ├── syncIndex.ts            # background sync: since param + ETags
    │   │   └── search.ts               # query index, return ranked results
    │   │
    │   └── markdown/
    │       ├── renderer.ts             # markdown-it 14 + shiki 4 setup
    │       └── sanitize.ts             # XSS sanitization before v-html
    │
    ├── router/
    │   ├── index.ts                # createRouter, createWebHistory, route definitions
    │   └── guards.ts               # auth guard, maintainer guard, edit-owner guard
    │
    ├── types/
    │   ├── prompt.ts               # Prompt, PromptFilters, PromptMetadata, SortOrder
    │   ├── comment.ts              # Comment
    │   ├── user.ts                 # GitHubUser, AuthUser
    │   ├── version.ts              # PromptVersion, DiffLine, DiffLayout
    │   ├── label.ts                # GitHubLabel, LabelPrefix
    │   ├── notification.ts         # Notification
    │   └── github-api.ts           # Raw GitHub API types (snake_case) — boundary types only
    │
    └── workers/                # Cloudflare Worker source (deployed separately)
        ├── oauth/
        │   └── index.ts        # /login → GitHub OAuth + /callback → postMessage token
        └── upload/
            └── index.ts        # POST /api/upload → R2.put() → return public URL
```

---

### Architectural Boundaries

**GitHub API Boundary**
All calls to `api.github.com` flow exclusively through `src/lib/github/`.
Components and stores never import Octokit. The boundary is:
```
Component/Store → Composable (query/mutation) → lib/github/*.ts → GitHub API
```
ETag management is centralized in `lib/github/etag.ts` and called by all fetch
functions — no fetch function bypasses ETag headers.

**Cloudflare Worker Boundary**
The SPA communicates with CF Workers at two points only:
- `VITE_OAUTH_WORKER_URL/login` and `/callback` — OAuth token exchange
- `VITE_OAUTH_WORKER_URL/api/upload` — authenticated image upload to R2
Workers are deployed independently via `wrangler deploy`. Workers live in
`src/workers/` but are compiled separately from the SPA build.

**Pinia / TanStack Query Boundary**
- Pinia stores hold **client state** (UI state, selected IDs, filter settings, drafts)
- TanStack Query holds **server state** (GitHub API data, cached responses)
- Stores never fetch data. Query hooks never hold UI state.
- Composables read Pinia filter state to construct query keys; mutations
  invalidate query cache after writes.

**Authentication Boundary**
Auth state flows one-way: CF Worker → localStorage → `useAuthStore` → all consumers.
The store is initialized in `main.ts` (reads localStorage token). Route guards
read `useAuthStore` synchronously — no async checks inside guards.

---

### Requirements to Structure Mapping

| FR Capability | Views | Components | Composables | Lib |
|---|---|---|---|---|
| Content Discovery | BrowseView | prompts/*, shared/SearchCommand | queries/usePromptsQuery | search/*, github/prompts |
| Prompt Interaction | BrowseView | prompts/PromptDetail*, prompts/Reactions*, prompts/Comment* | mutations/useToggleReactionMutation, mutations/useCreateCommentMutation | github/reactions, github/comments |
| Prompt Creation | PromptEditorView | editor/* | mutations/useCreatePromptMutation, mutations/useUpdatePromptMutation | frontmatter/serialize, github/issues |
| Version History | VersionHistoryView | versions/* | queries/usePromptVersionsQuery, mutations/useRestoreVersionMutation | diff/* |
| Auth & Users | — | layout/Navbar, profile/* | queries/useUserProfileQuery | github/user, workers/oauth |
| Administration | AdminView | admin/* | queries/useAdminQueueQuery + others, mutations/useModerationMutation + others | github/labels, github/issues |
| Infrastructure | — | — | All queries (ETag + staleTime), useMiniSearch | github/etag, search/*, markdown/* |

**Cross-Cutting Concerns**

| Concern | Location |
|---|---|
| Keyboard shortcuts (global) | `composables/useKeyboardShortcuts.ts` — initialized in `AppLayout.vue` only |
| Toast notifications | `components/ui/Toast.vue` (Sonner) — initialized in `App.vue` |
| Markdown rendering | `lib/markdown/renderer.ts` + `lib/markdown/sanitize.ts` |
| Optimistic updates | `composables/mutations/*.ts` — 5-step pattern throughout |
| Responsive layout | `<style scoped>` media queries + `@vueuse/core` `useWindowSize()` |
| LocalStorage persistence | `@vueuse/core` `useLocalStorage()` — in Auth, UI, Draft, Search stores |
| PWA / Service Worker | `vite.config.ts` `vite-plugin-pwa` — auto-generated |
| Matomo analytics | `src/main.ts` snippet init + `src/router/index.ts` `afterEach` pageview |

---

### Integration Points & Data Flow

**Read Path (App Boot → Browse)**
```
App boot
  → useMiniSearch.buildIndex()
    → lib/search/syncIndex.ts → GitHub GraphQL (paginated, per_page=100, ETag)
    → lib/search/indexedDbCache.ts (persist index to IndexedDB)

User browses
  → usePromptsQuery(filters) → lib/github/prompts.ts (ETag conditional)
    → 304 Not Modified (free) or fresh data → lib/github/mappers.ts
    → TanStack Query cache ['prompts', filters]
  → User selects prompt → usePromptDetailQuery(id)
    → lib/github/prompts.ts + comments.ts → PromptDetail renders
```

**Write Path (Optimistic Mutation)**
```
User submits comment
  → CommentComposer → useCreateCommentMutation.mutate()
    → onMutate: cancel queries, snapshot cache, optimistic add
    → lib/github/comments.ts → POST GitHub REST API
    → onSettled: invalidate ['comments', promptId]
    → onError: rollback cache + toast.error()
```

**Auth Flow**
```
User clicks "Sign in with GitHub"
  → useAuthStore.login() → window.open(CF Worker /login)
    → Worker: state cookie + redirect to github.com/oauth/authorize
    → User consents → Worker /callback: exchange code → postMessage({token})
  → SPA receives token → useAuthStore: persist to localStorage
    → fetchUser() + checkCollaborator() → isAuthenticated, isMaintainer set
    → Route guards re-evaluate
```

---

### Development Workflow Integration

**Configuration Files (root level)**
- `vite.config.ts` — Vite build, PWA plugin, `@/` alias
- `components.json` — shadcn-vue registry (Tailwind 4, component paths)
- `wrangler.toml` — Workers entry points, R2 bucket binding, Pages project name
- `.env.example` — Documents all required env vars; actual `.env` is gitignored

**Build Process**
- `npm run build` → Vite → `dist/` (SPA + PWA service worker)
- `wrangler pages deploy dist/` → CF Pages
- `wrangler deploy src/workers/oauth/index.ts` → CF Worker (separate)
- `wrangler deploy src/workers/upload/index.ts` → CF Worker (separate)

**Local Development**
- `npm run dev` → Vite HMR (localhost:5173)
- `wrangler dev src/workers/oauth/index.ts` → local OAuth Worker (localhost:8787)
- `.env`: `VITE_OAUTH_WORKER_URL=http://localhost:8787` for local integration

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices operate within the Vue 3 / Cloudflare / GitHub API ecosystem
without conflicts. Vue 3.5 + Vite 8 + vue-router 5 + Pinia 3 + TanStack Vue Query 5
are the officially sanctioned Vue ecosystem stack. shadcn-vue 2.4 is purpose-built on
Reka UI 2.9 for Tailwind 4. All Octokit packages (graphql 9.x, core 7.x) are from
the same family. vite-plugin-pwa 1.2.0 supports Vite 8. All versions verified March 2026.

**Pattern Consistency:**
Naming conventions are consistent across all sections: `use{Domain}Store` /
`use{Resource}Query` / `use{Action}Mutation` pattern has no conflicts. Cache key
arrays are fully enumerated. The 5-step optimistic mutation pattern applies uniformly.
PascalCase component filenames are enforced everywhere. Label `prefix:value` convention
is consistent between S02 (filter), S03 (editor), and S05 (admin).

**Structure Alignment:**
All 5 Pinia stores, 12 query hooks, 9 mutation hooks, and 4 lib modules have explicit
homes in the project structure. CF Workers are isolated from SPA build. The GitHub API
boundary is clean: all `api.github.com` calls flow through `src/lib/github/` only.

**Dependency Gap Resolved:**
Four packages referenced in lib code were missing from the starter install commands.
Corrected canonical install command:

```bash
npm install vue-router@5 pinia@3 @tanstack/vue-query@5
npm install @vueuse/core @octokit/graphql @octokit/core
npm install markdown-it @shikijs/markdown-it shiki yaml minisearch
npm install jsdiff idb-keyval zod
npm install vite-plugin-pwa
```

---

### Requirements Coverage Validation ✅

**Functional Requirements Coverage — 7 Capability Areas:**

| Capability Area | Architectural Support | Status |
|---|---|---|
| Content Discovery & Browsing | BrowseView + PromptList + usePromptsQuery + MiniSearch index | ✅ |
| Prompt Viewing & Interaction | PromptDetail + ReactionsBar + CommentList/Composer + toggle/create mutations | ✅ |
| Prompt Creation & Editing | PromptEditorView + editor/* + useDraftStore + create/update mutations | ✅ |
| Authentication & User Management | useAuthStore + workers/oauth + router/guards + checkCollaborator | ✅ |
| Community Engagement | ReactionsBar + CommentComposer + useForkPromptMutation | ✅ |
| Administration & Moderation | AdminView + admin/* + useModerationMutation + useLabelMutation + useFeatureMutation | ✅ |
| Infrastructure & Caching | ETag layer + TanStack Query staleTime config + MiniSearch + PWA/Workbox | ✅ |

**Non-Functional Requirements Coverage — 6 Quality Categories:**

| NFR Category | Architectural Support | Status |
|---|---|---|
| Performance | ETag 304 (free requests) + TanStack staleTime + MiniSearch local index (<100ms search) | ✅ |
| Scalability | Free tier CF stack handles 50–400 users; rate limits mitigated by 3-layer caching | ✅ |
| Security | OAuth CSRF state cookie; `markdown-it html:false` XSS prevention; `client_secret` in Worker env only | ✅ |
| Accessibility | Reka UI WAI-ARIA primitives; shadcn-vue semantic HTML; `aria-live` in notification/vote updates | ✅ |
| Reliability | PWA/Workbox offline mode; TanStack Query optimistic rollback; ETag 304 redundancy layer | ✅ |
| Maintainability | TypeScript strict; Vitest co-located spec files; clean lib/github boundary; 5-store max rule | ✅ |

**Notification Architecture Gap — Resolved:**
`useNotificationsQuery` uses GitHub's native Notifications API (`GET /notifications`)
filtered to the data repository. This covers new comments on prompts the authenticated
user authored or subscribed to. Vote milestone notifications ("your prompt hit 100 votes")
are deferred to post-MVP — they would require a CF Worker cron or GitHub Action, adding
infrastructure complexity beyond MVP scope.

---

### Implementation Readiness Validation ✅

**Decision Completeness:**
All 5 open decisions from Step 4 documented with rationale. All technology versions
research-verified (March 2026). Cache key structure fully enumerated. YAML frontmatter
schema and version comment pattern specified as parseable contracts.

**Structure Completeness:**
70+ specific files named across 8 top-level `src/` directories. All component-to-screen
mappings explicit (S01–S06). All lib modules mapped to specific functional responsibilities.
CF Workers isolated with dedicated entry points.

**Pattern Completeness:**
12 conflict points addressed with code examples. Full working examples for highest-risk
patterns (optimistic mutation, composable/store naming, mapper boundary). Anti-patterns
explicitly enumerated. Cache key table is complete and machine-readable.

---

### Gap Analysis Results

| Priority | Gap | Resolution |
|---|---|---|
| **Important** | `jsdiff`, `idb-keyval`, `zod`, `@shikijs/markdown-it` missing from install commands | Added to Coherence section above |
| **Important** | Notification content source undefined | GitHub Notifications API for MVP; vote milestones post-MVP |
| Nice-to-have | E2E testing framework not specified | Playwright — deferred; Vitest unit coverage sufficient for MVP |
| Nice-to-have | `@tanstack/vue-virtual` upgrade path | Captured in Deferred Decisions (Step 4) |

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context (54 FRs, 24 NFRs) thoroughly analyzed
- [x] Scale and complexity assessed (low complexity, 50–400 users, free tier)
- [x] Technical constraints identified (GitHub API rate limits, no server, CORS restrictions)
- [x] 10 cross-cutting concerns mapped to implementation locations

**✅ Architectural Decisions**
- [x] Critical decisions documented (data store, auth, caching, search, two-repo)
- [x] Technology stack fully specified with March 2026 verified versions
- [x] 5 open decisions resolved collaboratively (notifications, virtual scroll, errors, CI/CD, analytics)
- [x] Deferred decisions documented with rationale

**✅ Implementation Patterns**
- [x] Naming conventions: stores, queries, mutations, components, types, routes, labels
- [x] Structure patterns: composable/lib boundaries, test co-location
- [x] Format patterns: cache keys, YAML frontmatter schema, version comment schema, API mappers
- [x] Communication patterns: store actions, component events, optimistic mutation lifecycle
- [x] Process patterns: loading states, error handling tiers, form validation timing, keyboard shortcuts
- [x] Anti-patterns explicitly enumerated

**✅ Project Structure**
- [x] Complete directory structure (70+ files named specifically)
- [x] Component boundaries established per screen (S01–S06)
- [x] Integration points mapped (GitHub API, CF Worker, Pinia/TanStack boundaries)
- [x] Requirements-to-structure mapping complete (7 capability areas + 8 cross-cutting concerns)

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**
All critical decisions are documented, all patterns have code examples, all conflict
points are addressed, and all 54 FRs have structural homes. The one important gap
(notification API source) is resolved with a clear MVP-scoped approach.

**Key Strengths:**
- Zero-infrastructure architecture is coherent end-to-end — no hidden server dependencies
- ETag + TanStack Query + MiniSearch caching strategy is layered and comprehensive
- Optimistic mutation pattern is fully specified — no implementation ambiguity on writes
- 5-store topology with explicit responsibilities prevents state management sprawl
- GitHub label naming convention enforced consistently at all three touch points

**Areas for Future Enhancement:**
- Vote milestone notifications (requires CF Worker cron or GitHub Action)
- CI/CD pipeline via GitHub Actions + Wrangler (deferred from MVP)
- Virtual scrolling via `@tanstack/vue-virtual` (deferred until ~300+ prompts)
- GitHub App migration for tighter OAuth scopes (upgrade path documented)
- E2E test suite via Playwright (deferred; unit coverage sufficient for MVP)

---

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented in this file
- Use the exact cache key arrays from the Format Patterns section — do not invent new keys
- Follow the 5-step optimistic mutation pattern for every write that touches cached data
- Never call Octokit outside `src/lib/github/` — the boundary is absolute
- Never add a 6th Pinia store — the 5-store topology is a hard constraint
- Refer to this document for all architectural questions before making assumptions

**First Implementation Priority:**
```bash
# Story 1: Project scaffold
npm create vite@latest prompt-community -- --template vue-ts
cd prompt-community
npx shadcn-vue@latest init
npm install vue-router@5 pinia@3 @tanstack/vue-query@5 \
  @vueuse/core @octokit/graphql @octokit/core \
  markdown-it @shikijs/markdown-it shiki yaml minisearch \
  jsdiff idb-keyval zod vite-plugin-pwa
npm install -D vitest @vitest/coverage-v8 @vue/test-utils

# Story 2: CF Workers + R2 infrastructure
# Configure wrangler.toml, Pages project, R2 bucket, Worker entry points
```
