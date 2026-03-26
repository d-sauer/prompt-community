# Phase 3: Community & Profiles — Research

**Researched:** 2026-03-15
**Domain:** GitHub GraphQL reactions mutations, issue comments, user profile queries, VueUse localStorage persistence, TanStack Query v5 optimistic updates
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| COMM-01 | Authenticated user can add a reaction to a prompt (👍 ❤️ 🚀) with optimistic UI | GitHub GraphQL `addReaction` mutation; TanStack Query v5 `onMutate` + `setQueryData` optimistic pattern; `ReactionContent` enum values `THUMBS_UP`, `HEART`, `ROCKET` |
| COMM-02 | Authenticated user can remove their own previously added reaction | GitHub GraphQL `removeReaction` mutation; same optimistic pattern — requires `viewerHasReacted` from `reactionGroups` to toggle state |
| COMM-03 | Authenticated user can post a comment on a prompt | GitHub REST `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` — already used in Phase 2 for `createVersionComment`; re-use `createRestClient` |
| COMM-04 | Any user can read all comments on a prompt without authenticating | Already fetched in `GET_PROMPT_DETAIL` GraphQL query via `comments { nodes { id body createdAt author } }` — extend to render in UI |
| COMM-05 | Anonymous user shown sign-in CTA when attempting to react or comment | Guard in reaction/comment components using `useAuthStore().isAuthenticated`; show shadcn-vue `Dialog` or inline CTA |
| COMM-06 | Authenticated user can flag a prompt for moderator review | GitHub REST `POST /repos/{owner}/{repo}/issues/{issue_number}/labels` adds `flag:review` label; or `POST /repos/{owner}/{repo}/issues/{issue_number}/comments` with special body — label approach is simpler and surfaceable in Phase 4 admin queue |
| USER-03 | Any user can view another user's public profile showing submissions and aggregate stats | GitHub GraphQL `search(query:"repo:owner/repo author:login is:issue")` to fetch user's issues; aggregate reaction counts client-side; unauthenticated GraphQL client works |
| USER-04 | Authenticated user can view their own profile with submitted/saved/activity tabs | Own submissions: same `search` query with `viewer.login`; saved: VueUse `useLocalStorage` (see USER-05); activity: comment list via GraphQL |
| USER-05 | Authenticated user can bookmark/save a prompt to saved tab (persisted to localStorage) | VueUse `useLocalStorage<number[]>('bookmarks', [])` in a `useBookmarksStore`; add/remove by issue number; lookup by `usePromptsStore` cached data |
| USER-06 | Authenticated user's profile displays total vote count and total submission count | Client-side aggregation: sum all `reactionGroups[].reactors.totalCount` across user's issues; count of issues = submission count |
</phase_requirements>

---

## Summary

Phase 3 adds the social layer on top of Phase 2's read/write data layer. It has three distinct work streams: (1) reactions and comments on the prompt detail view; (2) a user profile view with tabs (own submissions, saved, activity); and (3) bookmarking — the only piece that never touches GitHub API.

All GitHub API surface area is already set up. The `createRestClient` and `createGraphqlClient` factories are in place. The `Prompt` type already includes `reactionGroups` arrays from the detail query. Phase 3 extends the existing patterns rather than introducing new infrastructure. The two genuine novelties are the **TanStack Query v5 optimistic update** pattern (needed for COMM-01/02 instant feedback) and the **GitHub GraphQL `search` connection** for fetching a user's own issues in a specific repo (needed for USER-03/04/06 — `repository.issues` does not filter by author).

The bookmarks feature (USER-05) is intentionally localStorage-only per requirements. VueUse `useLocalStorage<number[]>` handles serialization automatically. The saved tab resolves bookmark IDs against the already-loaded `usePromptsStore` cache.

**Primary recommendation:** Build the three work streams as three plans: (1) Reactions + comments + CTA (COMM-01..05); (2) Flag prompt (COMM-06); (3) Profiles + bookmarks (USER-03..06). The flag feature is small enough to combine with reactions plan if granularity is coarse.

---

## Standard Stack

### Core (all installed — carried from Phase 2)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Vue | 3.5.x | SPA framework | Installed |
| Pinia | 3.0.4 | Client state | Installed |
| TanStack Vue Query | 5.92.9 | Server state + optimistic updates | Installed |
| @octokit/graphql | 9.0.3 | GitHub GraphQL mutations | Installed |
| @octokit/core | 7.0.6 | GitHub REST (comments, labels) | Installed |
| @vueuse/core | 14.2.1 | `useLocalStorage` for bookmarks | Installed |
| shadcn-vue | 2.4.3 | Tabs, Dialog (sign-in CTA), Avatar | Installed |
| lucide-vue-next | 0.577.0 | Reaction icons, bookmark icon | Installed |
| date-fns | 4.1.0 | Formatting comment timestamps | Installed |

**No new packages required.** Phase 3 uses the complete installed stack.

**Installation:**
```bash
# Nothing to install — all dependencies already present
```

---

## Architecture Patterns

### Recommended New Files

```
src/
├── composables/queries/
│   ├── useReactions.ts          # addReaction / removeReaction mutations with optimistic UI
│   ├── useReactions.spec.ts
│   ├── useComments.ts           # useQuery (read) + useMutation (post comment)
│   ├── useComments.spec.ts
│   ├── useUserProfile.ts        # GitHub search query for user submissions
│   ├── useUserProfile.spec.ts
│   └── useFlagPrompt.ts         # add flag label mutation
├── stores/
│   ├── useBookmarksStore.ts     # useLocalStorage<number[]>('bookmarks', [])
│   └── useBookmarksStore.spec.ts
├── components/
│   ├── prompt/
│   │   ├── ReactionBar.vue      # 3-emoji reaction row with toggle + count
│   │   └── CommentSection.vue   # comment list + post form + CTA
│   └── profile/
│       ├── UserProfileView.vue  # public profile (any user)
│       ├── ProfileTabs.vue      # submitted / saved / activity tabs (own profile)
│       └── ProfileStats.vue     # total votes + total submissions aggregate
└── views/
    └── UserProfileView.vue      # route view wrapping profile components
```

### Pattern 1: TanStack Query v5 Optimistic Update (COMM-01/02)

**What:** Mutate the cached `['prompt', id]` query data immediately on button click, then roll back on API error. Reaction toggle is the canonical use case.

**When to use:** Any user-triggered action where sub-200ms feedback matters. For reactions specifically: the GitHub GraphQL `addReaction` / `removeReaction` mutations complete in 400-800ms — noticeably slow without optimistic UI.

**Key fields required in query:** The detail query must include `viewerHasReacted` on each `ReactionGroup` (currently not fetched — must extend `GET_PROMPT_DETAIL`).

```typescript
// Source: TanStack Query v5 onMutate optimistic pattern
// https://tanstack.com/query/latest/docs/framework/vue/guides/optimistic-updates
export function useReactions(issueId: Ref<number>) {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  const addReaction = useMutation({
    mutationFn: async (content: ReactionContent) => {
      // Need issue node ID for GraphQL mutation — fetch from REST or store in Prompt type
      const nodeId = await getIssueNodeId(authStore.token!, issueId.value)
      return addReactionMutation(authStore.token!, nodeId, content)
    },
    onMutate: async (content: ReactionContent) => {
      await queryClient.cancelQueries({ queryKey: ['prompt', issueId.value] })
      const previous = queryClient.getQueryData<Prompt>(['prompt', issueId.value])
      queryClient.setQueryData<Prompt>(['prompt', issueId.value], (old) => {
        if (!old) return old
        return {
          ...old,
          reactionGroups: old.reactionGroups.map((g) =>
            g.content === content
              ? { ...g, reactors: { totalCount: g.reactors.totalCount + 1 }, viewerHasReacted: true }
              : g,
          ),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['prompt', issueId.value], context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', issueId.value] })
    },
  })

  return { addReaction }
}
```

### Pattern 2: GitHub GraphQL `addReaction` / `removeReaction` Mutations

**What:** GraphQL mutations that require the issue's **node ID** (not its number), the authenticated user's token, and a `ReactionContent` enum value.

**Critical distinction:** GitHub REST uses issue **number** (integer). GitHub GraphQL mutations use the issue **node ID** (opaque base64 string like `I_kwDOA...`). The node ID is available in GraphQL queries as `id` on the issue object. It must be stored in the `Prompt` type and included in `GET_PROMPT_DETAIL`.

**ReactionContent enum values:**
```graphql
# From octokit/graphql-schema — confirmed via schema fetch 2026-03-15
enum ReactionContent {
  THUMBS_UP    # 👍
  THUMBS_DOWN  # 👎
  LAUGH        # 😄
  HOORAY       # 🎉
  CONFUSED     # 😕
  HEART        # ❤️
  ROCKET       # 🚀
  EYES         # 👀
}
```

Phase 3 uses only `THUMBS_UP`, `HEART`, and `ROCKET` (per COMM-01).

```graphql
# Source: octokit/graphql-schema (confirmed 2026-03-15)
mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
  addReaction(input: { subjectId: $subjectId, content: $content }) {
    reaction { content }
    reactionGroups {
      content
      reactors { totalCount }
      viewerHasReacted
    }
  }
}

mutation RemoveReaction($subjectId: ID!, $content: ReactionContent!) {
  removeReaction(input: { subjectId: $subjectId, content: $content }) {
    reaction { content }
    reactionGroups {
      content
      reactors { totalCount }
      viewerHasReacted
    }
  }
}
```

### Pattern 3: GitHub GraphQL Search for User Submissions (USER-03/04/06)

**What:** `repository.issues` does not support filtering by author. The `search` connection does.

**When to use:** Any query that needs "issues by a specific user in a specific repo".

**Rate limit note:** The `search` connection counts against the GraphQL rate limit (5000 points/hour for authenticated, 60 req/min unauthenticated). For public profiles (USER-03), the query runs with the viewer's token if authenticated, or anonymously if not. Keep the `first` limit at 100 to retrieve all submissions in one call for typical community sizes.

```graphql
# Source: GitHub GraphQL community discussions (verified pattern)
query GetUserSubmissions($query: String!, $first: Int!) {
  search(query: $query, type: ISSUE, first: $first) {
    issueCount
    nodes {
      ... on Issue {
        number
        title
        createdAt
        reactionGroups {
          content
          reactors { totalCount }
        }
        comments { totalCount }
        labels(first: 5) {
          nodes { name color }
        }
      }
    }
  }
}
# Variables: { query: "repo:owner/repo author:login is:issue is:open", first: 100 }
```

Client-side aggregation for USER-06:
```typescript
const totalVotes = computed(() =>
  submissions.value.flatMap((p) => p.reactionGroups)
    .reduce((sum, g) => sum + g.reactors.totalCount, 0)
)
const totalSubmissions = computed(() => submissions.value.length)
```

### Pattern 4: Posting Comments (COMM-03/04)

**What:** Use the existing REST infrastructure. `createVersionComment` in `mutations.ts` already posts to `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`. Add a `postComment(token, issueNumber, body)` function alongside it.

Comments for the community section are **plain text** (not version-prefixed). The comment body should NOT start with `## Version` to avoid being parsed by `parseVersionComment`.

```typescript
// Extend src/lib/github/mutations.ts
export async function postComment(
  token: string,
  issueNumber: number,
  body: string,
): Promise<{ id: number; body: string; createdAt: string }> {
  const octokit = createRestClient(token)
  const response = await octokit.request(
    'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
    {
      owner: owner(),
      repo: repo(),
      issue_number: issueNumber,
      body,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    },
  )
  return {
    id: response.data.id,
    body: response.data.body ?? '',
    createdAt: response.data.created_at,
  }
}
```

### Pattern 5: Bookmarks in localStorage (USER-05)

**What:** Persist bookmarked issue numbers using VueUse `useLocalStorage`. Already used in `useDraftStore` for draft persistence — identical pattern.

```typescript
// src/stores/useBookmarksStore.ts
import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export const useBookmarksStore = defineStore('bookmarks', () => {
  const bookmarkedIds = useLocalStorage<number[]>('bookmarks', [])

  const isBookmarked = (id: number) => computed(() => bookmarkedIds.value.includes(id))

  function toggle(id: number) {
    const idx = bookmarkedIds.value.indexOf(id)
    if (idx >= 0) {
      bookmarkedIds.value.splice(idx, 1)
    } else {
      bookmarkedIds.value.push(id)
    }
  }

  return { bookmarkedIds, isBookmarked, toggle }
})
```

**VueUse `useLocalStorage` with arrays:** Automatically serializes/deserializes JSON. Reactive — changes propagate to all components using the store. No manual `JSON.stringify` needed.

### Pattern 6: Flag Prompt (COMM-06)

**What:** Add a `flag:review` label to the issue. This surfaces in the Phase 4 admin moderation queue which filters by this label.

**Why label over comment:** Labels are queryable (`labels: ["flag:review"]` in GraphQL) making the admin queue trivial to implement. Comments require body parsing.

```typescript
// Extend src/lib/github/mutations.ts
export async function flagPrompt(token: string, issueNumber: number): Promise<void> {
  const octokit = createRestClient(token)
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
    owner: owner(),
    repo: repo(),
    issue_number: issueNumber,
    labels: ['flag:review'],
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
}
```

### Anti-Patterns to Avoid

- **Using `repository.issues` with a login filter:** The `filterBy` argument on `repository.issues` does NOT support `author`. Use the `search` connection instead.
- **Using issue number in `addReaction`/`removeReaction`:** These GraphQL mutations require the node ID, not the integer issue number. Storing `nodeId` on the `Prompt` type is the correct fix.
- **Calling `invalidateQueries` without `onMutate` for reactions:** Without optimistic update, the reaction button feels sluggish (400-800ms). Users will double-click.
- **Storing bookmarks in Pinia memory only:** A page refresh would lose all saved prompts. `useLocalStorage` is mandatory to meet USER-05.
- **Prefixing community comments with `## Version`:** This causes `parseVersionComment` to pick them up in the version history timeline. Community comments must not start with that header.

---

## Required Type Extensions

The `Prompt` type and `GET_PROMPT_DETAIL` query must be extended before COMM-01/02 can work:

```typescript
// Extend src/types/index.ts
export interface ReactionGroup {
  content: string
  reactors: { totalCount: number }
  viewerHasReacted: boolean   // NEW — required for reaction toggle UI
}

export interface Prompt {
  id: number
  nodeId: string              // NEW — required for addReaction/removeReaction GraphQL mutations
  title: string
  body: string
  frontmatter: PromptFrontmatter
  author: { login: string; avatarUrl: string }
  createdAt: string
  updatedAt: string
  labels: Array<{ name: string; color: string }>
  reactionGroups: ReactionGroup[]   // Updated type
  commentCount: number
}
```

```graphql
# Extend GET_PROMPT_DETAIL query in src/lib/github/queries.ts
issue(number: $number) {
  id           # node ID — NEW
  number
  title
  ...
  reactionGroups {
    content
    reactors { totalCount }
    viewerHasReacted   # NEW — requires authenticated token to return true
  }
  ...
}
```

**Note:** `viewerHasReacted` always returns `false` for unauthenticated requests. The existing `createGraphqlClient(token?)` already handles the authenticated/anonymous split correctly.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reaction count persistence | Custom reaction state store | TanStack Query cache + optimistic update | Cache is the source of truth; manual stores diverge on refetch |
| Bookmark serialization | Custom JSON encode/decode | VueUse `useLocalStorage<number[]>` | Handles serialize/deserialize, reactive, SSR-safe |
| User search query | Custom REST call to filter issues | GitHub GraphQL `search` connection | Only official way to filter issues by author in a specific repo |
| Comment timestamp formatting | Custom date logic | `date-fns` `formatDistanceToNow` | Already installed; handles all edge cases |
| Profile avatar display | Custom image component | shadcn-vue `Avatar` | Already installed; handles fallback initials |

**Key insight:** Phase 3 has zero new infrastructure dependencies. Every piece is either an extension of existing patterns or a combination of already-installed libraries.

---

## Common Pitfalls

### Pitfall 1: Missing `nodeId` on the Prompt type

**What goes wrong:** `addReaction`/`removeReaction` mutations receive the integer issue number and fail with a type error or 404 because they require the GraphQL node ID (`I_kwDOA...`).
**Why it happens:** GitHub uses two distinct ID systems — REST uses integer numbers, GraphQL mutations use opaque node IDs.
**How to avoid:** Add `id` to `GET_PROMPT_DETAIL` (and `GET_PROMPTS` if reactions needed on list view), store it as `nodeId: string` on `Prompt`, pass it to the mutation.
**Warning signs:** `addReaction` mutation returns a 400 error saying "Could not resolve to a node with the global id".

### Pitfall 2: Stale `viewerHasReacted` after toggle

**What goes wrong:** The reaction button state flickers or reverts after the optimistic update resolves because `onSettled` invalidates the query but the refetch returns `viewerHasReacted: false` for anonymous users.
**Why it happens:** If the refetch runs without the user's token (auth expired, token not passed to graphql client), `viewerHasReacted` returns false.
**How to avoid:** Ensure `usePromptDetail` always calls `createGraphqlClient(authStore.token ?? undefined)` — already correct in the current implementation. Verify `viewerHasReacted` is only rendered when `authStore.isAuthenticated`.

### Pitfall 3: Community comments appearing in version history

**What goes wrong:** Comments posted by COMM-03 appear in the version history timeline (VERS-02) when the comment body accidentally matches the `## Version N — YYYY-MM-DD` pattern.
**Why it happens:** `usePromptVersions` filters comments by `VERSION_HEADER_RE`. A user who writes `## Version 2 — 2026-03-15 is great` in a comment would poison the version list.
**How to avoid:** The `postComment` function should not constrain user body, but the `CommentSection` UI should not allow multi-line markdown headers as first line. Low risk in practice.

### Pitfall 4: `search` connection rate limit for public profiles

**What goes wrong:** Anonymous users visiting many public profiles exhaust the unauthenticated GitHub GraphQL rate limit (60 req/min for REST; GraphQL has a point-based budget).
**Why it happens:** Each profile page visit fires one `search` query. Without a token, these come from the same source IP.
**How to avoid:** Cache profile queries with TanStack Query `staleTime: 300_000` (5 minutes). The `useUserProfile` composable should never bypass the cache. Acceptable at expected scale (50-400 users per INFR-09).

### Pitfall 5: Bookmarks reference issue IDs that are no longer in the TanStack Query cache

**What goes wrong:** The saved tab shows empty or stale data when the user navigates directly to `/profile?tab=saved` before the browse list has loaded.
**Why it happens:** `useBookmarksStore.bookmarkedIds` holds numbers, but resolving to `Prompt` objects requires the prompts to be in the TanStack Query cache.
**How to avoid:** The saved tab's composable should call `usePromptDetail` per bookmarked ID (with `enabled: true`) to individually fetch any missing prompts. This is at most a few calls on first load.

### Pitfall 6: `useLocalStorage` reactive array mutation gotcha

**What goes wrong:** `bookmarkedIds.value.push(id)` mutates the array but does not trigger a reactivity update in some edge cases.
**Why it happens:** VueUse `useLocalStorage` wraps the value in a `ref`. Direct mutation of the array (push/splice) is tracked by Vue's reactivity proxy, so it generally works — but assigning a new array is safer.
**How to avoid:** Use splice/push (fine), OR replace the array: `bookmarkedIds.value = [...bookmarkedIds.value, id]`. The pattern shown in Pattern 5 (splice/push) is the established convention in the codebase (`useDraftStore` uses similar patterns).

---

## Code Examples

### Extend GET_PROMPT_DETAIL with nodeId and viewerHasReacted

```typescript
// src/lib/github/queries.ts — extend existing query
export const GET_PROMPT_DETAIL = `
  query GetPromptDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        id          # node ID for GraphQL mutations
        number
        title
        body
        createdAt
        updatedAt
        author { login avatarUrl }
        labels(first: 10) { nodes { name color } }
        reactionGroups {
          content
          reactors { totalCount }
          viewerHasReacted
        }
        comments(first: 100) {
          totalCount
          nodes {
            id body createdAt
            author { login avatarUrl }
          }
        }
      }
    }
  }
`
```

### User Profile Search Query

```typescript
// src/composables/queries/useUserProfile.ts
export const GET_USER_SUBMISSIONS = `
  query GetUserSubmissions($searchQuery: String!, $first: Int!) {
    search(query: $searchQuery, type: ISSUE, first: $first) {
      issueCount
      nodes {
        ... on Issue {
          number
          title
          createdAt
          reactionGroups {
            content
            reactors { totalCount }
          }
          comments { totalCount }
          labels(first: 5) { nodes { name color } }
        }
      }
    }
  }
`

export function useUserProfile(login: Ref<string>) {
  const authStore = useAuthStore()
  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  return useQuery({
    queryKey: computed(() => ['user-profile', login.value]),
    queryFn: async () => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      const searchQuery = `repo:${owner}/${repo} author:${login.value} is:issue is:open`
      return client<UserSubmissionsResponse>(GET_USER_SUBMISSIONS, {
        searchQuery,
        first: 100,
      })
    },
    enabled: computed(() => Boolean(login.value)),
    staleTime: 300_000,
  })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Apollo Client optimistic UI | TanStack Query v5 `onMutate` + `setQueryData` | TanStack Query v5 (2024) | No Apollo dependency; same optimistic guarantees |
| Manual localStorage JSON | VueUse `useLocalStorage` | VueUse v9+ | Automatic serialization, reactive, no boilerplate |
| REST for all GitHub mutations | GraphQL for `addReaction`/`removeReaction` | GitHub GraphQL v4 (stable) | REST reactions API is deprecated in favour of GraphQL |

**Deprecated/outdated:**
- GitHub REST `POST /repos/{owner}/{repo}/issues/{issue_number}/reactions`: Still works but GitHub encourages GraphQL mutations for reaction management.

---

## Open Questions

1. **User profile route parameter format**
   - What we know: The router uses `/prompts/:id` as integer. User profiles need `/users/:login` as string login.
   - What's unclear: Whether the profile view should be `/users/:login` or `/profile` (own profile only).
   - Recommendation: Add `/users/:login` (public profile, any user) and `/profile` redirecting to `/users/:viewerLogin` for own profile. Both can render the same `UserProfileView` component with different data.

2. **Comment count invalidation after posting**
   - What we know: `commentCount` on `Prompt` comes from the detail query. Posting a comment via REST does not automatically update the TanStack Query cache.
   - What's unclear: Whether to use optimistic update or simply invalidate `['prompt', issueId]` after `postComment` succeeds.
   - Recommendation: Invalidate + refetch (not optimistic) — comment count accuracy matters less than reaction responsiveness, and the latency penalty is acceptable for a write action.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.0 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMM-01 | `addReaction` mutation fires with correct content + token | unit | `npm test -- useReactions` | ❌ Wave 0 |
| COMM-02 | `removeReaction` fires when `viewerHasReacted` is true | unit | `npm test -- useReactions` | ❌ Wave 0 |
| COMM-01/02 | Optimistic update increments/decrements count immediately | unit | `npm test -- useReactions` | ❌ Wave 0 |
| COMM-01/02 | Rollback restores previous state on error | unit | `npm test -- useReactions` | ❌ Wave 0 |
| COMM-03 | `postComment` calls REST endpoint with correct body | unit | `npm test -- useComments` | ❌ Wave 0 |
| COMM-05 | `isAuthenticated: false` shows CTA, not reaction UI | unit | `npm test -- ReactionBar` | ❌ Wave 0 |
| COMM-06 | `flagPrompt` calls label endpoint with `flag:review` | unit | `npm test -- useFlagPrompt` | ❌ Wave 0 |
| USER-05 | `toggle` adds then removes bookmark from localStorage | unit | `npm test -- useBookmarksStore` | ❌ Wave 0 |
| USER-05 | `isBookmarked` returns correct reactive boolean | unit | `npm test -- useBookmarksStore` | ❌ Wave 0 |
| USER-05 | Bookmarks persist across store re-instantiation | unit | `npm test -- useBookmarksStore` | ❌ Wave 0 |
| USER-03/06 | `useUserProfile` aggregates total votes correctly | unit | `npm test -- useUserProfile` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/composables/queries/useReactions.spec.ts` — covers COMM-01, COMM-02
- [ ] `src/composables/queries/useComments.spec.ts` — covers COMM-03, COMM-04
- [ ] `src/composables/queries/useFlagPrompt.spec.ts` — covers COMM-06
- [ ] `src/stores/useBookmarksStore.spec.ts` — covers USER-05
- [ ] `src/composables/queries/useUserProfile.spec.ts` — covers USER-03, USER-06

*(No new framework setup needed — vitest, jsdom, @pinia/testing all installed)*

---

## Sources

### Primary (HIGH confidence)

- `octokit/graphql-schema` raw schema (fetched 2026-03-15) — `addReaction` / `removeReaction` mutation signatures, `AddCommentInput`, `ReactionContent` enum structure, `ReactionGroup.viewerHasReacted`
- Existing codebase `src/lib/github/mutations.ts` — confirmed `createRestClient` REST pattern for issue comments
- Existing codebase `src/lib/github/queries.ts` — confirmed `reactionGroups` already fetched, node ID currently absent
- Existing codebase `src/stores/useDraftStore.ts` — confirmed `useLocalStorage` from VueUse works in this project
- Existing codebase `src/composables/queries/useRestoreVersion.ts` — confirmed `useMutation` + `invalidateQueries` pattern

### Secondary (MEDIUM confidence)

- GitHub GraphQL community forum (platform.github.community) — confirmed `repository.issues` does not filter by author; `search` connection is the only supported approach (verified against official Queries docs reference)
- TanStack Query medium article on optimistic updates in v5 — verified pattern aligns with TanStack docs structure; specific syntax verified against existing project mutation patterns

### Tertiary (LOW confidence)

- GitHub REST reaction deprecation claim — single source; REST reactions API still documented as active; flagged for validation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; all libraries already in `package.json`
- Architecture: HIGH — direct extension of established Phase 2 patterns
- GraphQL mutations: HIGH — schema confirmed from `octokit/graphql-schema` raw source
- `search` vs `repository.issues` for author filter: HIGH — confirmed from official GitHub GraphQL community discussion and cross-referenced with Queries docs
- Pitfalls: MEDIUM — `viewerHasReacted` behavior for unauthenticated based on documented behavior, not live test

**Research date:** 2026-03-15
**Valid until:** 2026-04-15 (GitHub API is stable; TanStack Query v5 is stable)
