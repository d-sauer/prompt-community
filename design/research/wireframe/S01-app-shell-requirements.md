# S01 — App Shell: Requirements

## 1. Overview
- **Screen ID:** S01
- **Route(s):** * (all routes; layout wrapper)
- **Vue Component:** AppLayout.vue
- **Access Level:** All users (anonymous and authenticated)
- **Purpose:** The persistent outer shell that frames every page in the application. Provides global navigation (navbar), collapsible sidebar with filter and sort controls, and the main router-view content area. All pages inherit this layout.

## 2. User Stories
- As an anonymous visitor, I want to see the top navigation and sidebar so I can browse prompts and understand the app structure.
- As a contributor, I want a +New Prompt button in the navbar so I can quickly create a new prompt.
- As a user, I want to search prompts globally using ⌘K so I can find specific content across the entire library.
- As a user, I want to collapse the sidebar to maximize content space when I need more screen real estate.
- As a maintainer, I want to see an Admin section in the sidebar with moderation tools and a badge showing pending items.
- As a user, I want to filter prompts by category, AI model, and sort order directly from the sidebar so I can customize the list without navigation.
- As a user, I want to receive notifications and see them in a drawer without leaving the current page.
- As an authenticated user, I want my avatar and profile menu in the navbar so I can access settings and sign out.

## 3. Functional Requirements

### FR-01: Navbar Layout and Styling
The navbar must be 48px tall, fixed at the top of the viewport, with dark background (#13131a) and 1px bottom border (#2a2a3a). Contains: logo/app name (left), search bar (center, flex-grow), notification bell (right), user avatar or sign-in button (right), and +New Prompt button (right, authenticated only). Use flexbox with gap-based spacing.

### FR-02: Logo and Home Link
The logo and app name "AI Prompt Community" must be clickable and navigate to `/browse`. Logo is a 24px square with purple background (#4c1d95). All users should see this; it does not require authentication.

### FR-03: Global Search Bar
A search input displaying placeholder "Search prompts... ⌘K" with a magnifying glass icon. Click or press ⌘K opens a Command palette (shadcn Command component) that displays real-time search results from MiniSearch 7 index. Search is client-side and does not call the API. Must support arrow navigation and Enter to select a result and navigate to `/prompts/:id`.

### FR-04: Notification Bell Icon
A 32px icon button in the navbar showing a bell emoji or icon with a red badge displaying unread notification count. Clicking opens a Sheet component (shadcn) that slides from the right, displaying a scrollable list of recent notifications. Badge count is pulled from `useUIStore.notificationCount` and updated in real-time (polling or WebSocket). Clicking a notification should navigate to the related prompt or profile.

### FR-05: User Avatar or Sign-In Button
If `useAuthStore.isAuthenticated` is true, display a circular avatar (32px) with the user's initials in purple (#4c1d95) and a 1px border (#7c3aed). Clicking opens a DropdownMenu (shadcn) with options: Profile, Settings, Sign Out. If not authenticated, display a "Sign in with GitHub" button or link that triggers `useAuthStore.login()`.

### FR-06: +New Prompt Button
A button labeled "+ New" with purple background and border, visible only if `useAuthStore.isAuthenticated` is true. Clicking navigates to `/prompts/new`. Must be positioned on the right side of the navbar, before or after the avatar. Hide with `v-if="isAuthenticated"` to prevent HTML rendering.

### FR-07: Sidebar Layout and Responsive Collapse
The sidebar is initially 200px wide with a right border (#2a2a3a). Clicking the collapse toggle button (or pressing [) toggles `useUIStore.sidebarCollapsed`, animating the width from 200px to 48px via CSS transition (duration 0.3s). In collapsed mode, only icons are visible; labels are hidden with `v-show` or `v-if`. Scrollable content within the sidebar (up to 600px in the wireframe).

### FR-08: Sidebar Section: BROWSE
A section labeled "BROWSE" with three items: "All Prompts" (active by default), "Trending", and "Recent". Clicking an item:
- Sets active visual state (background #1e1b4b, 3px left border #7c3aed, text #c4b5fd)
- Updates `usePromptsStore.filterState` appropriately (e.g., "Trending" might set a flag)
- Triggers a refetch of the prompts list via TanStack Vue Query
Each item displays a count badge on the right (e.g., "1.2K" for All Prompts).

### FR-09: Sidebar Section: CATEGORIES
A collapsible section labeled "CATEGORIES" with items: Coding, Writing, Analysis, Creative, System, Other. Each item has:
- A colored dot (8px circle, CSS background color specific to category)
- Item label
- Count badge on right
Clicking an item sets `usePromptsStore.filterState.category` to that value and triggers a query refetch. Only one category can be active at a time. A disclosure triangle icon indicates expand/collapse state. Section can be collapsed to hide all category items.

### FR-10: Sidebar Section: AI MODELS
A section labeled "AI MODELS" with items: GPT-4, Claude, Gemini, Llama, Other. Clicking an item sets `usePromptsStore.filterState.model` to that value and triggers a query refetch. Each item displays a count badge. Only one model can be active at a time (radio-button behavior). Can use `Collapsible` (shadcn) component.

### FR-11: Sidebar Section: SORT
A section labeled "SORT" with radio-button items: "Most Voted", "Newest", "Most Discussed". Clicking an item sets `usePromptsStore.sortOrder` to that value and triggers a query refetch. Only one sort option is active at a time. No count badges needed for this section.

### FR-12: Sidebar Section: ADMIN
A section labeled "ADMIN" visible only if `useAuthStore.isMaintainer` is true. Contains:
- "Moderation Queue" item with a badge count (number of pending moderation items)
- "Label Manager" item linking to `/admin`
Use red/warning styling (#ef4444 text accent) to visually distinguish admin area from user controls.

### FR-13: Sidebar Divider
A horizontal divider (1px border #2a2a3a) separating the main sections from the Admin section. Improves visual hierarchy.

### FR-14: Sidebar Version Badge
At the bottom of the sidebar, display the app version (e.g., "v0.8.2") in small, muted text. Updates when the app version changes; can be hardcoded or pulled from package.json at build time.

### FR-15: Sidebar Collapse Toggle
A button or icon (text "« Collapse" or icon-only ≡) at the top of the sidebar. Clicking toggles `useUIStore.sidebarCollapsed`. In icon-only mode (collapsed), show a tooltip on hover using `Tooltip` (shadcn). Keyboard shortcut [ also toggles this state.

### FR-16: Router View Content Area
A full-height, flex-grow container that renders the current page component via `<RouterView />`. Background is dark (#08080f). All page-specific content (BrowseView, PromptDetail, AdminPanel, etc.) is rendered here. This is the "main" area that changes based on route.

### FR-17: Keyboard Shortcut: Global Search
Pressing ⌘K (Cmd+K on Mac, Ctrl+K on Windows/Linux) or / opens the global search Command palette. Must work from any page. Implement via `@vueuse/core` `useEventListener('keydown')` hook. Prevent default browser behavior.

### FR-18: Keyboard Shortcut: Sidebar Toggle
Pressing [ toggles sidebar collapse/expand. Must work globally. Implement via useEventListener.

### FR-19: Keyboard Shortcut: Navigation (G then B)
Pressing G followed by B navigates to `/browse` (Go Browse). Implement via useEventListener with chord detection. Must not conflict with search input focus.

### FR-20: Keyboard Shortcut: New Prompt (G then N)
Pressing G followed by N navigates to `/prompts/new` if authenticated (Go New). If not authenticated, show a toast notifying the user to sign in first.

## 4. Component Inventory
| UI Element | shadcn-vue Component | Reka UI Primitive | Notes |
|---|---|---|---|
| Navbar container | — | — | Flexbox div, fixed positioning |
| Logo/Home link | `RouterLink` or `Button` | — | Link behavior to /browse |
| Search input + Command palette | `Command`, `Input` | — | shadcn Command for dropdown; MiniSearch 7 for indexing |
| Notification bell button | `Button` | — | Icon button with badge |
| Notification drawer | `Sheet` | `Sheet.Root`, `Sheet.Content` | Slides from right; overlay z-index 20 |
| User avatar | `Avatar` | `Avatar.Root`, `Avatar.Image`, `Avatar.Fallback` | Initials fallback; circular, purple theme |
| Avatar dropdown menu | `DropdownMenu` | `Menu.Root`, `Menu.Item` | Triggered by avatar click; options: Profile, Settings, Sign Out |
| +New Prompt button | `Button` | — | Purple variant; visible only if authenticated |
| Sidebar container | — | — | Fixed width 200px, collapsible to 48px |
| Sidebar collapse toggle | `Button` | — | Icon button (≡ or «); text on hover |
| Sidebar sections | `Collapsible` (optional) | `Collapsible.Root`, `Collapsible.Trigger` | For expand/collapse behavior (Categories, Models) |
| Sidebar items | — | — | Div-based, with active/hover states |
| Count badges | `Badge` | `Badge` | Right-aligned, small sizing |
| Category dots | — | — | Pure CSS circles; color per category |
| Dividers in sidebar | `Separator` | `Separator` | 1px border CSS alternative |
| Router view | `RouterView` | — | Vue Router component |
| Notification list | `ScrollArea` | `ScrollArea.Root`, `ScrollArea.Viewport` | Scrollable notification items |
| Notification items | — | — | Card-like divs with border |
| Tooltips (icon-only sidebar) | `Tooltip` | `Tooltip.Root`, `Tooltip.Content` | On hover of icon buttons in collapsed mode |

## 5. State Management (Pinia)

### Reads from:
- **useAuthStore**
  - `isAuthenticated` (boolean) — determines navbar auth state, +New button visibility
  - `isMaintainer` (boolean) — determines Admin section visibility in sidebar
  - `user.login` (string) — avatar initials display
  - `notificationCount` (number) — badge count on notification bell (may be in useUIStore instead)

- **useUIStore**
  - `sidebarCollapsed` (boolean) — sidebar width toggle state
  - `sidebarWidth` (number, pixels) — actual width for responsive calculation
  - `theme` (string) — if theme toggle exists, applied globally (future feature)
  - `notificationDrawerOpen` (boolean) — controls Sheet visibility

- **usePromptsStore**
  - `filterState.category` (string | null) — active category filter
  - `filterState.model` (string | null) — active model filter
  - `sortOrder` (string) — active sort option

- **useSearchStore**
  - `query` (string) — current search query text
  - `results` (array) — MiniSearch results, displayed in Command palette

### Writes to:
- **useUIStore**
  - `sidebarCollapsed` (toggle from collapse button or [ shortcut)
  - `notificationDrawerOpen` (toggle from notification bell click)

- **usePromptsStore**
  - `filterState.category` (set when sidebar category item is clicked)
  - `filterState.model` (set when sidebar model item is clicked)
  - `sortOrder` (set when sort option is clicked)

- **useSearchStore**
  - `query` (set when user types in search bar, updated in real-time)
  - `results` (updated by MiniSearch query)

- **useAuthStore**
  - `isAuthenticated`, `user`, `token` (set during GitHub OAuth login flow)

## 6. API & Data (TanStack Vue Query)

| Hook | Query/Mutation | GitHub API Call | Cache Key | staleTime |
|---|---|---|---|---|
| `usePromptsQuery(filters, sort)` | Query | GraphQL: fetch issues with labels, reactions, comments | `['prompts', filters, sort]` | 60000 (1 min) |
| `useNotificationsQuery()` | Query | GraphQL: fetch user notifications or activity feed | `['notifications']` | 30000 (30 sec) |
| `useUserQuery(username)` | Query | GraphQL: fetch user profile info | `['user', username]` | 300000 (5 min) |
| `useAuthTokenQuery()` | Query | Local; validates token in localStorage | `['auth', 'token']` | 0 (always refetch) |
| N/A (no mutations on AppLayout) | — | — | — | — |

**Note:** The AppLayout itself does not perform mutations (create, update, delete). It mainly reads filters and displays UI. Child components (BrowseView, PromptDetail) perform mutations.

## 7. Interaction Patterns

| Trigger | Action | Implementation |
|---|---|---|
| User clicks search bar or presses ⌘K | Open Command palette with MiniSearch results | `useEventListener('keydown')` hook detects ⌘K; emit event to open Command component; MiniSearch returns results on input change |
| User clicks sidebar category | Set active filter, update query | `@click="setFilter('category', value)"` → Pinia action → TanStack Vue Query watch re-fetches data |
| User clicks notification bell | Open/close notification drawer Sheet | `@click="notificationDrawerOpen = !notificationDrawerOpen"` → useUIStore update → conditional Sheet rendering |
| User clicks avatar | Open DropdownMenu with auth options | `@click="avatarMenuOpen = !avatarMenuOpen"` → DropdownMenu (shadcn) component manages open state |
| User clicks "Sign in with GitHub" | Trigger OAuth popup via CF Worker | `useAuthStore.login()` → opens popup → CF Worker handles GitHub OAuth → token saved to localStorage → `useAuthStore.isAuthenticated` becomes true |
| User clicks collapse button or presses [ | Toggle sidebar width and labels | `@click="sidebarCollapsed = !sidebarCollapsed"` → Pinia update → CSS transition animates width; v-show toggles labels |
| User navigates via router link | Update active state in sidebar | Watch `route.path` in AppLayout → match to sidebar item and set active class |
| User presses G then B | Navigate to /browse | `useEventListener` detects chord; call `router.push('/browse')` |
| User presses G then N | Navigate to /prompts/new (if authenticated) | Check `isAuthenticated` first; if false, show toast; else navigate |

## 8. Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| ⌘K or / | Open global search Command palette | Navbar search (global) |
| [ | Toggle sidebar collapse | Sidebar (global) |
| ↓ in Command palette | Next search result | Inside Command palette |
| ↑ in Command palette | Previous search result | Inside Command palette |
| Enter in Command palette | Navigate to selected prompt | Inside Command palette |
| Escape in Command palette | Close Command palette | Inside Command palette |
| G then B | Navigate to /browse | Global (except in inputs) |
| G then N | Navigate to /prompts/new | Global (except in inputs, if authenticated) |
| ? (future) | Show help modal with all shortcuts | Global (future feature) |

## 9. Responsive Behavior
- **Desktop (1024px+):** Sidebar visible at 200px width; navbar spans full width; search bar is full-featured.
- **Tablet (640px–1023px):** Sidebar defaults to collapsed (48px icon-only); user can expand temporarily. Search bar simplifies to icon-only; click opens Command palette.
- **Mobile (< 640px):** Sidebar is hidden by default; hamburger icon in navbar opens a permanent Sheet sidebar overlay (separate from the main layout). Navbar is condensed; search bar is icon-only. +New button moves to action sheet or bottom bar.

**Implementation:** Use `@vueuse/core` `useWindowSize()` and CSS media queries. Mobile sidebar can be a separate `Sheet` overlay, not a layout-integrated sidebar.

## 10. Accessibility (a11y)
- **ARIA Labels:** Navbar buttons (search, bell, avatar, +New) have `aria-label` describing their purpose.
- **Semantic HTML:** Navbar is `<nav>`, sidebar is `<aside>`, main content is `<main>` or `role="main"`.
- **Keyboard Navigation:** All interactive elements are keyboard-accessible; Tab order is logical (logo → search → bell → avatar → +New).
- **Color Contrast:** Text colors (#e2e8f0, #a78bfa, #c4b5fd) meet WCAG AA standard against dark backgrounds.
- **Focus Indicators:** Outline or border on focus state for all buttons and inputs (2px solid #7c3aed or outline #7c3aed).
- **Tooltips:** Icon-only collapsed sidebar items have `aria-label` or `Tooltip` component for screen reader support.
- **Notification Badge:** Uses `aria-label` to announce count (e.g., "3 unread notifications").
- **Dynamic Content:** Notification drawer updates are announced via `aria-live="polite"` region.

## 11. Acceptance Criteria

### AC-01: Navbar Renders and Is Sticky
The navbar must be visible at the top of every page, 48px tall, with background #13131a. It remains sticky (fixed position) when the page scrolls. Logo, search bar, bell, avatar/sign-in, and +New button are all visible and horizontally aligned.

### AC-02: Logo Links to /browse
Clicking the logo or app name navigates to `/browse`. This works from any page.

### AC-03: Search Bar Opens Command Palette
Clicking the search bar or pressing ⌘K opens a Command palette (shadcn Command component) with a list of prompts from MiniSearch. Results update in real-time as the user types. Selecting a result navigates to `/prompts/:id`.

### AC-04: Notification Bell Shows Count
The notification bell displays a red badge with the current unread notification count. The count updates in real-time (via polling or WebSocket). Clicking the bell opens a Sheet drawer sliding from the right showing a scrollable list of notifications.

### AC-05: Notification Drawer Lists Notifications
The notification drawer shows recent notifications (at least 5–10) with user avatars, action descriptions, and timestamps. Scrolling to the bottom loads more (infinite scroll). Clicking a notification navigates to the related prompt or user profile. Closing the drawer (via X button or Escape key) triggers `notificationDrawerOpen = false`.

### AC-06: User Avatar Displays Correctly
If authenticated, the avatar shows the user's initials (first letter of login) in purple (#4c1d95) with a border. The avatar is 32px and circular. Clicking opens a DropdownMenu with "Profile", "Settings", "Sign Out" options. If not authenticated, a "Sign in with GitHub" button or link is shown instead.

### AC-07: +New Button Visible Only When Authenticated
The "+New" button is only visible if `useAuthStore.isAuthenticated` is true. It is not rendered in the DOM if the user is not signed in. Clicking navigates to `/prompts/new`.

### AC-08: Sidebar Expands/Collapses Smoothly
Clicking the collapse toggle or pressing [ animates the sidebar width from 200px to 48px (or vice versa) over 0.3 seconds. Text labels fade or hide; icons remain visible. When collapsed, hovering over an icon shows a tooltip. No layout shift occurs; content area resizes appropriately.

### AC-09: Sidebar Sections Display Correctly
All sidebar sections (BROWSE, CATEGORIES, AI MODELS, SORT, ADMIN) are visible and styled correctly. Items have appropriate colors, dots, count badges, and hover/active states. Only the ADMIN section is shown to maintainers.

### AC-10: Category Filter Clicks Update State
Clicking a category item in the sidebar sets `usePromptsStore.filterState.category` to that value, highlights the item with active styling, and triggers a TanStack Vue Query refetch of prompts. Only one category is active at a time (radio-button behavior).

### AC-11: Model Filter Clicks Update State
Clicking a model item in the sidebar sets `usePromptsStore.filterState.model` to that value, highlights the item, and triggers a query refetch. Only one model is active at a time.

### AC-12: Sort Order Clicks Update State
Clicking a sort option in the sidebar sets `usePromptsStore.sortOrder` to that value, highlights the item, and triggers a query refetch with the new sort order applied.

### AC-13: Active Sidebar Items Highlight
The currently active sidebar item (matching the current filter or route) is highlighted with background #1e1b4b, 3px left border #7c3aed, and text color #c4b5fd. Only one item is active at a time within a section.

### AC-14: Global Keyboard Shortcuts Work
Pressing ⌘K (or /) opens search, pressing [ toggles sidebar, pressing G then B navigates to /browse, and pressing G then N navigates to /prompts/new (if authenticated). Shortcuts do not fire when focus is in a text input (search bar, comment composer, etc.). All shortcuts are non-blocking and prevent default behavior.

### AC-15: Responsive Layout on Mobile
On mobile (< 640px viewport), the sidebar is hidden by default. A hamburger icon in the navbar opens a Sheet overlay containing the sidebar. The navbar is condensed; search bar shows as icon-only. The +New button is accessible but may be repositioned. Layout is touch-friendly with adequate tap targets (44px+).

### AC-16: ADMIN Section Visible to Maintainers Only
The ADMIN section is only rendered if `useAuthStore.isMaintainer` is true. Non-maintainers do not see this section in the DOM. The section includes a "Moderation Queue" badge showing pending item count (fetched via query) and "Label Manager" link.

### AC-17: Router View Renders Current Page
The `<RouterView />` container renders the correct page component based on the current route. It occupies the full height and width of the remaining space (flex-grow: 1). Background is dark (#08080f).

### AC-18: Sidebar Version Badge Displays
At the bottom of the sidebar, the app version (e.g., "v0.8.2") is displayed in small, muted text. This can be pulled from package.json at build time via Vite import or hardcoded.
