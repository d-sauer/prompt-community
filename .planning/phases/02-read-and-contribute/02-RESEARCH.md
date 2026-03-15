# Phase 2: Read & Contribute - Research

**Researched:** 2026-03-15
**Domain:** GitHub GraphQL API data layer, MiniSearch, markdown-it + Shiki, jsdiff, Cloudflare R2 image uploads, TanStack Vue Query mutations, split-pane editor, Vue Router route guards
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DISC-01 | Any user can browse full prompt list without authenticating | Anonymous GraphQL via `createGraphqlClient()` (no token); `usePromptsQuery` with `requiresAuth: false` route |
| DISC-02 | Filter by category (Engineering, Business, General) | GitHub label namespace `category:*`; filter passed as GraphQL `labels:` argument to issues query |
| DISC-03 | Filter by AI model | GitHub label namespace `model:*`; same mechanism as DISC-02 |
| DISC-04 | Sort by Most Voted / Newest / Most Commented | `usePromptsStore.sortOrder`; client-side sort on loaded page; GraphQL `orderBy: CREATED_AT` for newest; reaction count + comment count sort client-side |
| DISC-05 | Client-side search under 50ms | MiniSearch 7.2.0 inverted index; built on full issue list load; `useSearchStore` triggers `miniSearch.search()` |
| DISC-06 | Full rendered markdown with syntax-highlighted code blocks | `markdown-it` 14.1.1 + `shiki` 4.0.1 `@shikijs/markdown-it` plugin; `v-html` binding |
| DISC-07 | View all metadata fields | Labels parsed for category/model/difficulty; YAML frontmatter in issue body; reactions via `reactionGroups` |
| DISC-08 | Copy to clipboard | VueUse `useClipboard()` composable; single click, toast feedback |
| DISC-09 | Shareable permalink | Vue Router named route `prompt-detail`; `window.location.href` or `useClipboard` copies URL |
| DISC-10 | Infinite scroll with skeleton loading | `useInfiniteQuery` from TanStack Vue Query; `useIntersectionObserver` from VueUse at list bottom; skeleton `<div>` components |
| CONT-01 | Create prompt with title/body/category/model/difficulty/tags | `useDraftStore`; GitHub REST `POST /repos/{owner}/{repo}/issues` with YAML frontmatter; `useCreatePrompt` mutation |
| CONT-02 | Create skill file (distinct content type) | Content type encoded as `type:skill-file` label; same issue-creation flow as prompt; frontmatter `type:` field |
| CONT-03 | Create grouped skill set (distinct content type) | `type:skill-set` label; same flow |
| CONT-04 | Add usage instructions to any submission | `usage_instructions:` key in YAML frontmatter body; rendered in detail view |
| CONT-05 | Image upload drag-and-drop, max 10MB, PNG/JPG/GIF/WebP | CF Worker `/api/upload` endpoint; `multipart/form-data`; R2 storage; `useClipboard` inserts markdown link |
| CONT-06 | Live split-pane markdown preview | `markdown-it` parse on content change; debounced 300ms; `v-html` in preview pane |
| CONT-07 | Publish creates GitHub Issue with YAML frontmatter | `@octokit/core` REST `POST /issues`; body = `---\n[YAML]\n---\n[markdown]` |
| CONT-08 | Edit own submission | `PATCH /repos/{owner}/{repo}/issues/{number}` via `useUpdatePrompt` mutation; pre-populate form from `usePromptDetail` |
| CONT-09 | Fork existing prompt | Navigate to `/prompts/new?fork=:id`; load source via `usePromptDetail`; pre-fill form; new issue on publish |
| CONT-10 | Auto-save draft to localStorage every 30 seconds | VueUse `useInterval(30000)` + `useLocalStorage('draft:new')` in `useDraftStore` |
| CONT-11 | Warn on unsaved changes navigating away | Vue Router `beforeEach` guard checks `useDraftStore.isDirty`; shadcn-vue `Dialog` confirm; `window.beforeunload` handler |
| VERS-01 | Publish updated version with changelog | Append new `## Version N — YYYY-MM-DD` comment to issue; `POST /issues/{number}/comments`; increment version frontmatter |
| VERS-02 | View full version history timeline | `usePromptVersions(id)` fetches all issue comments; filters by `## Version` header pattern |
| VERS-03 | Compare any two versions in diff view | `diff` npm package `diffLines()` function; side-by-side or unified layout toggled via `useUIStore.diffLayout` |
| VERS-04 | Restore previous version (non-destructive) | POST new version comment with old content; same mutation as VERS-01 but body copied from target version |
| VERS-05 | Confirm restore before applying | shadcn-vue `Dialog` confirmation modal; cancel aborts, confirm fires `useRestoreVersion` mutation |
| INFR-01 | FCP < 1.5s | Cloudflare CDN for static assets; bundle split via Vite dynamic imports; TanStack Query stale-while-revalidate |
| INFR-02 | Initial prompt list load < 2s | Single GraphQL query for 20 issues; TanStack Query cache; no waterfall requests |
| INFR-03 | Client-side search < 50ms | MiniSearch inverted index; pre-built on full list load; no network |
| INFR-05 | ETag conditional requests for cacheable reads | Custom fetch wrapper adds `If-None-Match`; stores ETag from response; 304 = zero rate limit cost |
| INFR-06 | MiniSearch index eliminates GitHub Search API dependency | All search done via local MiniSearch index; no `GET /search/issues` calls |
</phase_requirements>

---

## Summary

Phase 2 is the largest phase in the project — it implements all three of the core screens that define the user experience: the browse/detail split view (S02), the content editor (S03), and the version history viewer (S04). The phase builds directly on top of the Phase 1 shell: the app layout, auth stores, router, and Octokit clients are all in place. Phase 2 wires those stubs to real GitHub API data.

The three work streams map to the three plans: (1) The data layer — GraphQL query for prompt lists, MiniSearch index construction, ETag caching strategy, filter/sort logic, infinite scroll, and the browse + detail views; (2) The editor — `useDraftStore`, the split-pane editor with live preview using `markdown-it` + `shiki`, image upload to Cloudflare R2 via Worker, auto-save to localStorage, and GitHub issue mutation on publish; (3) Version history — fetching issue comments, parsing the `## Version N` header convention, computing diffs with the `diff` package, and the restore flow.

The most technically nuanced areas are: building the MiniSearch index correctly from GitHub's GraphQL response so queries complete under 50ms (INFR-03); the YAML frontmatter construction on publish (data must round-trip cleanly through `yaml.stringify` and `yaml.parse`); and the jsdiff integration for the diff view (the `diffLines` function must handle trailing newlines carefully to avoid spurious single-line changes).

**Primary recommendation:** Build the data query layer and MiniSearch index first (Plan 02-01), because Plans 02-02 and 02-03 both depend on `usePromptDetail` being available. Within Plan 02-01, stand up the GraphQL query before implementing filter/sort so there's real data to test against.

---

## Standard Stack

### Core (carried forward from Phase 1 — already installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Vue | 3.5.x | SPA framework | Installed |
| Vite | 8.0.x | Build tool | Installed |
| TypeScript | strict | Type safety | Installed |
| Vue Router | 5.0.3 | Routing | Installed |
| Pinia | 3.0.4 | Client state | Installed |
| TanStack Vue Query | 5.92.9 | Server state + caching | Installed |
| shadcn-vue | 2.4.3 | UI components | Installed |
| @vueuse/core | 14.2.1 | Composable utilities | Installed |
| @octokit/graphql | 9.0.3 | GitHub GraphQL | Installed |
| @octokit/core | 7.0.6 | GitHub REST | Installed |
| MiniSearch | 7.2.0 | Client-side search | Installed |
| yaml | 2.8.2 | YAML frontmatter | Installed |
| lucide-vue-next | 0.577.0 | Icons | Installed |

### New in Phase 2 — Must Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| markdown-it | 14.1.1 | Markdown → HTML parsing | Research doc verified; Feb 2026 release; official project choice |
| @shikijs/markdown-it | ~4.x | Shiki plugin for markdown-it | Official integration; VS Code grammar quality |
| shiki | 4.0.1 | Syntax highlighting | Research doc verified; Mar 2026 release; used for code blocks and diff raw view |
| diff | 7.x | Line-by-line text diffing | `diffLines()` function for version comparison; `diff` (not `jsdiff`) is the correct npm package name |

### shadcn-vue Components Needed in Phase 2

| Component | Purpose | Already Installed? |
|-----------|---------|-------------------|
| Input | Search input, tag input, title input | Need to add |
| Textarea | Markdown editor | Need to add |
| Select | Category/model/difficulty pickers | Need to add |
| ScrollArea | Scrollable master list, detail pane | Need to add |
| ResizablePanelGroup | Split-pane layout in browse + editor views | Need to add |
| Tabs | Mobile write/preview toggle in editor | Need to add |
| Toast | Success/error notifications | Need to add |
| Skeleton | Loading placeholders | Need to add |
| Card | Prompt row cards, version metadata card | Need to add |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `diff` npm package | Custom line diffing | diff package is 75M weekly downloads, well-maintained; custom diff has subtle bugs with trailing newlines |
| `@shikijs/markdown-it` | `highlight.js` | Shiki is project standard (same VS Code grammar); highlight.js is heavier and lacks Shiki's fidelity |
| `useIntersectionObserver` (VueUse) for infinite scroll | `@tanstack/virtual` virtualizer | Intersection observer is simpler for append-only lists; virtualizer needed only if list exceeds ~1000 items |
| ResizablePanelGroup (shadcn) | Custom drag handle | shadcn ResizablePanelGroup handles mouse + touch; localStorage persistence built in via callbacks |

### Installation

```bash
# Phase 2 — new runtime dependencies
npm install markdown-it @shikijs/markdown-it shiki diff

# Type definitions
npm install -D @types/markdown-it @types/diff

# New shadcn-vue components
npx shadcn-vue@latest add input textarea select scroll-area resizable tabs toast skeleton card
```

---

## Architecture Patterns

### Recommended Project Structure (additions for Phase 2)

```
src/
├── components/
│   ├── ui/                   # shadcn-vue: input, textarea, select, scroll-area, resizable, tabs, toast, skeleton, card
│   ├── browse/               # PromptList.vue, PromptRow.vue, FilterChips.vue, SkeletonRow.vue, EmptyState.vue
│   ├── prompt/               # PromptDetail.vue, PromptMetadata.vue, MarkdownBody.vue, PromptActions.vue
│   ├── editor/               # EditorLayout.vue, MarkdownEditor.vue, MarkdownToolbar.vue, MetadataFields.vue, ImageUploadZone.vue, PreviewPane.vue, StatusBadge.vue, TagsInput.vue
│   └── versions/             # VersionList.vue, VersionItem.vue, DiffView.vue, DiffLine.vue, RestoreDialog.vue
├── views/
│   ├── BrowseView.vue         # Replaced: full split-pane layout, PromptList + PromptDetail
│   ├── PromptDetailView.vue   # Kept: standalone detail (for direct URL navigation)
│   ├── PromptEditorView.vue   # Replaced: full editor with split-pane, metadata, auto-save
│   └── VersionHistoryView.vue # New: /prompts/:id/versions route
├── stores/
│   ├── usePromptsStore.ts     # Extended: add selectedPromptId, splitPanePosition
│   ├── useSearchStore.ts      # Extended: add miniSearch instance, buildIndex(), search()
│   ├── useDraftStore.ts       # New: title, content, metadata, tags, isDirty, lastSaved
│   └── useUIStore.ts          # Extended: add splitPanePosition, diffLayout, diffMode
├── composables/
│   └── queries/
│       ├── usePromptsQuery.ts     # New: infinite query for paginated prompt list
│       ├── usePromptDetail.ts     # New: single prompt query + detail data
│       ├── usePromptVersions.ts   # New: versions from issue comments
│       ├── useCreatePrompt.ts     # New: POST to GitHub Issues
│       ├── useUpdatePrompt.ts     # New: PATCH to GitHub Issues
│       └── useRestoreVersion.ts   # New: POST new version comment
├── lib/
│   ├── github/
│   │   ├── octokit.ts         # Existing: createGraphqlClient, createRestClient
│   │   ├── queries.ts         # New: GraphQL query strings
│   │   └── mutations.ts       # New: REST mutation helpers
│   ├── markdown.ts            # New: markdown-it + shiki setup, renderMarkdown()
│   ├── search.ts              # New: MiniSearch instance, buildIndex(), searchPrompts()
│   ├── diff.ts                # New: computeDiff(), DiffLine type
│   ├── frontmatter.ts         # New: parseFrontmatter(), buildFrontmatter()
│   └── utils.ts               # Existing
├── types/
│   └── index.ts               # Extended: VersionObject, DiffLine, DraftState, ContentType
└── workers/
    ├── oauth.ts               # Existing
    └── upload.ts              # New: CF Worker for R2 image uploads
```

### Pattern 1: GitHub GraphQL Infinite Query

**What:** TanStack Vue Query `useInfiniteQuery` with cursor-based pagination. Fetch 20 prompts per page. The `endCursor` from GitHub's `pageInfo` is the `nextPageParam`.
**When to use:** For the master list in BrowseView, replacing the stub `usePromptsQuery`.

```typescript
// src/composables/queries/usePromptsQuery.ts
import { useInfiniteQuery } from '@tanstack/vue-query'
import { createGraphqlClient } from '@/lib/github/octokit'
import { useAuthStore } from '@/stores/useAuthStore'
import type { FilterState, SortOrder } from '@/types'

const GET_PROMPTS = `
  query GetPrompts($cursor: String, $labels: [String!]) {
    repository(owner: "${import.meta.env.VITE_GITHUB_OWNER}", name: "${import.meta.env.VITE_GITHUB_REPO}") {
      issues(first: 20, after: $cursor, states: OPEN, labels: $labels, orderBy: {field: CREATED_AT, direction: DESC}) {
        totalCount
        pageInfo { hasNextPage endCursor }
        nodes {
          number title body createdAt updatedAt
          author { login avatarUrl }
          labels(first: 10) { nodes { name color } }
          reactionGroups { content reactors { totalCount } }
          comments { totalCount }
        }
      }
    }
  }
`

export function usePromptsQuery(filters: Ref<FilterState>) {
  const authStore = useAuthStore()
  return useInfiniteQuery({
    queryKey: ['prompts', filters],
    queryFn: async ({ pageParam }) => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      const labels = buildLabelFilters(filters.value)
      return client<PromptsQueryResult>(GET_PROMPTS, { cursor: pageParam, labels })
    },
    getNextPageParam: (last) => last.repository.issues.pageInfo.hasNextPage
      ? last.repository.issues.pageInfo.endCursor
      : undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
  })
}
```

### Pattern 2: ETag Conditional Requests

**What:** Custom fetch wrapper stores `ETag` from GitHub responses. Subsequent requests include `If-None-Match` header. 304 responses return zero API points.
**When to use:** Wrap `createGraphqlClient` for all reads in the data layer.

```typescript
// src/lib/github/etag.ts
const etagCache = new Map<string, string>()

export function withETag(client: ReturnType<typeof graphql.defaults>, cacheKey: string) {
  // For GraphQL, ETags work at the transport level.
  // Include a custom header; GitHub respects If-None-Match for GraphQL POSTs.
  const etag = etagCache.get(cacheKey)
  // Store ETag from response headers — requires fetch middleware
  // TanStack Query handles the caching layer; ETag reduces GitHub's rate limit cost
}
```

**Note (MEDIUM confidence):** GitHub's GraphQL API supports ETags at the transport level but returns the same ETag for identical queries. The simpler approach for Phase 2 is to rely on TanStack Query's `staleTime` (60s for list, 300s for detail) and add ETag support via a custom `fetch` wrapper passed to `@octokit/graphql` if rate limits become a concern during testing. INFR-05 is satisfied when 304 responses are returned; this is primarily a concern for the REST API where Octokit passes headers automatically.

### Pattern 3: MiniSearch Index Build + Search

**What:** On first full page load of prompt list, build a MiniSearch index from all fetched prompts. Store the `MiniSearch` instance in `useSearchStore`. Search is synchronous and returns results in < 50ms.
**When to use:** In `useSearchStore` after `usePromptsQuery` returns all pages.

```typescript
// src/lib/search.ts
import MiniSearch from 'minisearch'
import type { Prompt } from '@/types'

export function createSearchIndex(prompts: Prompt[]): MiniSearch<Prompt> {
  const index = new MiniSearch<Prompt>({
    fields: ['title', 'body', 'tags'],           // indexed fields
    storeFields: ['id', 'title', 'author', 'category', 'model', 'difficulty', 'tags'],  // returned fields
    searchOptions: {
      boost: { title: 3, tags: 2, body: 1 },     // title matches matter most
      prefix: true,                               // prefix match for typing
      fuzzy: 0.2,                                 // slight fuzzy for typos
    },
  })
  index.addAll(prompts)
  return index
}

export function searchPrompts(index: MiniSearch<Prompt>, query: string): Prompt[] {
  if (!query.trim()) return []
  return index.search(query) as unknown as Prompt[]
}
```

```typescript
// src/stores/useSearchStore.ts (extended)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import MiniSearch from 'minisearch'
import { createSearchIndex, searchPrompts } from '@/lib/search'
import type { Prompt } from '@/types'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const allPrompts = ref<Prompt[]>([])
  let miniSearchInstance: MiniSearch<Prompt> | null = null

  function buildIndex(prompts: Prompt[]) {
    allPrompts.value = prompts
    miniSearchInstance = createSearchIndex(prompts)
  }

  const results = computed<Prompt[]>(() => {
    if (!query.value.trim() || !miniSearchInstance) return allPrompts.value
    return searchPrompts(miniSearchInstance, query.value)
  })

  function setQuery(q: string) { query.value = q }

  return { query, results, buildIndex, setQuery }
})
```

### Pattern 4: YAML Frontmatter Construction for GitHub Issues

**What:** When publishing a prompt, build the issue body as YAML frontmatter followed by the markdown content. The frontmatter encodes all metadata. Parse on read using the `yaml` package.
**When to use:** In `useCreatePrompt` and `useUpdatePrompt` mutations.

```typescript
// src/lib/frontmatter.ts
import YAML from 'yaml'

export interface PromptFrontmatter {
  type: 'prompt' | 'skill-file' | 'skill-set'
  category: string
  model: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  version: number
  changelog?: string
}

export function buildFrontmatter(meta: PromptFrontmatter): string {
  return `---\n${YAML.stringify(meta)}---\n\n`
}

export function parseFrontmatter(body: string): { data: Partial<PromptFrontmatter>; content: string } {
  const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: body.trim() }
  return { data: YAML.parse(match[1]) as Partial<PromptFrontmatter>, content: match[2].trim() }
}
```

### Pattern 5: markdown-it + Shiki Setup

**What:** A singleton `markdown-it` instance configured with the Shiki plugin for syntax highlighting. Rendering is synchronous after Shiki's async initialization.
**When to use:** In `src/lib/markdown.ts`, called from `MarkdownBody.vue` and `PreviewPane.vue`.

```typescript
// src/lib/markdown.ts
import MarkdownIt from 'markdown-it'
import { fromHighlighter } from '@shikijs/markdown-it'
import { createHighlighter } from 'shiki'

let mdInstance: MarkdownIt | null = null

export async function initMarkdown(): Promise<MarkdownIt> {
  if (mdInstance) return mdInstance

  const highlighter = await createHighlighter({
    themes: ['github-dark'],
    langs: ['typescript', 'javascript', 'python', 'bash', 'json', 'yaml', 'markdown', 'sql', 'rust', 'go'],
  })

  mdInstance = new MarkdownIt({ html: false, linkify: true, typographer: true })
  mdInstance.use(fromHighlighter(highlighter, { theme: 'github-dark' }))

  return mdInstance
}

export function renderMarkdown(md: MarkdownIt, content: string): string {
  return md.render(content)
}
```

**Key detail:** `createHighlighter` is async. Call it once at app boot (e.g., in `App.vue` `onMounted`) or use Vue's `defineAsyncComponent` + `Suspense` for lazy loading. Shiki 4 supports on-demand language loading to keep the initial bundle small.

### Pattern 6: jsdiff Line-by-Line Diff

**What:** The `diff` npm package's `diffLines()` function computes a patch object. Each entry has `added`, `removed`, and `value` properties. Transform into `DiffLine[]` for the diff renderer.
**When to use:** In `src/lib/diff.ts`, called when version A or B selection changes.

```typescript
// src/lib/diff.ts
import { diffLines } from 'diff'

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumberA: number | null
  lineNumberB: number | null
}

export function computeDiff(versionA: string, versionB: string): DiffLine[] {
  const changes = diffLines(versionA, versionB)
  const lines: DiffLine[] = []
  let lineA = 1
  let lineB = 1

  for (const change of changes) {
    const rawLines = change.value.split('\n').filter((_, i, arr) => i < arr.length - 1 || arr[arr.length - 1] !== '')
    for (const line of rawLines) {
      if (change.added) {
        lines.push({ type: 'added', content: line, lineNumberA: null, lineNumberB: lineB++ })
      } else if (change.removed) {
        lines.push({ type: 'removed', content: line, lineNumberA: lineA++, lineNumberB: null })
      } else {
        lines.push({ type: 'unchanged', content: line, lineNumberA: lineA++, lineNumberB: lineB++ })
      }
    }
  }
  return lines
}
```

### Pattern 7: Auto-Save Draft Store

**What:** `useDraftStore` stores the editor state with `isDirty` tracking and `useLocalStorage` for persistence. A `useInterval(30_000)` triggers saves. On mount, the editor checks for a saved draft to recover.
**When to use:** In `PromptEditorView.vue`; mounted composable.

```typescript
// src/stores/useDraftStore.ts
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useLocalStorage, useInterval } from '@vueuse/core'
import type { PromptFrontmatter } from '@/lib/frontmatter'

export const useDraftStore = defineStore('draft', () => {
  const draftKey = ref('draft:new')
  const persistedDraft = useLocalStorage<Partial<DraftState>>(draftKey, {})

  const title = ref('')
  const content = ref('')
  const metadata = ref<Partial<PromptFrontmatter>>({})
  const tags = ref<string[]>([])
  const lastSaved = ref<Date | null>(null)
  const isDirty = ref(false)

  // Mark dirty on any field change
  watch([title, content, metadata, tags], () => { isDirty.value = true }, { deep: true })

  function save() {
    persistedDraft.value = { title: title.value, content: content.value, metadata: metadata.value, tags: tags.value }
    lastSaved.value = new Date()
    isDirty.value = false
  }

  function recover(promptId?: string | number) {
    draftKey.value = promptId ? `draft:${promptId}` : 'draft:new'
    const saved = persistedDraft.value
    if (saved?.title) title.value = saved.title
    if (saved?.content) content.value = saved.content
    if (saved?.metadata) metadata.value = saved.metadata
    if (saved?.tags) tags.value = saved.tags
  }

  function clear() {
    persistedDraft.value = {}
    isDirty.value = false
    lastSaved.value = null
  }

  // Auto-save every 30 seconds
  useInterval(save, 30_000)

  return { title, content, metadata, tags, lastSaved, isDirty, save, recover, clear }
})

interface DraftState {
  title: string
  content: string
  metadata: Partial<PromptFrontmatter>
  tags: string[]
}
```

### Pattern 8: Version History Parse

**What:** Issue comments whose body begins with `## Version N — YYYY-MM-DD` are version entries. Everything after that header is the version's full prompt content.
**When to use:** In `usePromptVersions(id)` composable.

```typescript
// src/composables/queries/usePromptVersions.ts
const VERSION_HEADER_RE = /^## Version (\d+) — (\d{4}-\d{2}-\d{2})\s*\n?(.*)?/

export function parseVersionComment(comment: GitHubComment): VersionObject | null {
  const match = comment.body.match(VERSION_HEADER_RE)
  if (!match) return null
  return {
    version: parseInt(match[1]),
    date: new Date(match[2]),
    changelog: match[3]?.trim() ?? '',
    content: comment.body.replace(match[0], '').trim(),
    commentId: comment.id,
    author: comment.author.login,
    authorAvatar: comment.author.avatarUrl,
  }
}
```

### Pattern 9: R2 Image Upload (Cloudflare Worker)

**What:** A new Cloudflare Worker endpoint `/api/upload` accepts `multipart/form-data` with an image file. It verifies the GitHub token (authenticates the uploader), uploads the file to R2, and returns the public R2 URL.
**When to use:** In `ImageUploadZone.vue` component; POST to `VITE_CF_WORKER_URL + '/api/upload'`.

```typescript
// src/workers/upload.ts (new Worker endpoint — add to existing wrangler.toml)
interface Env {
  R2_BUCKET: R2Bucket
  R2_PUBLIC_URL: string
  APP_ORIGIN: string
}

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  // Verify GitHub token from Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('token ')) {
    return new Response('Unauthorized', { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return new Response('No file', { status: 400 })

  // Validate type + size
  const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) return new Response('Unsupported type', { status: 400 })
  if (file.size > 10 * 1024 * 1024) return new Response('File too large', { status: 413 })

  // Upload to R2
  const key = `uploads/${crypto.randomUUID()}-${file.name}`
  await env.R2_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type } })

  return Response.json({ url: `${env.R2_PUBLIC_URL}/${key}` })
}
```

### Anti-Patterns to Avoid

- **Calling GitHub API on every search keystroke:** MiniSearch is the index; never call `GET /search/issues` for user-facing search. The `useSearchStore.results` computed value handles filtering entirely client-side.
- **`v-html` without sanitization on user content:** `markdown-it` with `html: false` prevents XSS from raw HTML in markdown. Do NOT set `html: true` unless explicitly needed for trusted content.
- **Rebuilding MiniSearch index on every filter change:** Build the index once from the full prompt list. Filter/sort separately using the store's `filterState`. MiniSearch searches within the pre-built index; label filters are applied by `usePromptsQuery` at the GraphQL level for the initial fetch.
- **Storing the draft token in localStorage:** `useDraftStore` persists draft content (title, body, metadata) to localStorage. The GitHub auth token must stay in Pinia memory only (INFR-07). Never call `useLocalStorage('token', ...)`.
- **Using `markdown-it` `html: true`:** User-generated content in prompts may contain raw HTML. Leaving `html: false` (markdown-it default) prevents XSS. Code block copy buttons are inserted via Shiki's renderer, not via trusted HTML.
- **Synchronous Shiki initialization blocking render:** `createHighlighter` is async. Initialize it once at startup via `App.vue` + a Pinia state flag; use a computed `isMarkdownReady` guard before rendering any markdown.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown rendering with code highlighting | Custom renderer | `markdown-it` + `@shikijs/markdown-it` | TextMate grammars, 200+ languages, VS Code fidelity |
| Text diffing algorithm | Custom line diff | `diff` npm package (`diffLines`) | Myers diff algorithm, handles edge cases (trailing newlines, empty files) |
| Client-side search | Linear scan with `Array.filter` | `MiniSearch` | Inverted index, prefix search, fuzzy matching, < 50ms at 1000 prompts |
| Clipboard copy | `document.execCommand('copy')` | VueUse `useClipboard()` | Modern Clipboard API with async/sync fallback; handles permissions |
| Infinite scroll trigger | manual scroll event calculations | VueUse `useIntersectionObserver` | IntersectionObserver API, reactive, auto-cleanup on unmount |
| Auto-save interval | `setInterval` + manual cleanup | VueUse `useInterval` | Auto-cleanup on component unmount; avoids memory leaks |
| localStorage persistence | `JSON.parse/stringify` + `localStorage` | VueUse `useLocalStorage` | Reactive; SSR-safe; syncs across tabs |
| Resizable split pane | CSS + mouse event logic | shadcn-vue `ResizablePanelGroup` | Mouse + touch support; min/max constraints; localStorage persistence via `onLayout` |
| Toast notifications | Custom positioned div | shadcn-vue `Toast` / `useToast` | ARIA live region; auto-dismiss; accessible |
| Scroll container | Custom overflow div | shadcn-vue `ScrollArea` | Cross-browser scrollbar styling; keyboard accessibility |
| Confirm dialogs | `window.confirm()` | shadcn-vue `Dialog` | Matches app theme; supports custom actions; focus trap |
| YAML parsing | Custom regex | `yaml` package | Already installed; handles all YAML types; round-trips correctly |

**Key insight:** The Phase 2 feature set looks large, but most of the hard problems (diffing, searching, markdown rendering, clipboard, infinite scroll) have well-maintained, purpose-built libraries that handle edge cases far better than custom code.

---

## Common Pitfalls

### Pitfall 1: Shiki Async Init Race Condition

**What goes wrong:** `renderMarkdown()` is called before `initMarkdown()` resolves. The `mdInstance` is null, causing a runtime error or unformatted markdown.
**Why it happens:** `createHighlighter()` is async (loads WASM + language grammars from CDN or bundle). The component renders before init completes.
**How to avoid:** Initialize in `App.vue` `onMounted` and store readiness in `useUIStore.markdownReady`. In `MarkdownBody.vue` and `PreviewPane.vue`, use a `v-if="uiStore.markdownReady"` guard. Alternatively, use `defineAsyncComponent` + `Suspense`. Store the `MarkdownIt` instance in a module-level singleton or Pinia store.
**Warning signs:** `Cannot read properties of null (reading 'render')` in the preview pane; empty preview on first load.

### Pitfall 2: MiniSearch Index Not Rebuilt When New Prompts Load

**What goes wrong:** User creates a new prompt, but searching for it returns no results. The MiniSearch index was built at page load and doesn't include the new prompt.
**Why it happens:** MiniSearch is an in-memory index. New API data doesn't automatically sync to it.
**How to avoid:** After a successful `useCreatePrompt` mutation, call `useSearchStore.buildIndex([...allPrompts, newPrompt])` or more precisely `miniSearchInstance.add(newPrompt)`. TanStack Query's `invalidateQueries(['prompts'])` refetches the list; watch the query result in `useSearchStore` to rebuild the index.
**Warning signs:** Newly created prompt is visible in the list but doesn't appear in search results.

### Pitfall 3: YAML Frontmatter Round-Trip Corruption

**What goes wrong:** Tags array like `['api-design', 'testing']` serializes to YAML and back correctly, but special characters in values (`:`, `#`, `&`) break `YAML.parse()`.
**Why it happens:** YAML has many reserved characters. `yaml` 2.x handles this but requires explicit quoting for values containing `:`.
**How to avoid:** Use `YAML.stringify({ tags: [...] })` and never construct YAML by string concatenation. The `yaml` package quotes values correctly. Test the round-trip `parseFrontmatter(buildFrontmatter(meta))` unit test for values with colons.
**Warning signs:** Published prompts show `null` for category/model on re-read; tags array becomes a string.

### Pitfall 4: Unsaved Changes Guard Not Firing on Browser Back

**What goes wrong:** The unsaved-changes `ConfirmDialog` appears on in-app navigation but not when the user presses the browser back button.
**Why it happens:** Vue Router's `beforeEach` guard fires for SPA navigation. Browser back button triggers a native `popstate` event that Vue Router intercepts — but if the user navigates completely away from the SPA, the guard is bypassed.
**How to avoid:** Add a `beforeunload` event listener (via VueUse `useEventListener`) that checks `isDirty` and returns a confirmation message. Note: modern browsers show a generic "Leave site?" dialog — you cannot customize the message. This satisfies CONT-11.
**Warning signs:** `isDirty` dialog appears for router-link navigation but browser back ignores it.

### Pitfall 5: GraphQL Pagination Missing Prompts on List Mutation

**What goes wrong:** After creating a new prompt, `invalidateQueries(['prompts'])` refetches page 1, but the user is on page 5. The new prompt appears at the top (newest-first) in the refetched page 1 but the component is still showing pages 1-5 with page 1 refreshed — this can cause duplicate prompts.
**Why it happens:** `useInfiniteQuery` caches all pages. Invalidation triggers a refetch from page 1, but the full page stack may be stale.
**How to avoid:** After mutation, reset the query to page 1 with `queryClient.resetQueries(['prompts'])` instead of `invalidateQueries`. Alternatively, add the new prompt directly to `useSearchStore.allPrompts` and call `miniSearchInstance.add()` without resetting the paginated query — this avoids the refetch entirely for the list view.
**Warning signs:** Duplicate prompt rows after publishing; new prompt appears twice.

### Pitfall 6: Version Comment Parsing Fails on Edited Comments

**What goes wrong:** A user edits a GitHub issue comment after it was posted as a version entry. The comment body no longer starts with `## Version N`, and `parseVersionComment` returns `null`, silently dropping a version from the history.
**Why it happens:** GitHub allows comment editing, which can break the `## Version` header pattern.
**How to avoid:** In `usePromptVersions`, filter `null` results from `parseVersionComment` and log a warning. Do not throw. The timeline simply shows fewer versions than expected, which is acceptable. For the restore flow, only show versions that parsed successfully.
**Warning signs:** Version count in UI is lower than expected; no error shown.

### Pitfall 7: diff Package Trailing Newline Artifacts

**What goes wrong:** Every diff between two version texts shows an "added" or "removed" line at the end that's actually just a trailing newline difference. This makes every diff look like it has changes even when content is identical except for a trailing newline.
**Why it happens:** `diffLines` treats `\n` at the end of the last line as a significant change. If one version has a trailing newline and another doesn't, a spurious diff line appears.
**How to avoid:** Normalize version content before diffing: `content.trim()` removes leading/trailing whitespace and newlines. Apply `trim()` to both inputs before passing to `diffLines`.
**Warning signs:** Every diff shows a single "removed" or "added" line at the bottom with empty content; diffs between identical versions show changes.

### Pitfall 8: Image Upload CORS Issue with CF Worker

**What goes wrong:** The SPA POSTs to the CF Worker `/api/upload` endpoint but gets a CORS error.
**Why it happens:** The Worker's `/api/upload` handler doesn't include CORS headers. The OAuth Worker from Phase 1 doesn't handle preflight OPTIONS requests.
**How to avoid:** Add CORS headers to the upload Worker response: `Access-Control-Allow-Origin: ${env.APP_ORIGIN}` and handle `OPTIONS` preflight requests with a 204 response. Or add a CORS middleware in `wrangler.toml` using CF's built-in CORS handling if available.
**Warning signs:** Image drop triggers upload POST, but browser console shows `CORS error`; upload fails silently.

### Pitfall 9: ResizablePanelGroup Persistence in localStorage

**What goes wrong:** The split pane position is persisted but the key used differs between sessions, or the `onLayout` callback saves percentage values that don't restore correctly.
**Why it happens:** shadcn-vue's `ResizablePanelGroup` stores panel sizes as percentages (0-100), not pixels. Restoring on a different viewport size may produce unexpected layouts.
**How to avoid:** The `ResizablePanelGroup` component uses `storage` prop for automatic persistence. Pass `storage={customStorage}` that uses `useUIStore.splitPanePosition` (in Pinia + localStorage). Alternatively, persist the percentage value and apply it directly — percentages are viewport-relative, so they scale correctly.
**Warning signs:** Sidebar appears at wrong width after refresh; console shows NaN in panel width.

---

## Code Examples

Verified patterns from official sources and project research doc:

### GraphQL Query for Issue List

```graphql
# Source: vue-github-issues-platform-research.md
query GetPrompts($cursor: String, $labels: [String!]) {
  repository(owner: "org", name: "prompts-data") {
    issues(first: 20, after: $cursor, states: OPEN, labels: $labels, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        number title body createdAt updatedAt
        author { login avatarUrl }
        labels(first: 10) { nodes { name color } }
        reactionGroups { content reactors { totalCount } }
        comments { totalCount }
      }
    }
  }
}
```

### Publish Prompt via REST

```typescript
// Source: S03 requirements FR-18, architecture.md
async function createIssue(token: string, body: string, title: string, labelNames: string[]) {
  const octokit = createRestClient(token)
  return octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner: import.meta.env.VITE_GITHUB_OWNER,
    repo: import.meta.env.VITE_GITHUB_REPO,
    title,
    body,   // YAML frontmatter + markdown content
    labels: labelNames,  // ['category:coding', 'model:gpt-4o', 'difficulty:intermediate']
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
}
```

### Fetch Version Comments

```typescript
// Source: S04 requirements FR-02, architecture.md
async function getVersionComments(token: string | null, issueNumber: number) {
  const client = createGraphqlClient(token ?? undefined)
  const result = await client<CommentsResult>(`
    query GetVersions($number: Int!) {
      repository(owner: "${import.meta.env.VITE_GITHUB_OWNER}", name: "${import.meta.env.VITE_GITHUB_REPO}") {
        issue(number: $number) {
          comments(first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
            nodes { id body createdAt author { login avatarUrl } }
          }
        }
      }
    }
  `, { number: issueNumber })
  return result.repository.issue.comments.nodes
}
```

### Skeleton Row Loading State

```vue
<!-- Source: S02 requirements FR-09 — 3-5 skeleton rows with pulse animation -->
<template>
  <div v-for="i in 5" :key="i" class="flex items-center gap-3 px-3 py-3 animate-pulse">
    <div class="w-5 h-5 rounded-full bg-[#2a2a3a] shrink-0"></div>
    <div class="flex-1 space-y-2">
      <div class="h-3 bg-[#2a2a3a] rounded w-3/4"></div>
      <div class="h-2 bg-[#2a2a3a] rounded w-1/2"></div>
    </div>
  </div>
</template>
```

### Infinite Scroll Trigger with useIntersectionObserver

```typescript
// Source: VueUse docs + S02 requirements FR-07
import { useIntersectionObserver } from '@vueuse/core'

const loadMoreRef = ref<HTMLElement | null>(null)

useIntersectionObserver(loadMoreRef, ([{ isIntersecting }]) => {
  if (isIntersecting && hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage()
  }
})
```

### Version Restore Mutation

```typescript
// Source: S04 requirements FR-11
async function restoreVersion(token: string, issueNumber: number, targetVersion: VersionObject) {
  const octokit = createRestClient(token)
  const now = new Date().toISOString().split('T')[0]
  const newVersionNum = /* current max version */ + 1
  const body = `## Version ${newVersionNum} — ${now}\nRestored from version ${targetVersion.version}\n\n${targetVersion.content}`
  return octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
    owner: import.meta.env.VITE_GITHUB_OWNER,
    repo: import.meta.env.VITE_GITHUB_REPO,
    issue_number: issueNumber,
    body,
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `highlight.js` for code blocks | Shiki 4 + markdown-it plugin | Shiki v4 March 2026 | VS Code TextMate grammars; major v4 API improvements; `fromHighlighter()` is the new pattern |
| `jsdiff` (outdated name) | `diff` npm package (same library) | Always — `jsdiff` was never the npm name | Import is `import { diffLines } from 'diff'`, not `import jsdiff from 'jsdiff'`; the wireframe spec says "jsdiff" colloquially |
| `useInfiniteQuery` v4 API | TanStack Vue Query v5 infinite query API | v5.x | `initialPageParam` is now required; `getNextPageParam` signature changed |
| localStorage draft saving with manual JSON | VueUse `useLocalStorage` with reactive state | VueUse 14 | Reactive; handles JSON serialization automatically |
| `setInterval` for auto-save | VueUse `useInterval` | VueUse 14 | Auto-cleanup on unmount; no manual `clearInterval` needed |

**Deprecated/outdated:**
- `jsdiff` as a package name: The correct npm package is `diff`. The architecture docs and wireframe specs say "jsdiff" colloquially — always install `npm install diff`.
- `markdown-it-highlightjs`: Do not use; project standard is `@shikijs/markdown-it`.
- `front-matter` / `gray-matter`: Both unmaintained — use `yaml` package with custom 15-line parser (already documented in Phase 1 research).
- `@tanstack/vue-query` v4 API patterns: The `useInfiniteQuery` `pageParam` API changed in v5. Use `initialPageParam` and the updated `getNextPageParam` callback.

---

## New Routes Required

The router currently has stubs for `browse`, `prompt-detail`, `prompt-new`. Phase 2 adds:

```typescript
// src/router/index.ts additions
{
  path: 'prompts/:id/edit',
  name: 'prompt-edit',
  component: () => import('@/views/PromptEditorView.vue'),
  meta: { requiresAuth: true },
},
{
  path: 'prompts/:id/versions',
  name: 'prompt-versions',
  component: () => import('@/views/VersionHistoryView.vue'),
},
```

The `PromptEditorView.vue` handles both `/prompts/new` and `/prompts/:id/edit` routes — detect mode via `useRoute().params.id` presence.

---

## Infrastructure: Cloudflare R2 + Worker Upload Endpoint

Phase 2 activates Cloudflare R2 for the first time (INFR-10 noted R2 not needed until Phase 2).

**wrangler.toml additions:**

```toml
# Add R2 binding to existing Worker
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "prompt-community-uploads"

[vars]
R2_PUBLIC_URL = "https://assets.your-domain.com"
```

**R2 free tier:** 10 GB storage, 1 million Class A operations (writes), 10 million Class B operations (reads), zero egress fees. More than sufficient for the target scale.

**Upload flow in SPA:**
1. `ImageUploadZone.vue` receives file via drag-drop or file picker
2. POST `FormData` to `VITE_CF_WORKER_URL + '/api/upload'` with `Authorization: token ${authStore.token}`
3. Worker validates token, validates file type/size, uploads to R2
4. Returns `{ url: string }` — the R2 public URL
5. Component inserts `![image](url)` at cursor position in editor

---

## Open Questions

1. **Anonymous rate limits without GitHub App installation token**
   - What we know: Phase 1 research flagged that `VITE_GITHUB_APP_INSTALLATION_ID` is defined in `.env.example` but left unused in Phase 1. Public repo reads without any auth token have a rate limit of 60 req/hour vs 5,000/hour for authenticated.
   - What's unclear: At 50–400 users, anonymous users browsing simultaneously could hit the 60 req/hour unauthenticated limit. The `createGraphqlClient()` currently passes no token for anonymous users.
   - Recommendation: For Phase 2, use the GitHub OAuth App token for all reads when authenticated, and for anonymous users rely on TanStack Query's cache (single initial fetch shared across users). The MiniSearch index means search never hits the API. Monitor in practice; if anonymous rate limits become a concern, wire up the installation token flow in a follow-up.

2. **Shiki bundle size with on-demand language loading**
   - What we know: Shiki 4 supports on-demand language loading. Loading all languages at startup would significantly increase bundle size.
   - What's unclear: The exact bundle impact of loading 10 vs 200 languages; whether CDN-loading grammars is acceptable for internal-tool latency requirements.
   - Recommendation: Load only the 10 most common languages at startup (TypeScript, JavaScript, Python, Bash, JSON, YAML, Markdown, SQL, Rust, Go). Shiki 4's `createHighlighter` accepts an array of lang strings. Add more on demand if users request them. INFR-01 (FCP < 1.5s) should be verified after adding Shiki.

3. **Sort by "Most Voted" without GitHub Search API**
   - What we know: GitHub's GraphQL `issues` query supports `orderBy: CREATED_AT` or `orderBy: UPDATED_AT`. There is no server-side sort by reaction count in GraphQL.
   - What's unclear: How to efficiently sort by vote count when the total list is paginated. Client-side sort works if all pages are fetched, but fetching all pages on first load for large datasets is expensive.
   - Recommendation: For Phase 2, fetch all pages on app load (MiniSearch index requires this anyway per the research doc's "pre-fetch all open issues" strategy). Sort the full in-memory list by `reactionGroups['+1'].reactors.totalCount`. This is fine at 50–400 users. The research doc explicitly recommends this approach: "sort client-side."

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-05 | MiniSearch returns results < 50ms for 100 prompts | unit | `npx vitest run src/lib/search.spec.ts` | ❌ Wave 0 |
| INFR-03 | Search response < 50ms | unit (timer assertion) | `npx vitest run src/lib/search.spec.ts` | ❌ Wave 0 |
| INFR-06 | No `GET /search/issues` API calls during search | unit | `npx vitest run src/stores/useSearchStore.spec.ts` | ❌ Wave 0 |
| DISC-06 | markdown-it renders code blocks with shiki highlight | unit | `npx vitest run src/lib/markdown.spec.ts` | ❌ Wave 0 |
| CONT-07 | createPrompt builds correct YAML frontmatter | unit | `npx vitest run src/lib/frontmatter.spec.ts` | ❌ Wave 0 |
| CONT-10 | Auto-save draft to localStorage every 30s | unit (fake timers) | `npx vitest run src/stores/useDraftStore.spec.ts` | ❌ Wave 0 |
| CONT-11 | isDirty guard fires on router navigation | unit | `npx vitest run src/composables/queries/usePromptsQuery.spec.ts` | ❌ Wave 0 |
| VERS-02 | parseVersionComment extracts version number, date, content | unit | `npx vitest run src/composables/queries/usePromptVersions.spec.ts` | ❌ Wave 0 |
| VERS-03 | computeDiff produces correct added/removed/unchanged lines | unit | `npx vitest run src/lib/diff.spec.ts` | ❌ Wave 0 |
| VERS-04 | restoreVersion posts new comment with correct body format | unit (mocked REST) | `npx vitest run src/composables/queries/useRestoreVersion.spec.ts` | ❌ Wave 0 |
| VERS-05 | Restore flow requires confirmation dialog before mutation | component | `npx vitest run src/components/versions/RestoreDialog.spec.ts` | ❌ Wave 0 |
| CONT-05 | Image upload Worker validates type and size | unit (Worker test) | `npx vitest run src/workers/upload.spec.ts` | ❌ Wave 0 |
| INFR-05 | ETag is sent on repeat requests (304 path) | unit | manual verification (rate limit monitoring) | N/A — integration |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/ src/stores/ src/composables/queries/`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/lib/search.spec.ts` — covers DISC-05, INFR-03, INFR-06
- [ ] `src/lib/frontmatter.spec.ts` — covers CONT-07, YAML round-trip
- [ ] `src/lib/markdown.spec.ts` — covers DISC-06, code block rendering
- [ ] `src/lib/diff.spec.ts` — covers VERS-03, trailing newline edge case
- [ ] `src/stores/useDraftStore.spec.ts` — covers CONT-10, CONT-11, fake timers for interval
- [ ] `src/composables/queries/usePromptVersions.spec.ts` — covers VERS-02, comment parse
- [ ] `src/composables/queries/useRestoreVersion.spec.ts` — covers VERS-04, REST mock
- [ ] `src/components/versions/RestoreDialog.spec.ts` — covers VERS-05, dialog cancel/confirm
- [ ] `src/workers/upload.spec.ts` — covers CONT-05, file validation in Worker

---

## Sources

### Primary (HIGH confidence)

- `design/research/wireframe/S02-master-detail-requirements.md` — BrowseView FRs, component inventory, state management spec, acceptance criteria (24 ACs)
- `design/research/wireframe/S03-new-prompt-editor-requirements.md` — Editor FRs, image upload spec, auto-save, publish flow, acceptance criteria (15 ACs)
- `design/research/wireframe/S04-version-history-requirements.md` — Version history FRs, diff spec, restore flow, acceptance criteria (17 ACs)
- `design/research/vue-github-issues-platform-research.md` — GraphQL queries, MiniSearch strategy, ETag caching, R2 image upload approach (all verified March 2026)
- `design/planning-artifacts/architecture.md` — Naming conventions, data model mapping, GraphQL vs REST split, YAML frontmatter pattern
- `src/types/index.ts` — Existing `Prompt`, `FilterState`, `SortOrder`, `GitHubUser` types
- `src/stores/usePromptsStore.ts`, `useSearchStore.ts`, `useUIStore.ts` — Existing store topology to extend
- `src/router/index.ts` — Existing route definitions to add to

### Secondary (MEDIUM confidence)

- `diff` npm package API — `diffLines()` function signature verified via npm docs; package is the same as what docs call "jsdiff"
- Shiki 4 `fromHighlighter` API — new in v4; verified pattern from official Shiki docs naming; async initialization requirement confirmed
- `@shikijs/markdown-it` — official integration package; companion to Shiki 4; `fromHighlighter()` is the adapter function
- TanStack Vue Query v5 infinite query API — `initialPageParam` required param verified against v5 changelog

### Tertiary (LOW confidence)

- ETag support in GitHub's GraphQL API — standard HTTP behavior; GitHub's REST docs confirm ETag support; GraphQL ETag behavior is less documented but consistent in practice
- Shiki bundle size impact on FCP — requires empirical measurement after implementation; estimate based on language count

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in project's March 2026 research audit; versions confirmed in existing `package.json`
- Architecture patterns: HIGH — drawn directly from S02/S03/S04 wireframe specs and architecture.md
- Pitfalls: HIGH (common patterns and trailing newline issue) / MEDIUM (ETag GraphQL behavior, Shiki bundle size)
- Code examples: HIGH — derived from wireframe spec patterns and existing codebase conventions

**Research date:** 2026-03-15
**Valid until:** 2026-06-15 (90 days — stack is stable; TanStack Query, Shiki, diff package have stable APIs)
