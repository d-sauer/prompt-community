# Power Panel: Master Screen Flow & Interaction Specification

**Document Version:** 1.0
**Platform:** AI Prompt Community — Power Panel (Proposal C)
**Tech Stack:** Vue 3.5 + Vite 8, vue-router 5, Pinia 3, @tanstack/vue-query 5, shadcn-vue 2.4, Tailwind 4
**Backend:** GitHub Issues (GraphQL + REST API)
**Auth:** GitHub OAuth via Cloudflare Worker popup
**Last Updated:** 2026-03-14

---

## 1. Document Purpose

This document serves as the authoritative source of truth for screen connections, navigation flows, and cross-screen interactions in the Power Panel platform. It is designed for:

- **Implementation:** Developers use this to understand routing, state flow, and component interactions
- **Code Review:** Reviewers verify that implementations align with specified flows
- **QA Testing:** Test cases are derived from the transition tables and interaction patterns
- **Onboarding:** New team members understand the entire application architecture

All 6 screens and their interconnections are mapped here with explicit state changes, API calls, and reactive updates.

---

## 2. Screen Inventory

| Screen ID | Screen Name | Route(s) | Vue Component | Access Level | Description |
|-----------|-------------|----------|---------------|--------------|-------------|
| **S01** | App Shell | / (all routes) | `AppLayout.vue` | Public | Persistent wrapper: navbar, sidebar, router-view. All routes render within this shell. |
| **S02** | Master-Detail Split (Browse) | `/browse`, `/prompts/:id` | `BrowseView.vue` | Public | Two-panel layout: left = filterable prompt list, right = selected prompt detail panel. Default landing screen. |
| **S03** | Prompt Editor | `/prompts/new`, `/prompts/:id/edit` | `PromptEditorView.vue` | Auth required | Create/edit prompt with live preview. Full-screen editor + split pane. Auto-saves drafts. |
| **S04** | Version History | `/prompts/:id/versions` | `VersionHistoryView.vue` | Auth required to restore | Timeline of all edits to a prompt. Side-by-side diff view. Restore previous version button (author/maintainer only). |
| **S05** | Admin Panel | `/admin` | `AdminView.vue` | Maintainer only | Moderation queue (flagged/hidden prompts), label manager, platform stats, rate limit monitor. |
| **S06** | User Profile | `/users/:username` | `UserProfileView.vue` | Public (own profile auth-only features) | User's submitted prompts, saved prompts, activity feed. Own profile shows edit button and saved tab. |

---

## 3. Navigation Flow Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         S01: App Shell                              │
│                      (AppLayout.vue)                                │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Navbar: Logo | Search (⌘K) | Auth | Notifications | Theme   │  │
│  │ Sidebar: Categories | Filters | Collapse (👤 logged in)     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                         │                                            │
│  ┌──────────────────────┴────────────────────────────────────────┐  │
│  │              router-view (main content area)                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬────────────────┐
        │               │               │                │
        ▼               ▼               ▼                ▼
  ┌──────────────────────────────────────────┐  ┌──────────────┐
  │         S02: Browse                       │  │ S03: Editor  │
  │    (BrowseView.vue)                      │  │ (PromptEditor│
  │  ┌─────────────────┬────────────────┐    │  │ View.vue)    │
  │  │  Master List    │  Detail Panel  │    │  │ 🔒 Auth req  │
  │  │  ┌────────────┐ │ ┌────────────┐ │    │  │              │
  │  │  │ Prompt     │ │ │ Full       │ │◄───┼──┘ /prompts/new │
  │  │  │ rows (kbd) │ │ │ prompt     │ │    │  │ /prompts/:id/ │
  │  │  │ +hover pfx │ │ │ content    │ │    │  │ edit          │
  │  │  │ +reactions │ │ │ + Edit btn │ │    │  │              │
  │  │  │ (optimistic)│ │ │ + Fork btn │ │    │  └──────────────┘
  │  │  │ +comments  │ │ │ + Comment  │ │    │
  │  │  │ section    │ │ │ thread     │ │    │
  │  │  │ scroll     │ │ │ + Version  │ │    │
  │  │  │ sync (kbd) │ │ │ history    │ │    │
  │  │  │ ↑↓Enter    │ │ │ link       │ │    │
  │  │  └────────────┘ │ └────────────┘ │    │
  │  └─────────────────┴────────────────┘    │
  │  ├─ Fork (S02→S03)   [Prompt state]      │
  │  ├─ Edit (S02→S03)   [Prompt state]      │
  │  ├─ Version History  (S02→S04)           │
  │  ├─ Author click     (S02→S06)           │
  │  └─ Search (⌘K)     [global modal]      │
  └──────────────────────────────────────────┘
        │                    ▲
        │ publish            │ cancel/back
        │ (create prompt)    │
        ▼                    │
  ┌──────────────────────────┴──────────────┐
  │      S04: Version History                │
  │    (VersionHistoryView.vue)             │
  │  ┌────────────────────────────────────┐ │
  │  │ Timeline (scroll list)              │ │
  │  │ ├─ [2025-03-14 12:45]               │ │
  │  │ │  "Fixed grammar" - @author       │ │
  │  │ │  [Diff] [Restore] 🔒 auth req    │ │
  │  │ │                                   │ │
  │  │ ├─ [2025-03-10 08:22]               │ │
  │  │ │  "Initial version" - @author     │ │
  │  │ └─                                  │ │
  │  └────────────────────────────────────┘ │
  │  [Back to prompt]                        │
  │  Restore → invalidate cache → S02        │
  └──────────────────────────────────────────┘
        │
        │ Restore (mutation)
        ▼
  (invalidate ['prompt', id] + ['versions', id])
        │
        ▼
  [navigate to /prompts/:id]
        │
        └──────────► S02 (detail updated + toast)
```

### Additional Modal Overlays (layered on S01):

```
┌──────────────────────────────────┐
│  GitHub OAuth Popup              │
│  (external CF Worker /login)      │
│  ┌──────────────────────────────┐│
│  │ "Sign in with GitHub"         ││
│  │ (opens CF Worker popup)       ││
│  │ Redirect to: oauth.github.com ││
│  │ Callback: CF Worker token    ││
│  │ endpoint (local storage)      ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Global Search Modal (⌘K)        │
│  (shadcn Command or ComboBox)     │
│  ┌──────────────────────────────┐│
│  │ Search input (live MiniSearch)││
│  │ Results: prompts (title +    ││
│  │          snippet)            ││
│  │ [Enter] → navigate to prompt ││
│  │ [Esc] → close                ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Notifications Drawer (bell icon) │
│  (shadcn Sheet from right)        │
│  ┌──────────────────────────────┐│
│  │ Notification list:            ││
│  │ - "John commented on your..." ││
│  │ - "Your prompt hit 100 votes" ││
│  │ - "New feature request"       ││
│  │ [Click item] → navigate +     ││
│  │              mark as read     ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  Sidebar (mobile only)           │
│  (shadcn Sheet from left)        │
│  ┌──────────────────────────────┐│
│  │ Categories (collapsible)      ││
│  │ Filters (checkboxes)          ││
│  │ [Profile] [Logout]            ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

### Route Guard Flows:

```
User navigates to /prompts/new or /prompts/:id/edit
    │
    ▼
Check useAuthStore.isAuthenticated?
    │
    ├─ NO → redirect to /browse + "Sign in required" toast
    │        Show Auth Gate overlay (Sign in with GitHub button)
    │        After successful auth, router.push('/prompts/new')
    │
    └─ YES → render S03 Editor

User navigates to /admin
    │
    ▼
Check useAuthStore.isMaintainer?
    │
    ├─ NO → redirect to /browse + "Access denied" toast
    │
    └─ YES → render S05 Admin Panel

User navigates to /prompts/:id/edit
    │
    ▼
Check (useAuthStore.user.login === promptAuthor OR useAuthStore.isMaintainer)?
    │
    ├─ NO → redirect to /prompts/:id + "Cannot edit" toast
    │
    └─ YES → render S03 in edit mode
```

---

## 4. Authentication Flow

### Complete OAuth Flow (Numbered Steps):

1. **User Initiates Sign-In**
   - User clicks "Sign in with GitHub" button in navbar (S01) or auth gate overlay
   - Event handler: `() => window.open('/login', 'github_auth', 'width=500,height=600')`
   - Cloudflare Worker endpoint `/login` opens as popup

2. **CF Worker /login Endpoint**
   - Generates GitHub OAuth request with:
     - `client_id`: env.GITHUB_CLIENT_ID
     - `redirect_uri`: `https://powerPanel.example.com/auth-callback`
     - `scope`: `user:email`
   - Redirects popup to `https://github.com/login/oauth/authorize?...`

3. **User Authorizes on GitHub**
   - User logs in (if needed) and authorizes the app
   - GitHub redirects to `https://powerPanel.example.com/auth-callback?code=...&state=...`

4. **CF Worker /auth-callback Endpoint**
   - Validates state parameter (CSRF protection)
   - Exchanges code for access token via POST to `https://github.com/login/oauth/access_token`
   - Returns token to popup via `window.opener.postMessage({token, user})`
   - Popup closes automatically

5. **Main Window Receives Token**
   - Parent window listens for `postMessage` event
   - Extracts token and user data
   - Calls `useAuthStore.login({token, user})`

6. **Pinia useAuthStore.login()**
   - Sets `state.token = token`
   - Sets `state.user = {login, id, avatar_url, ...}`
   - Checks via GitHub REST API if user is maintainer (issue: permission or in team)
   - Sets `state.isMaintainer = boolean`
   - Saves token to `localStorage.setItem('gh_token', token)`
   - Saves user to `localStorage.setItem('gh_user', JSON.stringify(user))`

7. **UI Updates Reactively**
   - `useAuthStore.isAuthenticated` becomes `true`
   - Navbar renders authenticated UI: user avatar + dropdown menu instead of "Sign in"
   - Sidebar shows profile section with logout option
   - Routes like `/prompts/new` now accessible
   - Success toast: "Welcome, @username!"
   - Optionally retry blocked navigation (e.g., router.push('/prompts/new') if user was trying to create)

8. **Token Persistence**
   - On app reload, `AppLayout.vue` mounted hook calls `useAuthStore.restoreFromLocalStorage()`
   - If token in localStorage and not expired, restore session immediately
   - If token is invalid (410/401 response from GitHub API), trigger logout

### Authentication Gates:

| Action | Gate | Behavior |
|--------|------|----------|
| Navigate to `/prompts/new` | `!isAuthenticated` | Redirect to `/browse`, show "Sign in required" toast |
| Navigate to `/prompts/:id/edit` | `!isAuthenticated OR !canEditPrompt(userId, promptAuthorId, isMaintainer)` | Redirect to `/prompts/:id`, show "Cannot edit" toast |
| Navigate to `/admin` | `!isMaintainer` | Redirect to `/browse`, show "Access denied" toast |
| Create comment in S02 detail | `!isAuthenticated` | Show auth gate overlay in comment section |
| React (upvote) in S02/S03 | `!isAuthenticated` | Show auth gate overlay instead of reaction buttons |
| Save/Bookmark prompt | `!isAuthenticated` | Show auth gate overlay |

### What Happens After Auth (Retry Blocked Action):

```
User clicks "Fork" (S02 detail) but not authenticated
    │
    ▼
Auth gate triggered → show overlay + "Sign in with GitHub"
    │
    ▼
User completes OAuth flow
    │
    ▼
useAuthStore.isAuthenticated = true
    │
    ▼
Automatically call router.push('/prompts/new', {
  state: { prefillFrom: originalPromptId }
})
    │
    ▼
S03 Editor mounts with pre-filled content
```

### Token Expiry & Refresh:

- GitHub access tokens do not expire in the classical sense (they remain valid indefinitely unless revoked)
- If token becomes invalid (user revokes in GitHub settings):
  - Next API call returns 401/403
  - useAuthStore.logout() is called automatically
  - localStorage tokens cleared
  - User redirected to `/browse` with "Session expired" toast
  - User can sign in again

### Logout Flow:

```
User clicks "Sign out" in navbar dropdown (S01)
    │
    ▼
useAuthStore.logout()
    │
    ├─ Clear state.token, state.user, state.isAuthenticated
    ├─ Clear localStorage keys: gh_token, gh_user
    ├─ Invalidate all cached queries (queryClient.clear())
    │
    ▼
UI updates reactively
    │
    ├─ Navbar shows "Sign in with GitHub" button
    ├─ Sidebar profile section hidden
    ├─ Any open editor draft is cleared
    │
    ▼
Navigate to /browse
    │
    ▼
Show toast: "Signed out successfully"
```

---

## 5. Screen-to-Screen Transitions

### Transition Table: All Directional Flows

| From | To | Trigger | Router Call | Pinia Updates | TanStack Query | Animation |
|------|----|---------|-----------|----|----------|-----------|
| S01 | S02 | Click logo or "Browse" in sidebar | `router.push('/browse')` | Clear `selectedPromptId` | No-op (cache intact) | Fade in main content |
| S02 | S02 detail | Click prompt row OR ↑↓Enter in list | `router.push('/prompts/' + id)` OR update `selectedPromptId` | `selectedPromptId = id` | Prefetch `usePromptDetail(id)` on hover | Slide detail panel in (mobile: navigate) |
| S02 detail | S02 list | Click back button (mobile) or collapse | `router.back()` OR `selectedPromptId = null` | `selectedPromptId = null` | Cache retained | Slide out detail panel |
| S02 | S03 (new) | Click "New Prompt" in sidebar or navbar | `router.push('/prompts/new')` | `useDraftStore.reset()` | Clear draft cache | Full-screen transition |
| S02 detail | S03 (edit) | Click "Edit" button (author/maintainer) | `router.push('/prompts/' + id + '/edit')` | `useDraftStore` prefilled from prompt | Fetch `usePromptDetail(id)` | Full-screen transition |
| S02 detail | S03 (fork) | Click "Fork" button | `router.push('/prompts/new', {state: {prefillFrom: id}})` | `useDraftStore` prefilled + "Forked from X" in frontmatter | Prefetch original prompt metadata | Full-screen transition |
| S03 | S02 | Click "Publish" button (success) | `router.push('/prompts/' + newId)` | `selectedPromptId = newId`, invalidate `['prompts']` | Invalidate `['prompts']` → invalidate `['versions', id]` | Return to browse + toast |
| S03 | S02 | Click "Cancel" or back (with guard) | `router.back()` or `router.push('/browse')` | `isDirty` check: if true, show "Discard changes?" confirmation | No invalidation | Slide out editor |
| S02 detail | S04 | Click "Version History" link in detail | `router.push('/prompts/' + id + '/versions')` | No Pinia changes | Prefetch `usePromptVersions(id)` | Navigate to timeline view |
| S04 | S02 detail | Click "Back to Prompt" or back button | `router.push('/prompts/' + id)` | No Pinia changes | Cache retained | Slide back to detail |
| S04 | S02 detail | Click "Restore" button (author/maintainer) | `useRestoreVersion(id, versionIndex)` mutation | Invalidate `['prompt', id]` + `['versions', id]` | Invalidate both keys → refetch detail | Auto-navigate to `/prompts/:id`, show "Restored" toast |
| S02 (anywhere) | S06 | Click author avatar/username link | `router.push('/users/' + username)` | No Pinia changes | Prefetch `useUserProfile(username)` | Navigate to profile |
| S06 | S02 | Click "Browse" in sidebar or back button | `router.push('/browse')` | Clear `selectedPromptId` | Cache retained | Return to browse |
| S01 (navbar) | Global Search Modal | Press ⌘K or / | `useUIStore.activeModal = 'search'` | Build search results from `useSearchStore` | No API call (local MiniSearch) | Modal fade in |
| Global Search Modal | S02 detail | Press Enter on result | `router.push('/prompts/' + id)`, close modal | `selectedPromptId = id`, `activeModal = null` | Prefetch `usePromptDetail(id)` | Modal fade out → detail loads |
| S01 (navbar) | Notifications Drawer | Click bell icon | `useUIStore.notificationDrawerOpen = true` | No Pinia changes | Fetch `useNotifications()` | Sheet slide in from right |
| Notifications Drawer | S02 detail | Click notification item | `router.push('/prompts/' + id)`, close drawer, mark notification as read | `selectedPromptId = id`, `notificationDrawerOpen = false`, invalidate `['notifications']` | Invalidate `['notifications']` + prefetch `usePromptDetail(id)` | Close drawer → navigate |
| Any | S05 (admin) | Click "Admin" in navbar (maintainer) | `router.push('/admin')` | No Pinia changes | Prefetch `useAdminQueue()` + `usePromptStats()` | Navigate to admin |
| S05 | S02 detail | Click prompt link in moderation queue | `router.push('/prompts/' + id)` | `selectedPromptId = id` | Prefetch `usePromptDetail(id)` | Navigate to detail |
| S05 (moderation action) | S02 + S05 | Click "Approve" or "Hide" on flagged prompt | `useApprovePrompt(id)` or `useHidePrompt(id)` mutation | Invalidate `['adminQueue']` + `['prompts']` | Both caches invalidated → S02 detail updates if open | Queue refreshes, toast shows |

### Detailed Transition Examples:

#### Example 1: Browse → Detail (Keyboard Navigation in S02)

```
User presses ↓ in master list to navigate to next prompt
    │
    ▼
List handler detects key event: (e) => {
  if (e.key === 'ArrowDown') {
    const next = prompts[currentIndex + 1];
    if (next) {
      usePromptsStore.selectedPromptId = next.id;
      router.push('/prompts/' + next.id);
    }
  }
}
    │
    ▼
URL updates to /prompts/:id
    │
    ▼
usePromptDetail(id) hook triggered
    │
    ├─ If cached: return stale data immediately (stale-while-revalidate strategy)
    ├─ If not cached: show skeleton loader
    │
    ▼
Detail panel renders with prompt content + comments + reactions
    │
    ▼
usePromptVersions(id) prefetch triggered (lazy query)
```

#### Example 2: Fork Prompt (S02 → S03)

```
User clicks "Fork" button in S02 detail panel (requires auth)
    │
    ▼
Check: useAuthStore.isAuthenticated?
    │
    ├─ NO → Show auth gate overlay in detail panel
    │        User completes OAuth
    │        Auto-retry fork action
    │
    └─ YES → Continue
        │
        ▼
    Get original prompt ID from detail panel
    Prepare prefill state: {prefillFrom: originalPromptId}
        │
        ▼
    router.push('/prompts/new', {state: {prefillFrom: id}})
        │
        ▼
    S03 (PromptEditorView) mounts:
    - Reads router.currentRoute.state.prefillFrom
    - Calls usePromptDetail(prefillFrom) to fetch full content
    - Populates useDraftStore with:
      * title: "Original Title [Forked]"
      * content: original markdown (includes YAML frontmatter)
      * metadata: category, model, difficulty copied
    - Prepends comment in frontmatter: "Forked from [original author]/@[original id]"
        │
        ▼
    Editor displays pre-filled content, isDirty = false initially
```

#### Example 3: Publish Prompt (S03 → S02)

```
User fills editor, clicks "Publish" button in S03
    │
    ▼
Validate: title, content length, required metadata
    │
    ├─ INVALID → Show inline error message, highlight field
    │
    └─ VALID → Continue
        │
        ▼
    Call useCreatePrompt mutation with:
    {
      title: draft.title,
      body: draft.content,
      labels: [draft.metadata.category, draft.metadata.model, ...],
      state: 'open'
    }
        │
        ▼
    Mutation:
    POST /repos/owner/repo/issues
    with body (markdown content) + labels (structured metadata)
        │
        ▼
    On success:
    - GitHub returns: {id: newIssueNumber, ...}
    - invalidateQueries({queryKey: ['prompts']})
    - queryClient.prefetchQuery({queryKey: ['prompt', newId], ...})
    - useDraftStore.reset() (clear draft)
    - router.push('/prompts/' + newId)
        │
        ▼
    S02 mounts with newId as selectedPromptId
    Detail panel loads new prompt
    Show toast: "Prompt published! 🎉"
```

#### Example 4: Approve Flagged Prompt (S05 → S02)

```
Maintainer clicks "Approve" on flagged prompt in S05 moderation queue
    │
    ▼
Call useApprovePrompt(promptId) mutation:
    PATCH /repos/owner/repo/issues/:number
    with labels: [remove 'state:flagged' label]
        │
        ▼
    On success:
    - invalidateQueries({queryKey: ['adminQueue']})
    - invalidateQueries({queryKey: ['prompts']})
    - invalidateQueries({queryKey: ['prompt', promptId]}) if in view
        │
        ▼
    Queue re-renders: flagged prompt removed
    If detail panel (S02) shows that prompt:
    - usePromptDetail(id) refetches
    - "state:flagged" label removed from detail
    - Toast: "Prompt approved"
```

---

## 6. Global State Flows

### 6.1 Filter State (Sidebar → List)

**Store:** `usePromptsStore`

**State Shape:**
```javascript
filterState: {
  category: 'All',      // Selected category or 'All'
  model: 'All',         // e.g., 'GPT-4', 'Claude', 'All'
  difficulty: 'All',    // 'Beginner', 'Intermediate', 'Advanced', 'All'
  sort: 'recent',       // 'recent', 'popular', 'trending', 'trending-week'
  query: '',            // Free-text search in master list (local, not ⌘K global)
  tags: [],             // Selected tags array
  expandedCategories: {} // Track which categories expanded in sidebar
}
```

**Reactive Flow:**

```
User clicks category "Image Generation" in sidebar (S01)
    │
    ▼
Handler: onCategorySelect('Image Generation')
    │
    ▼
usePromptsStore.filterState.category = 'Image Generation'
    │
    ▼
Watch: watch(() => filterState, async (newState) => {
  queryClient.prefetchQuery({
    queryKey: ['prompts', newState],
    queryFn: () => fetchPrompts(newState)
  })
}, {deep: true})
    │
    ▼
Prefetch triggers: usePrompts(filterState) composable
    │
    ├─ Fetch paginated issues from GitHub GraphQL
    ├─ Filter by labels matching category enum
    │
    ▼
Master list (left panel in S02) re-renders with filtered prompts
    │
    ├─ Scroll position reset to top
    ├─ selectedPromptId cleared (or keep if in new set)
    │
    ▼
Detail panel (right panel) clears or shows "select a prompt"
```

**Keyboard Shortcut:** `G+C` opens category selector as dropdown

**Mobile Behavior:** Filters collapse into a bottom sheet on < 768px

---

### 6.2 Auth State (Global Auth → All Screens)

**Store:** `useAuthStore`

**State Shape:**
```javascript
{
  user: {
    login: 'octocat',
    id: 1,
    avatar_url: 'https://...',
    email: 'octocat@github.com'
  },
  token: 'ghp_...',
  isAuthenticated: true,
  isMaintainer: false,  // true if user is in maintainers list/team
  lastError: null
}
```

**Reactive Flow:**

```
User signs in (flow described in § 4)
    │
    ▼
useAuthStore.login({token, user})
    │
    ├─ state.isAuthenticated = true
    ├─ state.user = {...}
    ├─ state.isMaintainer = (checked via GitHub API)
    ├─ localStorage.setItem('gh_token', token)
    │
    ▼
All screens reactively update:

S01 Navbar:
  - Show user avatar + dropdown menu
  - Show "New Prompt" in sidebar
  - Show "Admin" in sidebar (if isMaintainer)
  - Reactions in S02 detail now show interactive buttons

S02 Detail Panel:
  - Reactions buttons become clickable (no auth gate overlay)
  - Comment input field visible
  - "Edit" and "Fork" buttons visible
  - Vote buttons interactive

S03 Editor:
  - Route /prompts/new now accessible
  - Draft recovery enabled (check localStorage for previous draft)

S06 Profile:
  - If username === authStore.user.login: show own profile mode
  - Show "Saved" tab
  - Show "Edit Profile" button
```

**Logout Flow:**

```
User clicks "Sign out" in navbar
    │
    ▼
useAuthStore.logout()
    │
    ├─ state.isAuthenticated = false
    ├─ state.user = null
    ├─ localStorage.clear()
    ├─ queryClient.clear() (all cached data cleared)
    │
    ▼
All screens reactively hide auth-only features:
    - Reaction buttons show "Sign in required" overlay
    - Comment input hidden
    - Edit/Fork buttons hidden
    - Admin menu item hidden
    - Own profile indicators hidden

S02 Detail:
  - Comments still visible (read-only)
  - Vote counts still visible
```

---

### 6.3 Search State (Global ⌘K vs. Local Master Panel)

**Stores:** `useSearchStore` (global), `usePromptsStore.filterState.query` (local)

**Global Search (⌘K):**

```
User presses ⌘K (or / in some contexts)
    │
    ▼
useUIStore.activeModal = 'search'
    │
    ▼
Overlay opens with command palette / search box
    │
    ├─ Input field focused
    ├─ MiniSearch index already loaded (IndexedDB)
    │
    ▼
User types: "vision language model"
    │
    ▼
useSearchStore.search(query)
    │
    ├─ Query against MiniSearch index (in-memory, local)
    ├─ Matches: title, tags, snippet (first 100 chars)
    ├─ Results: [{id, title, author, snippet, relevance}, ...]
    ├─ Limit: top 20 results
    │
    ▼
Modal renders results list
    │
    ├─ User presses ↑↓ to highlight result
    ├─ [Enter] navigates: router.push('/prompts/:id')
    ├─ [Esc] closes modal
```

**Local Master Panel Search (S02 left panel):**

```
User types in search input in master list header
    │
    ▼
usePromptsStore.filterState.query = input
    │
    ▼
usePrompts(filterState) hook re-fetches, filtering by:
  - GitHub issue title contains query (REST API)
  - OR body snippet contains query (GraphQL search)
    │
    ▼
Master list re-renders with results
    │
    ├─ If no results: show "No prompts found"
    ├─ If query is empty: show all (filtered by category, etc.)
```

**Index Build & Refresh:**

```
App boots (AppLayout.vue mounted)
    │
    ▼
Check: does IndexedDB have 'searchIndex' and is it fresh (< 1 hour old)?
    │
    ├─ YES → load from IndexedDB into memory (MiniSearch instance)
    │        useSearchStore.isIndexed = true
    │
    └─ NO → Fetch all issues paginated from GitHub GraphQL
           For each issue: {id, title, body, labels, author}
           Build MiniSearch index with fields: title, tags, snippet
           Save to IndexedDB: {index, timestamp: Date.now()}
           useSearchStore.isIndexed = true
           Show loading overlay: "Building search index..."
```

**Stale Index Refresh (Background):**

```
useSearchStore.lastIndexed = Date.now()
    │
    ▼
Every 60 minutes (or when user navigates to /browse):
    │
    ├─ Trigger background refresh:
    │   queryClient.prefetchQuery({
    │     queryKey: ['searchIndex'],
    │     queryFn: buildSearchIndex
    │   })
    │
    ├─ No blocking UI; runs in background
    ├─ Update IndexedDB when complete
    │
    └─ User can still search old index while refresh in progress
```

---

### 6.4 Draft State (useDraftStore)

**Store:** `useDraftStore`

**State Shape:**
```javascript
{
  title: string,
  content: string,        // Full markdown with YAML frontmatter
  metadata: {
    category: string,
    model: string,
    difficulty: string,
    tags: string[]
  },
  isDirty: boolean,       // True if user made changes since last save
  lastSaved: number,      // timestamp
  lastSavedPath: string   // '/prompts/:id/edit' or '/prompts/new'
}
```

**Auto-Save & Draft Persistence:**

```
S03 Editor mounts with /prompts/new route
    │
    ▼
Check localStorage for draft at key: 'draft_/prompts/new'
    │
    ├─ FOUND → Load into useDraftStore
    │           Show toast: "Draft recovered from XX minutes ago"
    │           Editor populated with previous content
    │
    └─ NOT FOUND → Show empty editor
```

```
User types in editor (S03)
    │
    ▼
@input event → update useDraftStore.content
    │
    ▼
isDirty = true
    │
    ▼
Debounce: wait 2 seconds for user to stop typing
    │
    ▼
Auto-save: localStorage.setItem(
  'draft_' + route.path,
  JSON.stringify(useDraftStore.$state)
)
    │
    ▼
lastSaved = Date.now()
    │
    ▼
Show transient indicator: "Draft saved" (1 sec toast, then fade)
```

**Route Leave Guard (isDirty Check):**

```
User clicks "Cancel" or navigates away (S03 → S02)
    │
    ▼
router.beforeEach hook checks: isDirty?
    │
    ├─ YES → Show confirmation dialog:
    │         "Discard draft? Changes will be lost."
    │         [Discard] [Cancel]
    │
    │         If [Discard]:
    │         - localStorage.removeItem('draft_...')
    │         - useDraftStore.reset()
    │         - Navigate away (router.push())
    │
    │         If [Cancel]:
    │         - Stay in editor
    │
    └─ NO → Navigate immediately (no draft to keep)
```

**Cleanup on Publish:**

```
useCreatePrompt mutation succeeds
    │
    ▼
useDraftStore.reset()
    │
    ├─ Clear all fields
    ├─ localStorage.removeItem('draft_...')
    │
    ▼
Navigate to /prompts/:id (newly created prompt)
```

---

### 6.5 Cache Invalidation & Mutation Flow

**TanStack Query Setup:**

```javascript
// In queryClient config:
defaultOptions: {
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 min
    gcTime: 10 * 60 * 1000,           // 10 min (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  },
  mutations: {
    retry: 1
  }
}
```

#### Scenario 1: Create New Prompt (S03 → S02)

```
useCreatePrompt.mutate({title, content, labels})
    │
    ▼
POST /repos/owner/repo/issues
    │
    ▼
On success (newIssue):
    │
    ├─ Action 1: Invalidate filtered list
    │   queryClient.invalidateQueries({queryKey: ['prompts']})
    │   (This invalidates ALL ['prompts', filterState] variants)
    │
    ├─ Action 2: Prefetch new prompt detail
    │   queryClient.prefetchQuery({
    │     queryKey: ['prompt', newIssue.id],
    │     queryFn: () => fetchPromptDetail(newIssue.id)
    │   })
    │
    ├─ Action 3: Clear draft
    │   useDraftStore.reset()
    │
    ├─ Action 4: Navigate
    │   router.push('/prompts/' + newIssue.id)
    │
    ├─ Action 5: Update search index (background)
    │   addToSearchIndex(newIssue)
    │   updateIndexedDB()
    │
    └─ Show toast: "Prompt published! 🎉"
            │
            ▼
        S02 detail auto-loads with prefetched data
```

#### Scenario 2: Toggle Reaction (S02 Detail)

```
User clicks upvote on prompt in detail panel
    │
    ▼
Check: useAuthStore.isAuthenticated?
    │
    ├─ NO → Show auth gate overlay
    │
    └─ YES → Continue
        │
        ▼
    Optimistic update:
    - Immediately render reaction button as pressed
    - Increment reaction count in detail panel UI
    - NOT changed in cache yet
        │
        ▼
    useToggleReaction.mutate({promptId, reactionType: '👍'})
    (POST /repos/owner/repo/issues/:number/reactions)
        │
        ▼
    On success:
    - Invalidate: queryClient.invalidateQueries({
        queryKey: ['prompt', promptId]
      })
    - Refetch prompt detail (TanStack Query auto-refetch)
    - Update master list item reactions count
        │
        ▼
    On error (network failure):
    - Revert optimistic update: re-render button as unpressed
    - Show error toast: "Failed to react"
    - User can retry
```

#### Scenario 3: Create Comment (S02 Detail)

```
User types comment in S02 detail, clicks "Post"
    │
    ▼
useCreateComment.mutate({promptId, body})
(POST /repos/owner/repo/issues/:number/comments)
    │
    ▼
On success (newComment):
    │
    ├─ Invalidate: queryClient.invalidateQueries({
    │   queryKey: ['comments', promptId]
    │ })
    │
    ├─ Optionally: prepend newComment to in-memory comments array
    │   (optimistic update, but GitHub edge case: editing requires comment ID from server)
    │
    ├─ Refetch comments list (stale-while-revalidate)
    │
    └─ Clear comment input, show toast: "Comment posted"
```

#### Scenario 4: Admin Approve Flagged Prompt (S05)

```
Maintainer clicks "Approve" on flagged prompt in S05 queue
    │
    ▼
useApprovePrompt.mutate(promptId)
(PATCH /repos/owner/repo/issues/:number with label removal)
    │
    ▼
On success:
    │
    ├─ Invalidate multiple keys:
    │   - queryClient.invalidateQueries({queryKey: ['adminQueue']})
    │   - queryClient.invalidateQueries({queryKey: ['prompts']})
    │   - queryClient.invalidateQueries({queryKey: ['prompt', promptId]})
    │
    ├─ Refetch admin queue (removed from view)
    │
    ├─ If S02 detail is showing this prompt:
    │   Detail panel updates automatically (state:flagged label removed)
    │
    └─ Show toast in S05: "Prompt approved"
```

#### Scenario 5: Restore Previous Version (S04)

```
User clicks "Restore" on historical version in S04
    │
    ▼
Confirmation dialog: "Restore to [date] version? (Original author: X)"
    │
    ├─ [Cancel] → abort
    │
    └─ [Confirm] → Continue
        │
        ▼
    useRestoreVersion.mutate({promptId, versionIndex})
    (POST /repos/owner/repo/issues/:number/comments with restored body,
     then PATCH issue body if first version)
        │
        ▼
    On success:
    - Invalidate: queryClient.invalidateQueries({
        queryKey: ['prompt', promptId]
      })
    - Invalidate: queryClient.invalidateQueries({
        queryKey: ['versions', promptId]
      })
    - Refetch both queries
    - Navigate: router.push('/prompts/' + promptId)
        │
        ▼
    S02 detail loads with restored content
    Show toast: "Version restored successfully"
```

---

## 7. Cross-Screen Interaction Patterns

### 7.1 Prompt Card Click (Master List → Detail)

**User Action:** Click on a prompt row in master list (S02 left panel)

```
User clicks on prompt row in master list
    │
    ▼
click handler: (prompt) => {
  usePromptsStore.selectedPromptId = prompt.id;
  router.push('/prompts/' + prompt.id);
}
    │
    ▼
Two parallel operations:

Operation A: URL Update
    router.push('/prompts/:id')
    │
    ├─ History updated (browser back/forward enabled)
    ├─ Route matches detail panel component

Operation B: Pinia Store Update
    selectedPromptId = prompt.id
    │
    └─ Sidebar highlights this prompt row

Operation C: Data Fetch (TanStack Query)
    usePromptDetail(id) composable triggered
    │
    ├─ If cached and fresh: return cached data (stale-while-revalidate)
    ├─ If stale or missing: show skeleton loader + fetch from GitHub GraphQL
    │
    ▼
Detail panel renders with:
    - Prompt title, author, date, vote count
    - Full content (markdown → HTML via shiki + markdown-it)
    - Reactions section (👍 upvotes, etc.)
    - Comments thread
    - "Edit" button (if author/maintainer)
    - "Fork" button (if authenticated)
    - "Version History" link
```

**Keyboard Enhancement (↑↓ Navigation):**

```
User presses ↓ while focused on master list
    │
    ▼
keydown handler detects ArrowDown
    │
    ▼
Get next prompt from filtered prompts array
Set selectedPromptId = next.id
Route to /prompts/:id (same as click)
    │
    ▼
Master list scrolls to highlight new row
Detail panel updates to show new prompt
```

**Hover Prefetching:**

```
User hovers over prompt row in master list
    │
    ▼
mouseenter handler:
    queryClient.prefetchQuery({
      queryKey: ['prompt', prompt.id],
      queryFn: () => fetchPromptDetail(prompt.id)
    })
    │
    ▼
If user clicks, detail panel likely already cached
    (Appears instant to user, even on slow network)
```

---

### 7.2 Fork Prompt (S02 Detail → S03)

**User Action:** Click "Fork" button in detail panel (requires auth)

```
User clicks "Fork" button in S02 detail panel
    │
    ▼
Check: useAuthStore.isAuthenticated?
    │
    ├─ NO:
    │   Show auth gate overlay in detail panel
    │   "Sign in required to fork prompts"
    │   User completes GitHub OAuth (§ 4)
    │   Auto-retry fork action
    │
    └─ YES: Continue
        │
        ▼
    Get original prompt ID from detail context
        │
        ▼
    router.push('/prompts/new', {
      state: {prefillFrom: originalPromptId}
    })
        │
        ▼
    S03 (PromptEditorView.vue) mounted lifecycle:
        │
        ├─ Read router.currentRoute.state.prefillFrom
        ├─ If provided, call usePromptDetail(prefillFrom)
        ├─ Fetch full prompt content + metadata
        │
        ▼
    Populate useDraftStore:
        │
        ├─ title: original.title + " [Forked]"
        ├─ content: original markdown
        ├─ metadata: copy category, model, difficulty
        │
        ▼
    Parse YAML frontmatter in original content:
    Add comment line:
        "# Forked from [original-title]"
        "# Original author: @[original-author]"
        "# Original ID: #[original-issue-number]"
        │
        ▼
    Editor displays pre-filled content
    isDirty = false initially (no user edits yet)
    Draft is NOT auto-saved (prefill doesn't count as edit)
        │
        ▼
    User can:
    - Modify title, content, metadata
    - Click "Preview" to see rendered output
    - Click "Publish" to create new prompt (original remains unchanged)
```

---

### 7.3 Submit New Prompt (S03 → S02)

**User Action:** Click "Publish" button in editor (S03)

```
User clicks "Publish" button
    │
    ▼
Client-side validation:
    ├─ title.length >= 5
    ├─ content.length >= 20
    ├─ metadata.category !== 'All' (category required)
    ├─ metadata.model !== 'All' (model required)
    │
    ├─ FAIL: Show inline error toast, highlight field
    └─ PASS: Continue

    ▼
Build GitHub issue payload:
    {
      title: draft.title,
      body: draft.content,    // Markdown with YAML frontmatter
      labels: [
        `category:${draft.metadata.category}`,
        `model:${draft.metadata.model}`,
        `difficulty:${draft.metadata.difficulty}`,
        ...draft.metadata.tags.map(t => `tag:${t}`)
      ]
    }
    │
    ▼
Call useCreatePrompt.mutate(payload)
    (POST /repos/owner/repo/issues)
    │
    ├─ Show loading state: button disabled, spinner
    │
    ▼
On success (GitHub returns newIssue):
    │
    ├─ Action: Invalidate ['prompts'] cache
    │   queryClient.invalidateQueries({queryKey: ['prompts']})
    │   (All filter variants will refetch)
    │
    ├─ Action: Prefetch new prompt detail
    │   queryClient.prefetchQuery({
    │     queryKey: ['prompt', newIssue.number],
    │     queryFn: () => fetchPromptDetail(newIssue.number)
    │   })
    │
    ├─ Action: Clear draft
    │   useDraftStore.reset()
    │   localStorage.removeItem('draft_/prompts/new')
    │
    ├─ Action: Update search index (background)
    │   addToSearchIndex(newIssue)
    │
    ├─ Action: Navigate
    │   router.push('/prompts/' + newIssue.number)
    │
    └─ Show success toast: "Prompt published! 🎉"
                           "You can now share it or edit later"
    │
    ▼
S02 auto-loads:
    - Master list refetches (invalidation)
    - New prompt appears at top (if sorted by recent)
    - Detail panel shows new prompt (prefetched data)
    - selectedPromptId = newIssue.number

On error (network/validation):
    ├─ Show error toast with reason
    ├─ Draft remains intact (auto-saved in localStorage)
    ├─ User can retry
```

---

### 7.4 Admin Moderation (S05 → S02)

**User Action:** Maintainer hides/approves flagged prompt in S05

```
Scenario A: Approve Flagged Prompt

Maintainer clicks "Approve" in S05 moderation queue
    │
    ▼
useApprovePrompt.mutate(promptId)
(Remove 'state:flagged' label via PATCH)
    │
    ▼
On success:
    │
    ├─ Invalidate: ['adminQueue']
    │   Queue re-renders, prompt removed from view
    │
    ├─ Invalidate: ['prompts']
    │   If master list is open (S02), refetch list
    │
    ├─ Invalidate: ['prompt', promptId]
    │   If detail panel shows this prompt, refetch
    │
    └─ Toast: "Prompt approved"
        │
        ▼
    If S02 detail is viewing this prompt:
        Detail panel updates reactively
        'state:flagged' label removed from label badges
        Detail still visible (not hidden, just unflagged)

Scenario B: Hide Prompt (Spam)

Maintainer clicks "Hide" in S05 moderation queue
    │
    ▼
useHidePrompt.mutate(promptId)
(Add 'state:hidden' label, close issue)
    │
    ▼
On success:
    │
    ├─ Invalidate: ['adminQueue'], ['prompts'], ['prompt', promptId]
    │
    ├─ If S02 detail is viewing this prompt:
    │   Detail panel refetches
    │   Renders: "⚠️ This prompt has been hidden by moderators."
    │   "You cannot view the full content."
    │   "Report" button removed, only "Back" button shown
    │
    ├─ Master list refetches
    │   Prompt removed from public list
    │
    └─ Toast: "Prompt hidden"
```

---

### 7.5 Version Restore (S04 → S02)

**User Action:** Restore previous version from version history

```
User viewing S04 (VersionHistoryView) for prompt #42
    │
    ▼
Timeline shows:
    [2026-03-14 12:45] "Fixed grammar" - edited by @author
    [2026-03-10 08:22] "Initial version" - created by @author
    │
    ▼
User clicks "Restore" button on 2026-03-10 version
    │
    ▼
Check: useAuthStore.user.login === promptAuthor OR isMaintainer?
    │
    ├─ NO → Toast: "Only author or maintainer can restore"
    │
    └─ YES → Continue
        │
        ▼
    Confirmation dialog:
        "Restore to version from 2026-03-10 08:22?"
        "Original author: @author"
        [Cancel] [Restore]
        │
        ├─ [Cancel] → abort
        │
        └─ [Restore] → Continue
            │
            ▼
        useRestoreVersion.mutate({
          promptId: 42,
          versionIndex: 1      // Index in versions array
        })
            │
            ├─ Mutation posts new comment with old content
            ├─ Updates issue body
            ├─ Sets label 'state:reverted' (optional)
            │
            ▼
        On success:
            │
            ├─ Invalidate: ['prompt', 42]
            ├─ Invalidate: ['versions', 42]
            ├─ Refetch both (stale-while-revalidate)
            │
            ├─ Navigate: router.push('/prompts/42')
            │
            └─ S02 detail panel loads with restored content
                Toast: "Version restored to 2026-03-10 08:22"
```

---

### 7.6 Profile Click (Any Screen → S06)

**User Action:** Click author avatar or username link anywhere

```
Scenario A: Click author avatar/name in S02 detail panel

User clicks "@octocat" username in detail metadata
    │
    ▼
Handler: (e) => {
  router.push('/users/octocat');
}
    │
    ▼
S06 (UserProfileView) mounts
    │
    ├─ Read route.params.username ('octocat')
    ├─ Call useUserProfile('octocat')
    │   (GraphQL query: user {repositories, issues submitted, etc.})
    │
    ▼
Profile page renders:
    │
    ├─ Header: Avatar, bio, GitHub link
    ├─ Tabs: [Submitted Prompts] [Saved Prompts] [Activity]
    ├─ Submitted Prompts: grid of prompts authored by user
    ├─ Saved Prompts: (only if viewing own profile, else empty)
    ├─ Activity: timeline of user's votes, comments, submissions
    │
    ▼
Check: useAuthStore.user.login === 'octocat'?
    │
    ├─ YES → Own Profile Mode:
    │   - Show "Edit Profile" button
    │   - Show "Saved Prompts" tab (populated)
    │   - Show private activity (e.g., drafts)
    │   - Can edit bio (future feature)
    │
    └─ NO → Public Profile Mode:
        - Only submitted prompts visible
        - Saved Prompts tab hidden
        - Only public activity visible
        - No edit button

Scenario B: Click avatar in comments list (S02 detail)

User clicks commenter avatar in comment thread
    │
    ▼
Same flow: router.push('/users/' + commenterLogin)
    │
    ▼
S06 loads with commenter's profile
```

---

## 8. Global Keyboard Shortcuts

| Shortcut | Action | Active Screens | Implementation | Notes |
|----------|--------|----------------|-----------------|-------|
| **⌘K** or **/** | Open global search (command palette) | All | `keydown.meta.k` or `keydown.shift./`, `useUIStore.activeModal = 'search'` | Use ⌘K on Mac, Ctrl+K on Windows; escape to close |
| **⌘↵** | Publish prompt | S03 (Editor) | `keydown.meta.Enter`, trigger `publish()` handler | Only if form valid |
| **⌘S** | Save draft (explicit) | S03 (Editor) | `keydown.meta.s`, call `saveDraft()` manually | Auto-save already happens every 2s; this is force-save |
| **⌘//** or **?** | Show keyboard shortcuts help | All | Toggle modal with shortcut legend | Overlay lists all shortcuts |
| **Escape** | Close modal / clear selection | All | `keydown.Escape`, close active modal or clear `selectedPromptId` | Also cancel pending operations |
| **↑↓** | Navigate prompt list | S02 (Browse list) | `keydown.ArrowUp/Down` in list, update `selectedPromptId`, `router.push()` | Scroll list into view; wrap at start/end (optional) |
| **Enter** | Select highlighted prompt | S02 (Browse list) | `keydown.Enter` on focused list item, same as click | Navigates to detail panel |
| **[** | Toggle sidebar collapse | S01 (all screens) | `keydown.[` or `]`, toggle `useUIStore.sidebarCollapsed` | Animate width change; remember in localStorage (session-only) |
| **G + C** | Go to Category filter | S01 (all screens) | `keydown.g` then `keydown.c`, open category selector dropdown | Mnemonic: "Go Category" |
| **G + N** | Go to New Prompt | All | `keydown.g` then `keydown.n`, `router.push('/prompts/new')` | Mnemonic: "Go New"; requires auth |
| **G + B** | Go to Browse (master-detail) | All | `keydown.g` then `keydown.b`, `router.push('/browse')` | Mnemonic: "Go Browse" |
| **G + A** | Go to Admin | S01 (if maintainer) | `keydown.g` then `keydown.a`, `router.push('/admin')` | Only active if `isMaintainer = true` |
| **G + U** | Go to User Profile (own) | All (if auth) | `keydown.g` then `keydown.u`, `router.push('/users/' + authStore.user.login)` | Only active if authenticated |
| **C** | Copy prompt link | S02 (detail, S03 on published) | `keydown.c`, copy to clipboard: `https://powerPanel.example.com/prompts/:id` | Toast: "Copied to clipboard" |
| **A** | Append reaction (👍) | S02 (detail list) | `keydown.a`, same as clicking upvote button | Requires auth; shows auth gate if needed |
| **Tab** / **Shift+Tab** | Cycle focus between panels | S02 (Browse) | Built-in browser behavior, enhanced with roving tabindex | Master list → Detail panel → Sidebar |
| **F** | Fork prompt | S02 (detail panel) | `keydown.f`, same as clicking "Fork" button | Requires auth |
| **E** | Edit prompt | S02 (detail panel, author/maintainer) | `keydown.e`, same as clicking "Edit" button | Only available to author or maintainer |
| **V** | View version history | S02 (detail panel) | `keydown.v`, `router.push('/prompts/:id/versions')` | Navigates to S04 |
| **D** | Toggle dark theme | All | `keydown.d`, toggle `useUIStore.theme` (light/dark/auto) | Save preference to localStorage |
| **?** | Show help / keyboard legend | All | `keydown.?`, open help modal overlay | List all available shortcuts; dismiss with Escape |

**Implementation Details:**

```javascript
// In AppLayout.vue or global composable:
import {useEventListener} from '@vueuse/core';

const handleGlobalKeydown = (e) => {
  // Escape
  if (e.key === 'Escape') {
    useUIStore.activeModal = null;
    usePromptsStore.selectedPromptId = null;
  }

  // ⌘K / Ctrl+K (global search)
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    useUIStore.activeModal = 'search';
  }

  // G chord (must track "g" pressed, then wait for next key)
  // Implement state machine or use library
  if (e.key === 'g') {
    setGChordActive(true);
    setTimeout(() => setGChordActive(false), 1000); // 1s timeout
    return;
  }

  if (gChordActive) {
    if (e.key === 'b') router.push('/browse');
    if (e.key === 'n') router.push('/prompts/new');
    if (e.key === 'c') openCategorySelector();
    // ... etc
    setGChordActive(false);
  }

  // [ to toggle sidebar
  if (e.key === '[') {
    useUIStore.sidebarCollapsed = !useUIStore.sidebarCollapsed;
  }
};

useEventListener(document, 'keydown', handleGlobalKeydown);
```

**Preventing Conflicts:**

- Keyboard shortcuts do NOT fire if user is typing in text input (contenteditable or `<input>`, `<textarea>`)
- Check: `e.target.matches('input, textarea, [contenteditable]')`
- Skip handler if true
- Shortcuts in S03 editor: only single-char shortcuts (⌘S, ⌘Enter, Escape); G-chords disabled

---

## 9. Loading & Error State Flows

### Initial App Load (Index Build)

```
User visits powerPanel.example.com (cold load, no IndexedDB cache)
    │
    ▼
AppLayout.vue mounted:
    ├─ Check localStorage for gh_token
    ├─ If found: restore useAuthStore (load user + token)
    ├─ If not found: isAuthenticated = false
    │
    ▼
Check IndexedDB for 'searchIndex':
    ├─ If cached (< 1 hour): useSearchStore.load(cachedIndex)
    │   isIndexed = true (no blocking UI)
    │
    └─ If missing or stale:
        Show loading overlay: "Building search index..."
        │
        ▼
        Fetch all issues paginated from GitHub GraphQL
        (queries.allPrompts with pagination: first 100, then edges.cursor)
        │
        ├─ Show progress bar: "Loading prompts (1/5)... (2/5)... etc"
        │
        ├─ On each page: add to MiniSearch instance
        │
        ├─ Store progress in IndexedDB (resumable)
        │
        └─ On complete:
            Save full index to IndexedDB
            useSearchStore.isIndexed = true
            useSearchStore.lastIndexed = Date.now()
            Close loading overlay
            │
            ▼
        MiniSearch instance in-memory (available for ⌘K search)
    │
    ▼
Router: initial navigation to /browse
    │
    ├─ Fetch initial prompts (category=All, sort=recent, limit=25)
    ├─ usePromptsStore.filterState loaded from localStorage (persist filters)
    │
    ▼
S02 BrowseView mounts:
    ├─ Master list shows skeleton loader
    ├─ usePrompts(filterState) query fetches
    ├─ On success: populate master list
    ├─ If no selectedPromptId: show "Select a prompt" in detail panel
    │
    ▼
App is interactive
```

### Network Error Handling

```
TanStack Query fetch fails (network error, 5xx, etc.)
    │
    ▼
Check error.response?.status:
    │
    ├─ 401/403 → Authentication failed
    │   ├─ useAuthStore.logout()
    │   ├─ Redirect to /browse
    │   └─ Show toast: "Session expired. Please sign in."
    │
    ├─ 404 → Resource not found
    │   ├─ Detail panel shows: "Prompt not found"
    │   ├─ Toast: "This prompt has been deleted"
    │   └─ Auto-navigate to /browse
    │
    ├─ 429 → Rate limit exceeded
    │   ├─ Parse Retry-After header
    │   ├─ Show banner: "Rate limited. Retrying in 60s..."
    │   ├─ TanStack Query auto-retries after delay
    │   ├─ No user action needed
    │   └─ Button disabled during retry countdown
    │
    ├─ 5xx → Server error
    │   ├─ Show error toast: "Server error. Retrying..."
    │   ├─ TanStack Query retries with exponential backoff
    │   │  (100ms, 200ms, 400ms, max 30s)
    │   ├─ After 2 failed attempts: show persistent banner
    │   │  "Unable to load. Check connection or try again."
    │   │  [Retry] button
    │   └─ User can manually retry
    │
    └─ Network failure (no internet)
        ├─ Show offline banner: "You're offline"
        ├─ Show cached data if available (IndexedDB search, previous queries)
        ├─ Mutation attempts show: "Offline. Changes will sync when online."
        ├─ useOnline() from @vueuse/core watches navigator.onLine
        └─ On reconnect: auto-sync pending mutations
```

### Rate Limit Detection (GitHub 5000 req/hr)

```
GitHub API response: 403 with header X-RateLimit-Remaining: 0
    │
    ▼
Error handler detects rate limit:
    ├─ Parse X-RateLimit-Reset header (Unix timestamp)
    ├─ Calculate seconds until reset: reset - Date.now()/1000
    │
    ▼
Show banner in S01 navbar:
    "Rate limit exceeded. Resets in 42 minutes."
    [Dismiss]
    │
    ├─ Banner persists across navigation
    ├─ Dismiss button hides banner (reappear on page reload)
    │
    ▼
All queries paused (no new API calls)
    ├─ usePromptsStore show existing cached data
    ├─ Search uses local MiniSearch index
    ├─ Mutations disabled: "Cannot save while rate limited"
    │
    ▼
Timer counts down (optional, visual feedback)
    │
    ▼
On reset time reached:
    ├─ Auto-dismiss banner
    ├─ Resume queries + mutations
    └─ Toast: "Rate limit reset. Back to normal."
```

### Auth Expiry Flow

```
User token invalidated (revoked in GitHub settings, expired, etc.)
    │
    ▼
Next API call returns 401 Unauthorized
    │
    ▼
Error handler:
    ├─ Detect 401 status
    ├─ Call useAuthStore.logout()
    │   ├─ Clear token + user from state
    │   ├─ localStorage.clear()
    │   ├─ queryClient.clear() (all cached data cleared)
    │
    ├─ Navigate to /browse
    │
    ├─ Show toast: "Session expired. Please sign in again."
    │
    ▼
UI updates:
    ├─ Navbar shows "Sign in with GitHub" button
    ├─ All auth-gated features hidden
    ├─ Comments section shows "Sign in to comment"
    ├─ Reaction buttons show auth gate overlay
```

### Offline Support

```
useOnline() composable detects navigator.onLine = false
    │
    ▼
Show banner in S01: "You're offline"
    │
    ├─ Queries: Use stale cached data
    ├─ usePrompts with filterState: show last-known list
    ├─ usePromptDetail(id): show previously-loaded prompt
    │
    ├─ Mutations: Show warning
    │  "Cannot save while offline. Changes queued."
    │  Queue mutation in Pinia (or use localStorage queue)
    │
    ▼
User can still:
    ├─ Browse cached prompts
    ├─ View cached prompt details
    ├─ Read comments (cached)
    ├─ Search with local MiniSearch index (IndexedDB)
    │
    ▼
User cannot:
    ├─ Create/edit prompts
    ├─ React to prompts
    ├─ Post comments
    ├─ Admin actions
    │
    ▼
On reconnect (navigator.onLine = true):
    ├─ Dismiss offline banner
    ├─ Sync queued mutations
    │   For each queued mutation:
    │   - Retry API call
    │   - On success: remove from queue, show "Synced" toast
    │   - On failure: keep in queue, show "Sync failed. Retry?" toast
    │
    └─ Invalidate stale queries (refetch fresh data)
```

---

## 10. Notification Flow

### Architecture

**Source to Delivery Pipeline:**

```
GitHub Event (issue created, comment posted, etc.)
    │
    ▼
GitHub Webhook → Cloudflare Worker (webhook receiver)
    │
    ├─ Validate webhook signature (X-Hub-Signature-256)
    ├─ Extract event type, payload
    │
    ▼
Worker processes event:
    ├─ If event type = "issues.opened" (new prompt):
    │   └─ Store notification:
    │      - Type: "new_prompt_published"
    │      - Recipient: (N/A, global event)
    │
    ├─ If event type = "issue_comment.created":
    │   └─ Parse comment: is it a reply to user's prompt?
    │      ├─ YES: Store notification:
    │         - Type: "comment_on_prompt"
    │         - Recipient: prompt author
    │         - Data: {promptId, commentAuthor, snippet}
    │      └─ NO: ignore
    │
    ├─ If event type = "issues.edited" (vote count update via labels):
    │   └─ Check if votes crossed threshold (10, 50, 100):
    │      ├─ YES: Store notification:
    │         - Type: "votes_milestone"
    │         - Recipient: prompt author
    │         - Data: {promptId, voteCount}
    │      └─ NO: ignore
    │
    ▼
Store notification in Cloudflare KV:
    Key: "notifications:{userId}"
    Value: [
      {
        id: uuid,
        type: "comment_on_prompt",
        recipient: "octocat",
        timestamp: 1234567890,
        read: false,
        data: {promptId, commentAuthor, snippet}
      },
      ...
    ]
    │
    ├─ New notifications prepended (newest first)
    ├─ Retain last 100 notifications per user
    │
    ▼
KV TTL: 30 days (auto-expire old notifications)
```

### Client-Side Polling & Display

```
S01 AppLayout.vue mounted:
    │
    ▼
Initialize useNotifications() composable:
    ├─ Set up TanStack Query: queryKey = ['notifications']
    ├─ queryFn fetches from CF Worker /api/notifications endpoint
    ├─ staleTime: 60s (refresh every 60s)
    ├─ refetchInterval: 60000ms (auto-poll every 60s)
    │
    ▼
First poll: GET /api/notifications
    (CF Worker reads user's notification list from KV)
    │
    ├─ Backend: Check Authorization header (token)
    ├─ Backend: Fetch notifications:{userId} from KV
    ├─ Return: array of notifications (latest first)
    │
    ▼
Response: [
  {
    id: "abc123",
    type: "comment_on_prompt",
    promptId: 42,
    author: "alice",
    snippet: "Great prompt!",
    timestamp: 1710414300,
    read: false
  },
  ...
]
    │
    ▼
Navbar bell icon updates:
    ├─ Count unread: notifications.filter(n => !n.read).length
    ├─ Render badge: unreadCount
    ├─ Badge red if unreadCount > 0
    ├─ Bell icon animated pulse (optional)
    │
    ▼
Every 60s: auto-refetch notifications (TanStack Query refetchInterval)
    ├─ Poll continues in background
    ├─ Badge updates reactively
    └─ No UI blocking
```

### Notification Drawer (Bell Icon Click)

```
User clicks bell icon in navbar (S01)
    │
    ▼
useUIStore.notificationDrawerOpen = true
    │
    ▼
Sheet component slides in from right (shadcn)
    │
    ├─ Header: "Notifications"
    ├─ List of notifications:
    │   For each notification:
    │   ├─ Author avatar + name
    │   ├─ Notification text: "John commented on [prompt title]"
    │   ├─ Snippet preview (first 50 chars)
    │   ├─ Timestamp relative: "2 minutes ago"
    │   ├─ Unread indicator (blue dot if !read)
    │   │
    │   └─ onClick on item:
    │       - markAsRead(notification.id)
    │       - router.push('/prompts/' + notification.promptId)
    │       - Close drawer
    │
    ├─ "Mark all as read" button (optional)
    │
    └─ Empty state: "No notifications yet" (if none)
        │
        ▼
User clicks on specific notification:
    │
    ├─ Mutation: useMarkNotificationAsRead(notificationId)
    │   PATCH /api/notifications/:id
    │   with body: {read: true}
    │   (CF Worker updates KV)
    │
    ├─ Invalidate query: ['notifications']
    │   Refetch notifications list
    │
    ├─ Navigate: router.push('/prompts/' + notification.promptId)
    │
    └─ Close drawer
        │
        ▼
    S02 detail loads with notification prompt selected
    User can read full comment in comment thread
```

### Notification Types

| Type | Source | Recipient | Trigger | UI Display |
|------|--------|-----------|---------|------------|
| `comment_on_prompt` | Issue comment webhook | prompt author | User comments on your prompt | "Jane commented: '[snippet]'" + avatar |
| `vote_milestone` | Issue labels update | prompt author | Your prompt hits 10/50/100 votes | "Your prompt hit 100 votes! 🎉" |
| `new_feature` | Manual admin action | all users (optional) | New platform feature available | "New feature: X is now available" + link |

---

## 11. Data Prefetching Strategy

### Prefetch Triggers & Scope

**On List Item Hover (S02 Master List):**

```
User hovers over prompt row in master list (S02 left panel)
    │
    ▼
mouseenter event on prompt row:
    queryClient.prefetchQuery({
      queryKey: ['prompt', prompt.id],
      queryFn: () => fetchPromptDetail(prompt.id)
    })
    │
    ├─ If data already cached: no-op (cache hit)
    ├─ If data not cached: fetch silently in background (no UI blocking)
    │
    ▼
User clicks row shortly after:
    router.push('/prompts/:id')
    Detail panel mounts
    Data likely already in cache (appears instant)
```

**On Category Sidebar Click:**

```
User clicks "Image Generation" category in sidebar (S01)
    │
    ▼
Pinia update: filterState.category = 'Image Generation'
    │
    ▼
Prefetch first page of category:
    queryClient.prefetchQuery({
      queryKey: ['prompts', filterState],
      queryFn: () => fetchPrompts(filterState)
    })
    │
    ├─ Fetch paginated prompts with category filter
    ├─ First page (25 items) prefetched
    ├─ Background operation (non-blocking)
    │
    ▼
Master list updates when data ready
    (May be instant if prefetch completes before render)
```

**On /browse Mount (Initial Load):**

```
User navigates to /browse (or app cold starts at /)
    │
    ▼
BrowseView.vue mounted:
    │
    ├─ Restore filterState from localStorage
    │   (e.g., category='All', sort='recent')
    │
    ├─ Start initial query: usePrompts(filterState)
    │   Priority: render master list as soon as possible
    │
    ├─ Secondary: prefetchQuery for 2nd page (pagination)
    │   queryClient.prefetchQuery({
    │     queryKey: ['prompts', filterState, {page: 2}],
    │     ...
    │   })
    │
    └─ Tertiary (background, low priority):
        ├─ Prefetch usePromptStats() (for sidebar stats)
        ├─ Prefetch useAllLabels() (for filter dropdowns)
```

**On /prompts/new Mount (Editor):**

```
User navigates to /prompts/new (S03 Editor)
    │
    ▼
PromptEditorView.vue mounted:
    │
    ├─ Prefetch useAllLabels()
    │   (For category, model, difficulty dropdowns)
    │   queryClient.prefetchQuery({
    │     queryKey: ['allLabels'],
    │     queryFn: () => fetchAllLabels()
    │   })
    │
    └─ Prefetch useAllModels() (if separate query)
        queryClient.prefetchQuery({...})
        │
        ▼
    Dropdowns populate instantly when user clicks them
```

**On Link Hover (Anticipatory Prefetch):**

```
User hovers over prompt link in comment thread
    │
    ▼
mouseenter event on link:
    Extract promptId from href
    queryClient.prefetchQuery({
      queryKey: ['prompt', promptId],
      ...
    })
    │
    ▼
User clicks link:
    Detail likely cached already
```

### Stale-While-Revalidate Pattern

```
usePrompts hook with staleTime: 5 minutes

First call (cold):
    ├─ Cache miss
    ├─ Fetch data from GitHub GraphQL
    ├─ Store in cache + IndexedDB
    └─ Return data

Second call (within 5 min):
    ├─ Cache hit
    ├─ Return cached data immediately to UI
    ├─ Background: silently refetch from GitHub
    ├─ On refetch complete: update cache + UI (if changed)
    └─ User sees stale data → fresh data transition (imperceptible if no changes)

Third call (> 5 min old):
    ├─ Cache stale
    ├─ Trigger background refetch
    ├─ Show loading indicator if stale data unavailable
    ├─ Return stale data first, then updated data
    └─ Smooth user experience (no data loss, progressive refresh)
```

### Index Build & Refresh

```
App cold start: build MiniSearch index (§ 9)
    ├─ Fetch all issues paginated (expensive operation, once per session)
    ├─ Store in IndexedDB (persist across browser sessions)
    ├─ Load into memory (in-memory MiniSearch for ⌘K search)
    │
    ▼
Index stale check (background, 1-hour TTL):
    ├─ Check IndexedDB timestamp
    ├─ If > 1 hour old: trigger background rebuild
    │  queryClient.prefetchQuery({
    │    queryKey: ['searchIndex'],
    │    queryFn: buildSearchIndex
    │  })
    │
    ├─ No UI blocking (background operation)
    ├─ Old index still usable while new one builds
    ├─ Swap in-memory index when rebuild complete
    │
    ▼
User benefits: always-fresh search index without perceivable delay
```

---

## 12. Mobile Responsive Behavior

### Breakpoint: < 768px (iPad and smaller)

**S01 App Shell:**

```
Navbar: (unchanged)
    ├─ Logo clickable
    ├─ Search (⌘K still works)
    ├─ Notifications bell (same)
    ├─ Hamburger menu (new)
    │
    └─ Hamburger menu onClick:
        useUIStore.sidebarCollapsed = false (force open)
        Sidebar rendered as Sheet from left edge
        onClick overlay → close Sheet

Sidebar: (transformed to Sheet)
    ├─ Position: fixed, left: 0, top: 0
    ├─ Animation: slide in from left
    ├─ Width: 80vw (or min(80vw, 300px))
    ├─ Z-index: above content
    ├─ Overlay backdrop: tap to close
    └─ useSidebarCollapsed: false (forced open on mobile)
```

**S02 Browse (Master-Detail Split):**

```
Desktop (≥ 768px):
    ┌──────────────────────────────────┐
    │ Master List      │  Detail Panel  │
    │ (25 items)       │  (full prompt) │
    │ + scroll         │  + reactions   │
    │                  │  + comments    │
    └──────────────────────────────────┘

Mobile (< 768px):
    ┌────────────────────────────────┐
    │ Master List (full width)        │
    │ ┌──────────────────────────────┐│
    │ │ Prompt 1                      ││
    │ │ Prompt 2                      ││
    │ │ Prompt 3        ← click item  ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘
               │ click
               ▼
    ┌────────────────────────────────┐
    │ Detail Panel (full width)       │
    │ [← Back]                        │
    │ ┌──────────────────────────────┐│
    │ │ Full prompt content           ││
    │ │ + reactions, comments         ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

Behavior:
    ├─ Default: show master list
    ├─ User clicks prompt: detail panel appears (navigate, not show side-by-side)
    ├─ Back button visible in detail panel (navigates back to list)
    ├─ No split pane on mobile (single view at a time)
    └─ selectedPromptId still tracks, but nav is sequential not parallel
```

**S03 Editor:**

```
Desktop (≥ 768px):
    ┌──────────────────────────────────┐
    │ Editor (left 50%)  │  Preview (50%)│
    │ - Text input       │  - Rendered   │
    │ - Toolbar          │    markdown   │
    │ - Metadata fields  │  - Live sync  │
    └──────────────────────────────────┘

Mobile (< 768px):
    ┌────────────────────────────────┐
    │ [Write] [Preview] Tabs          │
    │ ┌──────────────────────────────┐│
    │ │ Editor Content              ││
    │ │ (showing Write tab)          ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

    User clicks [Preview] tab:
    ┌────────────────────────────────┐
    │ [Write] [Preview] Tabs          │
    │ ┌──────────────────────────────┐│
    │ │ Rendered Preview            ││
    │ │ (showing Preview tab)       ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

Behavior:
    ├─ Tabs at top: [Write], [Preview]
    ├─ Single panel below (not split)
    ├─ User toggles between input and output
    ├─ Metadata fields stack vertically
    ├─ Publish button full-width at bottom
    └─ Keyboard shortcuts still work (⌘S, ⌘Enter)
```

**S04 Version History:**

```
Desktop (≥ 768px):
    ┌────────────────────────────────┐
    │ Timeline (left 40%)  │ Diff (60%)│
    │ - Version list       │ - Side-by-│
    │ - [Restore] button   │   side diff│
    │ - Scroll list        │ - Highlight│
    │                      │   changes  │
    └────────────────────────────────┘

Mobile (< 768px):
    ┌────────────────────────────────┐
    │ [Timeline] [Diff] Tabs          │
    │ ┌──────────────────────────────┐│
    │ │ Timeline (list of versions)  ││
    │ │ - Version date               ││
    │ │ - [View Diff] link           ││
    │ │ - [Restore] button 🔒 auth   ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

    User clicks [View Diff]:
    ┌────────────────────────────────┐
    │ [Timeline] [Diff] Tabs          │
    │ ┌──────────────────────────────┐│
    │ │ Diff view (stacked)          ││
    │ │ - Old version on top          ││
    │ │ - New version below          ││
    │ │ - Highlighted changes        ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

Behavior:
    ├─ Tabs: [Timeline] [Diff]
    ├─ Single panel view
    ├─ Timeline lists versions
    ├─ Diff shows vertical stack (old above, new below)
    └─ [Restore] available from Timeline tab
```

**S05 Admin Panel:**

```
Desktop (≥ 768px):
    ┌────────────────────────────────┐
    │ [Stats] [Queue] [Labels]  Tabs │
    │ ┌──────────────────────────────┐│
    │ │ Stats Cards (grid)           ││
    │ │ - Total prompts              ││
    │ │ - Pending review             ││
    │ │ - Moderation queue           ││
    │ │ - API rate limit status      ││
    │ └──────────────────────────────┘│
    │                                  │
    │ Moderation Queue (table)        │
    │ - | Prompt | Author | Reason | │
    │   | ...    | ...    | ...    | │
    └────────────────────────────────┘

Mobile (< 768px):
    ┌────────────────────────────────┐
    │ [Stats] [Queue] [Labels]  Tabs │
    │ ┌──────────────────────────────┐│
    │ │ Stats (stacked cards)        ││
    │ │ ┌──────────────────────────┐ ││
    │ │ │ Total Prompts: 234       │ ││
    │ │ └──────────────────────────┘ ││
    │ │ ┌──────────────────────────┐ ││
    │ │ │ Pending Review: 5        │ ││
    │ │ └──────────────────────────┘ ││
    │ └──────────────────────────────┘│
    │                                  │
    │ Queue (card list, not table)   │
    │ ┌──────────────────────────────┐│
    │ │ Prompt Title                 ││
    │ │ by @author                   ││
    │ │ Reason: Spam                 ││
    │ │ [Approve] [Hide]             ││
    │ └──────────────────────────────┘│
    │ ┌──────────────────────────────┐│
    │ │ ...                          ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

Behavior:
    ├─ Stats: vertical card grid (not horizontal)
    ├─ Queue: card list (not table)
    ├─ Full-width buttons: [Approve] [Hide]
    ├─ Labels tab: category/model checkboxes stack vertically
    └─ Overflow: scrollable within each tab
```

**S06 User Profile:**

```
Desktop (≥ 768px):
    ┌────────────────────────────────┐
    │ [Submitted] [Saved] [Activity] │
    │ ┌──────────────────────────────┐│
    │ │ Prompt Grid (3 columns)      ││
    │ │ ┌───────┐ ┌───────┐ ┌──────┐││
    │ │ │Prompt │ │Prompt │ │Prompt│││
    │ │ └───────┘ └───────┘ └──────┘││
    │ │ ┌───────┐ ┌───────┐         ││
    │ │ │Prompt │ │Prompt │         ││
    │ │ └───────┘ └───────┘         ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

Mobile (< 768px):
    ┌────────────────────────────────┐
    │ [Submitted] [Saved] [Activity] │
    │ ┌──────────────────────────────┐│
    │ │ Prompt Grid (1 column)       ││
    │ │ ┌──────────────────────────┐ ││
    │ │ │ Prompt (full width)      │ ││
    │ │ └──────────────────────────┘ ││
    │ │ ┌──────────────────────────┐ ││
    │ │ │ Prompt (full width)      │ ││
    │ │ └──────────────────────────┘ ││
    │ │ ┌──────────────────────────┐ ││
    │ │ │ Prompt (full width)      │ ││
    │ │ └──────────────────────────┘ ││
    │ └──────────────────────────────┘│
    └────────────────────────────────┘

Behavior:
    ├─ Single column card list (full width)
    ├─ Stack vertically
    ├─ Each card shows: title, author, vote count, snippet
    ├─ Tap card → navigate to detail (S02)
    └─ Profile header fixed at top (avatar, username, bio)
```

### Touch & Mobile-Specific Interactions

```
Master List (S02):
    ├─ Swipe right on prompt row → (future feature) pin/save
    ├─ Swipe left on prompt row → (future feature) quick actions menu
    ├─ Tap to select (click on desktop)
    ├─ Long-press → context menu (copy link, etc.)
    │
    └─ Scroll behavior:
        Momentum scrolling (native browser)
        Scroll-to-top fab button (if scrolled > 200px)

Comments Section (S02 detail):
    ├─ Tap comment → highlight background (visual feedback)
    ├─ Long-press comment (author/maintainer) → delete option
    ├─ Reply functionality (future) via mention autocomplete
    │
    └─ Keyboard: dismiss on-screen keyboard after posting

Editor (S03):
    ├─ Viewport: maximize available height for text input
    ├─ Soft keyboard handling: adjust layout on keyboard show/hide
    ├─ Auto-focus on title input (S03 mounted on mobile)
    │
    └─ Toolbar: responsive icon buttons (not text labels on mobile)
```

### Sidebar Collapse on Mobile

```
Mobile (< 768px):
    ├─ Sidebar NOT visible by default
    ├─ Hamburger menu (≡) in navbar
    ├─ TapButton: uses Sheet component (bottom drawer or left slide)
    │
    └─ useSidebarCollapsed (forced false on mobile):
        Sidebar rendered as overlay Sheet
        NOT as a side column

Desktop (≥ 768px):
    ├─ Sidebar visible by default (left column)
    ├─ Toggle [ key to collapse/expand
    ├─ useSidebarCollapsed: true = collapsed, false = expanded
    │
    └─ Animated collapse: width animates from 250px → 60px
        (collapsed shows icons only)
```

---

## 13. Open Questions & Design Decisions

Unresolved items requiring team input before implementation:

### 1. Sidebar State Persistence

**Question:** Should the sidebar collapse state (expanded/collapsed) be remembered across sessions?

**Options:**
- A) Per-session only (localStorage, reset on new browser tab)
- B) Per-user account (stored in GitHub user metadata or separate service)
- C) Not persisted (reset to default every session)

**Implications:**
- Option A: Simpler, good UX for single-device users
- Option B: Better UX for multi-device users, requires backend storage
- Option C: Simplest, but friction for power users

**Current Assumption:** Option A (localStorage, session-based)

---

### 2. Forked Prompt Attribution

**Question:** Should forked prompts be explicitly linked back to their original?

**Options:**
- A) Add "Forked from [Original Title]" link in detail panel metadata
- B) Track fork chain in GitHub labels (e.g., `fork:original-id`)
- C) No visible link; only in YAML frontmatter for users who edit
- D) Both A and B (redundant but discoverable)

**Implications:**
- Option A: Discoverable for readers, easy to implement
- Option B: Queryable for analytics/trends (forks per prompt)
- Option C: Minimal UI clutter, but hidden from casual users
- Option D: Maximum discoverability, but added complexity

**Current Assumption:** Option A (visible link in detail metadata)

---

### 3. Prompt Deletion by Maintainers

**Question:** What happens when a maintainer deletes their own flagged prompt?

**Scenario:** Maintainer (also author) flags own prompt as spam, then tries to delete it.

**Options:**
- A) Allow deletion immediately (no approval needed)
- B) Require approval from another maintainer (prevents abuse)
- C) Prevent deletion of flagged prompts (force resolution)
- D) Allow deletion, but keep record in admin log (audit trail)

**Implications:**
- Option A: Fast, empowers maintainers, but audit trail missing
- Option B: Safer, prevents bad actors, but friction for legitimate use
- Option C: Forces review, but inflexible
- Option D: Balanced (best option)

**Current Assumption:** Option D (allow deletion + audit log)

---

### 4. Anonymous User Reaction Visibility

**Question:** Should unauthenticated users see reaction counts and vote numbers?

**Options:**
- A) Show counts but disable interactive buttons (read-only)
- B) Hide counts entirely until user signs in
- C) Show a sample/subset of reactions (e.g., "50+ 👍")
- D) Same as authenticated (no difference)

**Implications:**
- Option A: Encourages sign-in (shows engagement), but allows crawling vote counts
- Option B: Highest friction, but protects vote manipulation via crawling
- Option C: Balanced (show engagement without exact counts)
- Option D: Simplest implementation, no special logic

**Current Assumption:** Option A (show counts, disable buttons)

---

### 5. Draft Recovery on Route Change

**Question:** If user edits draft, navigates away, then returns, should draft auto-recover?

**Scenario:** User creates draft prompt, closes browser tab, reopens app, navigates to /prompts/new. Draft should appear.

**Options:**
- A) Auto-recover: load draft from localStorage on /prompts/new mount
- B) Manual recovery: show "Unsaved draft found. Restore?" button/toast
- C) No recovery: drafts lost on navigation away
- D) Recovery with versioning: multiple drafts, choose which to load

**Implications:**
- Option A: Best UX, but may confuse user (whose draft is this?)
- Option B: Safest, requires user confirmation
- Option C: Simplest, but bad UX (loss of work)
- Option D: Most powerful, but UI complexity

**Current Assumption:** Option A (auto-recover with toast notification)

---

### 6. Rate Limit Banner Dismissal

**Question:** When user is rate-limited, should the banner be dismissible or persistent?

**Scenario:** "Rate limit exceeded. Retries in 42 minutes." User taps [Dismiss].

**Options:**
- A) Dismissible (once dismissed, doesn't reappear until next rate limit)
- B) Persistent (always visible until rate limit resets)
- C) Auto-dismiss after 5 seconds (only transient notification)
- D) Never show (silently retry in background, only error toast on mutation attempt)

**Implications:**
- Option A: Less visual clutter, but user might forget they're rate-limited
- Option B: Constant reminder, prevents user mistakes
- Option C: Least intrusive, but easy to miss
- Option D: Cleaner UX, but only surfaces on interaction

**Current Assumption:** Option B (persistent until reset)

---

### 7. Comment Threading / Nested Replies

**Question:** Should the app support nested comment replies or only flat threads?

**Scenario:** User replies to another user's comment in the comment section.

**Options:**
- A) Flat threads only (all comments at same level, chronological)
- B) Threaded replies (nested under parent comment)
- C) Both (toggle between flat and threaded view)
- D) Not in v1 (flat only, implement threading in v2)

**Implications:**
- Option A: Simplest, works with GitHub Issues API (no special structure)
- Option B: Better UX for discussions, requires custom comment linking or emoji parsing
- Option C: Most flexible, but complex UI
- Option D: Pragmatic (ship v1 flat, iterate later)

**Current Assumption:** Option A (flat threads, GitHub Issues API native)

---

### 8. Search Index Refresh Strategy

**Question:** When should the global search index be rebuilt?

**Scenario:** New prompt published. Should it appear in ⌘K search immediately?

**Options:**
- A) Rebuild index immediately on every mutation (slow, high cost)
- B) Rebuild on 1-hour TTL schedule (background, lazy)
- C) Rebuild on user request (Manual [Refresh Index] button)
- D) Hybrid: rebuild on-demand if index is >30 min old, else use hourly

**Implications:**
- Option A: Always fresh, but expensive API calls, high latency on publish
- Option B: Cheaper, but new prompts don't appear in search for up to 1 hour
- Option C: User must remember to refresh, bad UX
- Option D: Balanced (fresh for real-time, cheap for long-tail)

**Current Assumption:** Option D (hybrid with 30-min soft refresh)

---

### 9. Multi-Language Support

**Question:** Should the app support non-English prompt languages from the start?

**Scenario:** User submits a prompt entirely in Spanish (title, content, labels).

**Options:**
- A) English-only v1 (filter/reject non-English prompts)
- B) Support all languages (no filtering, internationalize UI labels only)
- C) Language detection (label prompts with language tag, filter by language)
- D) Out of scope (not planned)

**Implications:**
- Option A: Simple, consistent, but excludes non-English users
- Option B: Inclusive, but complicates search/labeling, requires i18n
- Option C: Best of both worlds, but complex to implement (language detection library)
- Option D: Pragmatic for MVP

**Current Assumption:** Option D (not in v1, plan for v2)

---

### 10. Real-Time Collaboration (Shared Editing)

**Question:** Should multiple users be able to edit a prompt simultaneously (real-time sync)?

**Scenario:** Two maintainers editing the same prompt at the same time.

**Options:**
- A) Optimistic locking (last-write-wins, no conflict handling)
- B) Pessimistic locking (lock prompt while one user edits, other users wait)
- C) Operational transformation (real-time sync with conflict resolution)
- D) Not supported (sequential editing only, version history for conflict review)

**Implications:**
- Option A: Simplest, but can lose edits
- Option B: Safe, but bad UX (blocking)
- Option C: Best UX, but complex to implement (requires WebSocket, OT library)
- Option D: Pragmatic for MVP, sufficient with version history

**Current Assumption:** Option D (sequential editing, out of scope for v1)

---

## Summary

This document specifies all major screen flows, state transitions, and cross-screen interactions for Power Panel. Key architectural patterns:

- **Pinia stores** as source of truth for global UI state
- **TanStack Query** for server-side state and caching (stale-while-revalidate)
- **vue-router** for deep linking and back-button support
- **GitHub Issues API** (REST + GraphQL) as backend data store
- **Cloudflare Workers + KV** for auth popups, notifications, rate limit monitoring
- **MiniSearch + IndexedDB** for client-side full-text search (⌘K)
- **shadcn-vue + Tailwind** for responsive UI components

Developers should reference this document during:
1. Component implementation (follow routing specs)
2. State management (use specified Pinia stores and TanStack Query keys)
3. API integration (use correct GitHub endpoints)
4. Testing (derive test cases from transition tables)
5. Design reviews (verify new features align with existing flows)

All unresolved design decisions (§ 13) require team alignment before implementation begins.

