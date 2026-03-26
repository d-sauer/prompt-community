---
phase: 03-community-and-profiles
verified: 2026-03-24T21:22:00Z
status: passed
score: 9/9 must-haves verified
re_verification: null
gaps: []
human_verification:
  - test: "Visit a prompt detail page as unauthenticated user"
    expected: "Reaction bar shows 3 emoji buttons with counts; clicking any reaction button shows 'Sign in to react' CTA inline. Comment section shows existing comments and a 'Sign in to leave a comment' CTA instead of a post form."
    why_human: "Auth-gated conditional rendering requires a live session to exercise both branches"
  - test: "Sign in and toggle a reaction"
    expected: "Count increments immediately (optimistic), then settles to server value after invalidation. Clicking the same reaction again decrements count immediately."
    why_human: "Optimistic UI timing behavior requires real GitHub API latency to observe"
  - test: "Post a comment while authenticated"
    expected: "Comment appears in list after cache invalidation; textarea clears on success"
    why_human: "Requires authenticated GitHub session and live API"
  - test: "Flag a prompt while authenticated"
    expected: "Confirmation dialog appears; after confirm the flag:review label is applied to the GitHub issue"
    why_human: "Requires GitHub write access and label existence"
  - test: "Visit /users/:login for a real user"
    expected: "Profile page shows avatar, username, submission count, vote count, and list of submitted prompts in the Submitted tab"
    why_human: "Requires live GitHub GraphQL query"
  - test: "Sign in and visit /profile"
    expected: "Redirects to /users/:login for the authenticated user; shows three tabs (Submitted, Saved, Activity)"
    why_human: "Requires authenticated session to test redirect logic"
  - test: "Bookmark a prompt and refresh the page"
    expected: "Bookmarked prompt appears in Save tab of own profile after page refresh (localStorage persistence)"
    why_human: "localStorage persistence requires a real browser environment"
---

# Phase 3: Community and Profiles Verification Report

**Phase Goal:** Implement community interaction features (reactions, comments, flagging) and user profile with bookmarks, making the app fully interactive for community members.
**Verified:** 2026-03-24T21:22:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Authenticated user can click a reaction emoji and see the count increment immediately (optimistic UI) | VERIFIED | `useReactions.ts` — `onMutate` sets optimistic `setQueryData` before mutation resolves; 5 unit tests pass including increment/decrement/rollback |
| 2 | Authenticated user can click same reaction again to remove it; count decrements immediately | VERIFIED | `toggle()` reads `viewerHasReacted` before `onMutate` modifies cache; routes to `removeReaction`; optimistic decrement confirmed in spec |
| 3 | Unauthenticated user sees sign-in CTA instead of reaction/comment form | VERIFIED | `ReactionBar.vue` — `handleReactionClick` checks `!authStore.isAuthenticated` and sets `showSignInCta`; `CommentSection.vue` — `v-else` on post form renders "Sign in to leave a comment" |
| 4 | API error causes reaction count to roll back to previous value | VERIFIED | `useReactions.ts` `onError` restores `context.previous`; rollback test passes in spec |
| 5 | Any user can read comments without authenticating | VERIFIED | `CommentSection.vue` renders `prompt.comments` unconditionally (no auth guard on list); post form gated behind `v-if="authStore.isAuthenticated"` |
| 6 | Authenticated user can type and submit a comment; it appears in the list | VERIFIED | `useComments.ts` wraps `postComment` mutation with `invalidateQueries` on success; `CommentSection.vue` calls `postCommentMutation.mutate(commentBody.value)` and clears textarea in `onSuccess` callback |
| 7 | Authenticated user can flag a prompt; the flag:review label is applied | VERIFIED | `flagPrompt` in `mutations.ts` calls `POST /repos/.../issues/:number/labels` with `labels: ['flag:review']`; `CommentSection.vue` calls `flagMutation.mutate()` after `window.confirm` |
| 8 | Any user can visit /users/:login and see submissions and aggregate stats | VERIFIED | Router has `users/:login` → `UserProfileView.vue`; view calls `useUserProfile(login)` and renders `ProfileStats` + `ProfileTabs`; `totalVotes` and `totalSubmissions` computed from GraphQL search |
| 9 | Authenticated user can bookmark a prompt and find it in Saved tab; persists across refreshes | VERIFIED | `useBookmarksStore.ts` uses `useLocalStorage<number[]>`; `PromptActions.vue` calls `bookmarksStore.toggle(prompt.id)`; `ProfileTabs.vue` renders bookmarked IDs in Saved tab (own profile only) |

**Score:** 9/9 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/types/index.ts` | Extended Prompt type with nodeId, ReactionGroup.viewerHasReacted, CommentNode | VERIFIED | `nodeId: string`, `ReactionGroup.viewerHasReacted: boolean`, `CommentNode` interface, `comments: CommentNode[]` on Prompt all present |
| `src/lib/github/queries.ts` | GET_PROMPT_DETAIL with `id` and `viewerHasReacted`; GET_USER_SUBMISSIONS | VERIFIED | Line 71: `id` on issue; line 92: `viewerHasReacted` on reactionGroups; line 46: `GET_USER_SUBMISSIONS` exported |
| `src/lib/github/mutations.ts` | addReaction, removeReaction, postComment, flagPrompt | VERIFIED | All four functions exported; addReaction/removeReaction use GraphQL; postComment/flagPrompt use REST |
| `src/composables/queries/useReactions.ts` | Reaction toggle composable with optimistic update | VERIFIED | Exports `useReactions`; implements `onMutate`/`onError`/`onSettled`; returns `{ toggleReaction, toggle }` |
| `src/composables/queries/useComments.ts` | useComments with postCommentMutation and comments from cache | VERIFIED | Reads from `['prompt', issueId.value]` cache; exports `{ comments, postCommentMutation }` |
| `src/composables/queries/useFlagPrompt.ts` | useFlagPrompt wrapping flagPrompt | VERIFIED | Exports `{ flagMutation }`; invalidates on success |
| `src/components/prompt/ReactionBar.vue` | 3 emoji toggles, counts, sign-in CTA | VERIFIED | Renders THUMBS_UP/HEART/ROCKET buttons with counts; `showSignInCta` guard; disabled while `isPending` |
| `src/components/prompt/CommentSection.vue` | Comment list + post form (auth) + CTA (unauth) + flag button | VERIFIED | All four sections present; flag button gated on `isAuthenticated`; `window.confirm` before mutate |
| `src/components/prompt/PromptDetail.vue` | Wired with ReactionBar and CommentSection | VERIFIED | Imports and renders `<ReactionBar :prompt="prompt" />` and `<CommentSection :prompt="prompt" />` |
| `src/stores/useBookmarksStore.ts` | Pinia store with useLocalStorage persistence | VERIFIED | `useLocalStorage<number[]>('bookmarks', [])` for persistence; `toggle`, `isBookmarked`, `bookmarkedIds` exported |
| `src/composables/queries/useUserProfile.ts` | GitHub GraphQL search with totalVotes aggregation | VERIFIED | `GET_USER_SUBMISSIONS` query; `totalVotes` computed via flatMap+reduce; `staleTime: 300_000` |
| `src/components/profile/ProfileStats.vue` | Display component for totalVotes and totalSubmissions | VERIFIED | Props `totalVotes: number`, `totalSubmissions: number`; renders both stat blocks with lucide icons |
| `src/components/profile/ProfileTabs.vue` | Tabs: Submitted / Saved / Activity | VERIFIED | Uses shadcn-vue Tabs; Saved and Activity tabs gated on `isOwnProfile`; bookmarks from store; Activity tab is placeholder per design (v2 feature) |
| `src/views/UserProfileView.vue` | Route view for /users/:login | VERIFIED | Calls `useUserProfile(login)`, renders loading/error/content states; passes stats and login to sub-components |
| `src/router/index.ts` | Routes /users/:login and /profile | VERIFIED | `users/:login` → `UserProfileView.vue`; `profile` → `ProfileRedirectView.vue` (redirects to own profile) |
| `src/components/prompt/PromptActions.vue` | Bookmark toggle button wired to store | VERIFIED | Imports `useBookmarksStore`; `toggleBookmark()` calls `bookmarksStore.toggle(prompt.id)`; `Bookmark`/`BookmarkCheck` icons toggle on `isBookmarked` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useReactions.ts` | `mutations.ts` | `addReaction`/`removeReaction` in mutationFn | WIRED | Line 21–22: `removeReaction(authStore.token!, ...)` / `addReaction(authStore.token!, ...)` |
| `useReactions.ts` | `['prompt', issueId]` cache | `onMutate` → `setQueryData` | WIRED | Lines 25–41: `cancelQueries` + `setQueryData` optimistic update + `return { previous }` |
| `ReactionBar.vue` | `useReactions.ts` | `toggle(content)` | WIRED | `handleReactionClick` calls `void toggle(content)` |
| `CommentSection.vue` | `useComments.ts` | `postCommentMutation.mutate(body)` | WIRED | Line 24: `postCommentMutation.mutate(commentBody.value, {...})` |
| `PromptDetail.vue` | `ReactionBar` + `CommentSection` | component import + `:prompt` prop | WIRED | Both imported and rendered with `:prompt="prompt"` |
| `UserProfileView.vue` | `useUserProfile.ts` | `useUserProfile(login)` with route param | WIRED | Line 15: `const { ..., totalVotes, totalSubmissions, submissions } = useUserProfile(login)` |
| `ProfileTabs.vue` | `useBookmarksStore.ts` | `useBookmarksStore().bookmarkedIds` | WIRED | Line 21: `const bookmarksStore = useBookmarksStore()`; line 24–29: `bookmarkedPrompts` reads `bookmarksStore.bookmarkedIds` |
| `PromptActions.vue` | `useBookmarksStore.ts` | `useBookmarksStore().toggle(prompt.id)` | WIRED | Line 37: `bookmarksStore.toggle(props.prompt.id)` in `toggleBookmark()` |
| `useComments.ts` | `mutations.ts` | `postComment(token, issueId, body)` | WIRED | Line 16: `mutationFn: (body: string) => postComment(authStore.token!, issueId.value, body)` |
| `useFlagPrompt.ts` | `mutations.ts` | `flagPrompt(token, issueId)` | WIRED | Line 11: `mutationFn: () => flagPrompt(authStore.token!, issueId.value)` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COMM-01 | 03-01 | Authenticated user can add a reaction (👍 ❤️ 🚀) with optimistic UI | SATISFIED | `addReaction` mutation + `onMutate` optimistic increment in `useReactions.ts`; 5 unit tests pass |
| COMM-02 | 03-01 | Authenticated user can remove their own reaction | SATISFIED | `removeReaction` called when `viewerHasReacted` is true; unit test confirms toggle direction |
| COMM-03 | 03-02 | Authenticated user can post a comment | SATISFIED | `postComment` in mutations.ts; `useComments.ts` wraps it; `CommentSection.vue` renders form |
| COMM-04 | 03-02 | Any user can read comments without authenticating | SATISFIED | Comment list rendered unconditionally from `prompt.comments`; no auth guard on display |
| COMM-05 | 03-01/02 | Anonymous user sees sign-in CTA when attempting to react or comment | SATISFIED | `ReactionBar.vue` shows CTA div on unauthenticated click; `CommentSection.vue` v-else renders sign-in link |
| COMM-06 | 03-02 | Authenticated user can flag a prompt for moderator review | SATISFIED | `flagPrompt` adds `flag:review` label via REST; `CommentSection.vue` flag button with `window.confirm` guard |
| USER-03 | 03-03 | Any user can view another user's public profile showing submissions and aggregate stats | SATISFIED | `/users/:login` route → `UserProfileView.vue` → `useUserProfile` → `ProfileStats` + `ProfileTabs` |
| USER-04 | 03-03 | Authenticated user can view own profile with Submitted, Saved, Activity tabs | SATISFIED | `/profile` → `ProfileRedirectView.vue` → `/users/:login`; ProfileTabs shows all 3 tabs when `isOwnProfile` |
| USER-05 | 03-03 | Authenticated user can bookmark/save a prompt (persisted to localStorage) | SATISFIED | `useBookmarksStore` uses `useLocalStorage`; `PromptActions.vue` toggle button; 5 unit tests pass |
| USER-06 | 03-03 | Profile displays total vote count and total submission count | SATISFIED | `ProfileStats.vue` renders both counts; `useUserProfile.ts` computes them via GraphQL aggregation |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/views/UserProfileView.vue` | 20 | Dead computed: `avatarUrl = computed(() => submissions.value[0] ? undefined : undefined)` — returns `undefined` in both branches, declared but never used in template | Info | None — `avatarSrc` (line 21) is the actually used computed; dead code only |
| `src/components/profile/ProfileTabs.vue` | 102 | Activity tab body: "Activity coming soon." | Info | By design — PLAN 03-03 explicitly designates Activity as a v2 placeholder; USER-04 requires the tab exists (it does) |

No blockers or warning-level anti-patterns found.

### Human Verification Required

#### 1. Unauthenticated reaction/comment CTA

**Test:** Visit a prompt detail page without signing in. Click a reaction button; try to interact with the comment form.
**Expected:** Reaction bar shows inline "Sign in to react" text with a sign-in link. Comment section shows "Sign in to leave a comment" instead of a textarea.
**Why human:** Auth-state conditional rendering requires a real session state to exercise both branches simultaneously.

#### 2. Optimistic reaction UI timing

**Test:** Sign in and click a reaction emoji on a prompt.
**Expected:** The reaction count increments immediately (before the GitHub API responds), then settles to the server-confirmed value after the cache invalidation.
**Why human:** Optimistic UI timing is only observable with real GitHub API latency (400–800ms as documented in the PLAN).

#### 3. Comment post flow

**Test:** While authenticated, type a comment and click "Post Comment".
**Expected:** Comment appears in the list after the cache invalidates; textarea clears on success. Loading state ("Posting...") appears on the button during the request.
**Why human:** Requires an authenticated GitHub session and live API write access.

#### 4. Flag a prompt

**Test:** While authenticated, click the Flag button on a prompt detail.
**Expected:** A browser confirmation dialog appears. After confirming, the `flag:review` label is applied to the GitHub issue (visible in the GitHub UI).
**Why human:** Requires GitHub write permissions on the data repository.

#### 5. /profile redirect

**Test:** While authenticated, navigate to `/profile`.
**Expected:** Browser redirects to `/users/:login` where `:login` is the authenticated user's GitHub login. All three tabs (Submitted, Saved, Activity) are visible.
**Why human:** Requires an active auth session to populate `authStore.user.login` at navigation time.

#### 6. Bookmark persistence

**Test:** Bookmark a prompt, close the browser tab, re-open the app.
**Expected:** The bookmark survives the page refresh and appears in the Saved tab of the own profile.
**Why human:** localStorage behavior requires a real browser environment; tests mock `useLocalStorage`.

### Gaps Summary

No gaps found. All must-haves from all three PLANs are verified, all 10 requirement IDs are satisfied, and the full test suite passes (83 tests, 0 failures).

---

_Verified: 2026-03-24T21:22:00Z_
_Verifier: Claude (gsd-verifier)_
