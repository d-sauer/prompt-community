# S06 — User Profile: Requirements

## 1. Overview
- **Screen ID:** S06
- **Route(s):** `/users/:username` (dynamic route, username is GitHub username)
- **Vue Component:** `UserProfileView.vue`
- **Access Level:** Read = all users (anonymous & authenticated); Edit controls (Edit Profile button) = own profile only
- **Purpose:** Public profile page showcasing a user's contributions to the AI Prompt Community. Displays submitted prompts, saved/bookmarked prompts (own profile only), and community activity. Serves as the user's public portfolio and social proof within the platform.

## 2. User Stories

1. **As an anonymous user,** I want to view another user's profile so that I can discover high-quality prompts submitted by that community member.
2. **As a community member,** I want to view my own profile so that I can see my contributions and engagement metrics.
3. **As a community member,** I want to save/bookmark prompts I find useful so that I can quickly access them later from my profile's Saved tab.
4. **As a community member,** I want to see my submission stats (total prompts, votes, comments) so that I can track my contribution impact.
5. **As a community member,** I want to view my recent activity (comments, votes) so that I can track my community engagement over time.
6. **As a community member,** I want to manage my GitHub profile information (bio, location, website) so that my profile accurately represents me.
7. **As a maintainer,** I want to visit a user's profile and view their contribution history so that I can identify community leaders or patterns of problematic behavior.
8. **As a new user,** I want to browse other users' profiles so that I can find examples of high-quality prompts and learn from experienced community members.

## 3. Functional Requirements

### FR-01: Profile Hero Section - Avatar, Name, Bio
Display user's GitHub avatar (80px circle, sourced from GitHub API `avatar_url`), display name (from GitHub `name`), and bio (from GitHub `bio` field). Avatar has fallback to initials if no GitHub avatar available. Bio text is optional; if blank, show placeholder "No bio yet" in gray. All fetched via `useUserProfile(username)` hook.

### FR-02: Profile Meta Information
Display user's location (from GitHub `location`), website link (from GitHub `blog`, opens in new tab with ↗ icon), and "Joined" date (from GitHub `created_at`, formatted as "Joined March 2024" using @vueuse/core `useTimeAgo` or similar). Location and website are optional fields; only display if non-empty in GitHub data.

### FR-03: Username & GitHub Link
Display GitHub username (e.g., "@alice_prompt_builder") as a clickable link with ↗ icon. Clicking opens user's GitHub profile in new tab (`https://github.com/:username`). Username is displayed below display name in smaller text, color: purple (#7c3aed).

### FR-04: Edit Profile Button (Own Profile Only)
Button visible only when authenticated user is viewing their own profile (compare `useAuthStore.user.login === route.params.username`). [Edit Profile] button opens GitHub profile edit page in new tab. Link: `https://github.com/settings/profile`. We do not manage profile editing ourselves; users edit via GitHub.

### FR-05: Stats Row - Clickable Metrics
Display row of 3–4 stat items: [N Prompts] [N Total Votes] [N Comments] (and [N Saved] on own profile only). Each stat is clickable and triggers tab switch to relevant section (e.g., clicking "24 Prompts" switches to Submitted tab). Stats are computed from GitHub data: prompts count = issues authored by user, total votes = sum of all reactions (👍, etc.) across all user's prompts, comments = count of user's comments on prompts. For own profile, show count of saved prompts from localStorage.

### FR-06: Tab Navigation (Submitted, Saved, Activity)
Implement shadcn-vue `Tabs` component with three tabs: "Submitted" (default), "Saved", "Activity". "Saved" tab is only visible on own profile (authenticated user viewing their own profile). Tab state is stored in component Vue reactive variable (not URL hash). Clicking different tabs updates the content below without page reload.

### FR-07: Submitted Tab - Prompt Grid (2 Columns Desktop)
Display user's submitted prompts in a responsive grid (2 columns on desktop, 1 column on mobile, 1 column on tablet). Each prompt card shows: title (clickable link to /prompts/:id), category+model tags (badges), description excerpt (2-line max, truncated with ellipsis), vote count (👍 icon + number), comment count (💬 icon + number), submission date (e.g., "2 days ago" via `useTimeAgo`). Fetch prompts via `useUserPrompts(username)` hook.

### FR-08: Submitted Tab - Sorting
Add sort toggle above grid: [Most Voted] / [Newest]. Default is Newest (most recent submissions first). Clicking toggle re-queries `useUserPrompts(username, { sort: 'votes' })` or `{ sort: 'date' }`. Grid re-renders with new sort order. Include label "Sort by: Newest" or similar.

### FR-09: Submitted Tab - Empty State
If user has no submitted prompts, display centered message: "🎉 [username] hasn't submitted any prompts yet" (for other users) or "🎉 You haven't submitted any prompts yet. [Submit your first prompt]" (for own profile, with CTA button linking to submit flow or /submit page).

### FR-10: Submitted Tab - Prompt Card Click Behavior
Clicking a prompt card (title, tags, or anywhere in the card except buttons) navigates to `/prompts/:issueId` where issueId is the GitHub issue number. Prompt detail view opens with full prompt content, comments thread, voting, and discussion.

### FR-11: Saved Tab - Own Profile Only
Display list/grid of prompts saved by the authenticated user. Saved prompts are stored in browser localStorage (via @vueuse/core `useLocalStorage('savedPrompts', [])`). Each card shows: title, author, description excerpt, [Remove from saved] button (red/danger color). Clicking a saved prompt card navigates to /prompts/:id. Clicking [Remove] removes the prompt ID from localStorage array and optimistically removes card from view.

### FR-12: Saved Tab - Save/Unsave from Submitted Prompt Cards
User can save a prompt directly from its card in the Submitted tab (or from prompt detail page). Implement a bookmark/star icon on each prompt card (optional visual in submitted tab, can be subtle). Clicking adds/removes the issue ID to/from localStorage `savedPrompts` array. Visual feedback shows bookmark status (filled vs. empty icon). Saved count in stats row updates when prompts are saved/unsaved.

### FR-13: Activity Tab - User Comments & Engagement
Display chronological list of user's activity: recent comments they've made on other users' prompts. Each activity item shows: action type icon (💬 comment, 👍 upvote), action text (e.g., "commented on [Prompt Title]"), excerpt of the comment (50 chars max, truncated), date (e.g., "2 hours ago"). Clicking activity item navigates to relevant prompt detail view (with comment highlighted/scrolled to). Fetch via `useUserActivity(username)` hook which queries GitHub search API for user's comments.

### FR-14: Activity Tab - Pagination
Activity list is paginated (20 items per page). "Load more" button or infinite scroll loads next page. Pagination state is component-level, not URL-based.

### FR-15: Activity Tab - Empty State
If user has no activity, display message: "No activity yet. [username] hasn't commented on any prompts." Include encouraging message to engage.

### FR-16: Responsive Design - Tablet (640px–1023px)
Prompt grid changes to single column. Avatar stays 80px. Stats row stacks vertically. Profile meta (location, website, joined) can wrap. Edit Profile button remains accessible. Font sizes adjusted for readability on smaller screens.

### FR-17: Responsive Design - Mobile (<640px)
Avatar remains 80px (center-aligned). Profile hero is single column, all text centered. Stats row displays inline (horizontal scroll if needed) or stacks to 2×2. Prompt grid is single column, cards are full-width with compact padding. Activity list items are compact (smaller font, minimal spacing). Tabs remain accessible via horizontal scroll or dropdown selector. Touch-friendly button sizes (minimum 48px).

### FR-18: Profile Loading State
When page first loads or username route param changes, show loading skeleton: placeholder avatar, skeleton text for name/bio, skeleton cards for prompts. Once data arrives from `useUserProfile` and `useUserPrompts`, replace skeleton with actual content. Loading spinner shown during data fetch.

### FR-19: Profile Not Found Error
If GitHub user does not exist (useUserProfile returns 404), display centered error state: "👤 User not found. Check the username and try again." with [Back to Browse] link. Do not crash or show raw error.

### FR-20: Keyboard Navigation & Accessibility
- `Tab` key navigates through all interactive elements (links, buttons, card links)
- `Enter` activates buttons and card links
- Links have visible focus indicators (outline or underline)
- Avatar and name are semantic (not divs styled as links)
- All stats numbers and labels use semantic HTML (no click handlers on divs; use button or anchor if clickable)
- Stat buttons have `aria-label` for screen readers: "View X submitted prompts"
- Tab buttons use `role="tab"`, `aria-selected`, `aria-controls` for accessibility
- Activity items linked to prompts have `aria-label` with full context

## 4. Component Inventory

| UI Element | shadcn-vue Component | Reka UI Primitive | Notes |
|---|---|---|---|
| Profile Avatar | Avatar / AvatarImage / AvatarFallback | img + span | 80px circle, fallback to initials |
| Profile Name (Display) | Text/Heading | h1 | 24px, font-weight: 700 |
| GitHub Username Link | Link (or anchor) | a | Opens GitHub profile in new tab |
| Bio Text | Text | p | Optional field, gray if empty |
| Edit Profile Button | Button | button | Own profile only, links to GitHub settings |
| Meta Info (Location, Website, Joined) | Text | span/p | Optional fields, display conditionally |
| Stats Row (Clickable Numbers) | Button (or interactive text) | button/span | 3–4 items, clickable to switch tabs |
| Tab Navigation | Tabs / TabsList / TabsTrigger / TabsContent | — | 3 tabs: Submitted, Saved, Activity |
| Prompt Card Grid | Grid (CSS Grid or Flexbox) | div + CSS Grid | 2 columns desktop, 1 mobile |
| Prompt Card | Card | article | Title link, tags, excerpt, stats, date |
| Card Tags/Badges | Badge | span | Category, model, difficulty labels |
| Sort Toggle | Button Group or Dropdown | button | Most Voted / Newest |
| Empty State | Div with centered content | div | Emoji + text + optional CTA button |
| Activity Item | Div | article | Icon, text, excerpt, date, link |
| Activity Pagination | Button ("Load more") | button | Standard pagination UI |
| Loading Skeleton | Skeleton (shadcn-vue) | div (CSS shimmer) | Avatar, text, card placeholders |
| Error State | Div with centered content | div | Not found message + back link |

## 5. State Management (Pinia)

### Reads from:
- **useAuthStore**: `user` (current logged-in user, if authenticated), `token`, `isAuthenticated`
- **useUIStore**: `theme` (dark/light mode), optional `sidebarCollapsed`

### Writes to:
- **usePromptsStore** (optional): No direct writes; filter state is not affected by profile page

### Local Component State:
- `activeTab` (Vue reactive string: 'submitted' | 'saved' | 'activity')
- `sortBy` (Vue reactive string: 'date' | 'votes', for Submitted tab)
- `activityPage` (Vue reactive number for pagination)
- **useLocalStorage**: `savedPrompts` (array of issue IDs the user has bookmarked)

## 6. API & Data (TanStack Vue Query)

| Hook | Type | GitHub API Call | Cache Key | staleTime |
|---|---|---|---|---|
| useUserProfile(username) | Query | `GET /users/:username` (REST) | `['user', username]` | 300s |
| useUserPrompts(username, { sort, page }) | Query | `GET /repos/:owner/:repo/issues?creator=:username&state=open` (REST with GraphQL option) | `['user', username, 'prompts', sort]` | 60s |
| useUserSavedPrompts() | Custom Hook | localStorage + cached issue details | `['user', 'saved']` | — |
| useUserActivity(username, page) | Query | GitHub search API `GET /search/issues?q=type:issue comments::username` or GraphQL timeline | `['user', username, 'activity', page]` | 120s |
| useSavePrompt(issueId) | Mutation | localStorage.setItem (client-side) | — | — |
| useUnsavePrompt(issueId) | Mutation | localStorage.removeItem (client-side) | — | — |

All queries use `@tanstack/vue-query` with automatic background refetching. Mutations for save/unsave are optimistic (instant localStorage update, no rollback needed since it's local).

## 7. Interaction Patterns

| Trigger | Action | Implementation |
|---|---|---|
| User navigates to /users/username | Load profile | Route watcher triggers useUserProfile(username) query |
| useUserProfile resolves | Display hero section | Avatar, name, bio, meta, stats render from fetched data |
| useUserPrompts resolves | Display Submitted tab | Prompt grid renders with pagination/sort controls |
| User clicks Submitted tab | Switch to submitted prompts | activeTab.value = 'submitted'; scroll to top |
| User clicks Saved tab (own profile) | Show saved prompts | activeTab.value = 'saved'; load savedPrompts from localStorage |
| User clicks Activity tab | Load & display activity | activeTab.value = 'activity'; fetch useUserActivity query |
| User clicks sort toggle | Re-sort prompts | sortBy.value = toggle; re-query useUserPrompts with new sort param |
| User clicks stat item (e.g., "24 Prompts") | Switch to corresponding tab | activeTab.value = 'submitted'; scroll to grid |
| User clicks prompt card title | Navigate to detail | router.push('/prompts/:issueId') |
| User clicks bookmark/star icon on card | Save prompt | savedPrompts.value.push(issueId); icon fills visually |
| User clicks [Remove from saved] on saved card | Unsave prompt | savedPrompts.value = savedPrompts.value.filter(id => id !== issueId); card removed from grid |
| User clicks username link (↗) | Open GitHub profile | window.open(`https://github.com/${username}`, '_blank') |
| User clicks [Edit Profile] button | Edit on GitHub | window.open(`https://github.com/settings/profile`, '_blank') |
| User scrolls to bottom of Activity list | Load next page | activityPage.value++; re-query useUserActivity(username, nextPage) |
| Page switches to Saved tab (not own profile) | Hide tab | Tab is removed from tab list (conditional render); user cannot access |

## 8. Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Tab` | Move focus between tabs, buttons, and prompt card links | Entire profile page |
| `Enter` / `Space` | Activate focused tab button or submit form | When focused on tab or button |
| `Shift + S` | Save/unsave focused prompt card (toggle) | When focus is on prompt card in Submitted tab |
| `Esc` | Close any open tooltips or menus | Profile page |

## 9. Responsive Behavior

**Desktop (≥1024px):**
- Profile hero: centered, max-width 900px
- Avatar: 80px
- Stats row: 3–4 items displayed inline (horizontal)
- Prompt grid: 2 columns, 350px per card
- Activity list: full-width list items
- Fonts: 24px name, 14px bio, 13px card titles

**Tablet (640px–1023px):**
- Profile hero: centered, max-width 100%
- Avatar: 80px (unchanged)
- Stats row: 2×2 grid or wrapped horizontal
- Prompt grid: 1 column, cards expand to full-width minus padding
- Activity list: single column, cards full-width
- Fonts: 20px name, 13px bio, 12px card titles
- Edit Profile button: full-width or standard button

**Mobile (<640px):**
- Profile hero: full-width, centered text
- Avatar: 64px (slightly smaller)
- Stats row: single row, horizontal scroll if needed, or 2 items per row
- Prompt grid: 1 column, cards full-width
- Activity list: compact layout, smaller fonts
- Card excerpt: 1 line max (more aggressive truncation)
- Buttons: 48px minimum height for touch targets
- Fonts: 18px name, 12px bio, 11px card titles

## 10. Accessibility (a11y)

- **Semantic HTML**: Use `<h1>` for profile name, `<h2>` for section titles (Submitted, Saved, Activity), `<article>` for prompt cards and activity items
- **ARIA Labels**: Tabs use `role="tab"`, `aria-selected`, `aria-controls`; stat buttons use `aria-label` ("View 24 submitted prompts")
- **Focus Indicators**: All interactive elements have visible focus states (outline or underline); no focus outline removed
- **Color Contrast**: Text meets WCAG AA standards (4.5:1 for body text, 3:1 for UI components)
- **Link Targets**: All links have descriptive text; no "click here" links; external links have ↗ icon or aria-label indicating new window
- **Keyboard Navigation**: Full navigation via Tab/Shift+Tab; all buttons activatable via Enter/Space; no keyboard traps
- **Loading States**: Loading skeleton has `aria-live="polite"` to announce to screen readers
- **Error States**: Error messages have `role="status"` and `aria-live="polite"`
- **Image Alt Text**: Avatar has alt text ("Avatar for [username]") or is marked as decorative if using initials fallback
- **Lists**: Activity list and prompt grid are semantic lists (`<ul>` with `<li>` or `<article>` elements)

## 11. Acceptance Criteria

### AC-01: Profile Hero Loads Correctly
When navigating to /users/alice_prompt_builder, the profile hero displays Alice's GitHub avatar (80px circle), display name, @username link (opens GitHub in new tab), bio, location, website, and "Joined March 2024" text. All data sourced from GitHub API via useUserProfile.

### AC-02: Edit Profile Button Shows Only on Own Profile
Button [Edit Profile] is visible when authenticated user alice visits /users/alice but NOT visible when another user visits /users/alice. Clicking button opens https://github.com/settings/profile in new tab.

### AC-03: Stats Row is Clickable
Stats row displays "24 Prompts | 156 Total Votes | 42 Comments". Clicking "24 Prompts" switches to Submitted tab and scrolls to top. Clicking "42 Comments" switches to Activity tab. Each stat is styled as clickable (cursor: pointer, hover underline).

### AC-04: Submitted Tab - Grid Display
Submitted tab shows 2-column grid of prompt cards on desktop. Each card displays title (clickable), category+model tags, vote count, comment count, submission date. Grid is sortable by [Most Voted] / [Newest] toggle. Clicking a card navigates to /prompts/:id.

### AC-05: Submitted Tab - Empty State
If user has no prompts, page displays centered message: "🎉 [username] hasn't submitted any prompts yet." On own profile, message includes CTA button [Submit your first prompt].

### AC-06: Saved Tab - Only Own Profile
Saved tab is visible and functional only when authenticated user is viewing their own profile. Tab is hidden for other users' profiles. Saved tab shows list of saved prompt cards with [Remove] button.

### AC-07: Save/Unsave Prompt
User can save a prompt from the Submitted tab (via bookmark icon) or from prompt detail page. Saved prompt ID is stored in localStorage. Saved count in stats row updates (+1 when saved, -1 when unsaved). Clicking [Remove from saved] removes prompt from Saved tab and localStorage.

### AC-08: Activity Tab - Display & Pagination
Activity tab shows chronological list of user's comments on prompts. Each item shows action icon, prompt title (link to /prompts/:id), comment excerpt, and date. "Load more" button or infinite scroll loads additional pages (20 items per page). Empty state if no activity.

### AC-09: Profile Data Refresh
When user route param changes (navigating from /users/alice to /users/bob), profile hero, prompts grid, and activity list are refreshed via new API queries. Old profile data is replaced with new user's data without page reload.

### AC-10: Profile Not Found Error
Navigating to /users/nonexistentuser displays centered error message: "👤 User not found. Check the username and try again." with [Back to Browse] link. No 404 page; graceful error handling.

### AC-11: Loading States
When page first loads, skeleton placeholders appear for avatar, name, and prompt cards. Once data loads, actual content replaces skeleton. User sees smooth loading experience, not blank page.

### AC-12: Mobile Responsiveness
On mobile (<640px), profile layout is single column. Avatar is 64px, name is 18px. Prompt grid is 1 column, full-width. Stats row wraps or scrolls horizontally. Tabs are accessible (dropdown or swipe). All buttons are 48px+ height. Text is readable without horizontal scroll.

### AC-13: Keyboard Navigation
User can Tab through profile, navigate between tabs using Tab/Shift+Tab, and activate buttons/links via Enter. Prompt card titles are focusable links. All interactive elements have visible focus indicators. No keyboard traps.

### AC-14: GitHub Links Open in New Tab
Clicking @username link opens https://github.com/username in new tab. Clicking [Edit Profile] button opens https://github.com/settings/profile in new tab. Both links have ↗ icon or aria-label indicating external navigation.

### AC-15: Sort Toggle Works
On Submitted tab, clicking [Most Voted] re-sorts prompts by vote count (descending). Clicking [Newest] re-sorts by date (newest first). Grid updates instantly without page reload. Currently active sort is visually highlighted.

## 12. Technical Notes

- **GitHub API Integration**: Use `@octokit/core` for REST calls (`GET /users/:username`, `GET /repos/:owner/:repo/issues?creator=:username`). For activity (comments), use GitHub search API or GraphQL for efficiency.
- **localStorage for Saved Prompts**: Use @vueuse/core `useLocalStorage()` for browser-side persistence. Data survives page refreshes. Max size ~5–10 MB per domain; validate against quota.
- **Performance**: Implement virtual scrolling (windowing) if activity list exceeds 100 items to avoid DOM bloat. Paginate prompts (20 per page) if user has >100 submissions.
- **Optimistic Updates**: Save/unsave actions are instant (optimistic update); no need for rollback since they're client-side localStorage writes.
- **Data Freshness**: Stats are re-fetched every 60–300 seconds (configurable). Activity is less critical; staleTime can be longer (120s).
- **SEO & Sharing**: Profile pages are publicly visible. Meta tags (title, description) should include username and prompt count for social sharing (e.g., "Alice's Prompt Community Profile — 24 prompts"). Use Vue-Meta or Vite meta plugin if SSR is planned.
- **Analytics**: Log profile visits and interactions (tab switches, prompt clicks, save/unsave) to understand user engagement patterns.
