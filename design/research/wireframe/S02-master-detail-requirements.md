# S02 — Master–Detail Split View: Requirements

## 1. Overview
- **Screen ID:** S02
- **Route(s):** /browse, /prompts/:id (routes can be in the same view or separate; detail panel updates when route changes)
- **Vue Component:** BrowseView.vue (contains PromptList.vue + ResizablePanelGroup + PromptDetail.vue)
- **Access Level:** Read = anonymous, Write actions = authenticated (reactions, comments, fork, etc.)
- **Purpose:** The primary working view for users to discover, filter, and interact with AI prompts. A horizontally resizable split pane: left panel (master) displays a filtered/sorted prompt list; right panel (detail) shows the full content of the selected prompt, including metadata, rendered markdown, reactions, and comments. The split position is resizable (240px–520px for master) and persisted to localStorage.

## 2. User Stories
- As an anonymous visitor, I want to browse a list of prompts and read their full content without signing in.
- As a contributor, I want to vote on prompts and comment on them to share my feedback and ideas.
- As a contributor, I want to fork a prompt to create my own version and modify it.
- As a user, I want to filter prompts by category and AI model to find exactly what I need.
- As a user, I want to search prompts in real-time within the current view to find specific keywords.
- As a user, I want to copy a prompt's text to my clipboard easily so I can use it in other tools.
- As a user, I want to see the version history of a prompt to understand how it has evolved.
- As a user, I want to share a prompt with others via a shareable link or social media.
- As a user, I want the split pane to stay resized to my preference across sessions.

## 3. Functional Requirements

### FR-01: Master Panel Layout
The master (left) panel displays a scrollable list of prompts. Default width: 320px. Minimum: 240px, Maximum: 520px. Resizable via a 4px drag handle on the right edge. Background: #13131a. Content area above the list is a toolbar (12px padding) with search input, active filter chips, and result count. The list below uses ScrollArea (shadcn) with optional virtualization (@tanstack/virtual) for performance with large lists.

### FR-02: Master Toolbar Search Input
A search input field with placeholder "Filter prompts..." and magnifying glass icon. Accepts typed input that filters the prompt list in real-time via MiniSearch 7 (client-side, no API). Updates `useSearchStore.query` on input change. Supports debounce (50–100ms) to prevent excessive filtering. Must have a clear button (×) that resets the query. Show result count (e.g., "42") next to or below the input.

### FR-03: Active Filter Chips
Below the search input, display removable chips for each active filter (e.g., "category: coding ×", "model: claude ×"). Clicking the × on a chip clears that specific filter, triggers a query refetch, and removes the chip. Multiple chips can be displayed. Chips styled with #1e1b4b background, #7c3aed border, #a78bfa text.

### FR-04: Result Count Display
Display the total count of prompts matching the current filters and search query (e.g., "42 prompts"). Updates in real-time as filters or search query changes. Uses data from `usePromptsQuery` response.

### FR-05: Prompt Row Layout
Each prompt row in the master list displays:
- Avatar (18px circle, author-specific color)
- Author name and timestamp ("alice 2d ago")
- Prompt title (bold, truncated to one line if needed)
- Tag chips (category, AI model, difficulty level — small badges)
- Vote count and comment count on the right ("👍 42" "💬 8")
All elements fit within the row height (~60–70px). Rows have consistent padding (10px vertical, 12px horizontal). Font sizes: title 13px, meta 11px.

### FR-06: Master Row Selection and Active State
Clicking a prompt row selects it and navigates to `/prompts/:id` (or updates `usePromptsStore.selectedPromptId`). The selected row is highlighted with background #1a1a2e and a 3px left border #7c3aed. Only one row is active at a time. Hover state on non-active rows is subtle background #1a1a2e without the border. Keyboard navigation (↑/↓) updates selection; Enter confirms.

### FR-07: Master List Scrolling and Infinite Load
The prompt list is scrollable within the master panel. Implement infinite scroll: when the user scrolls near the bottom (via `useIntersectionObserver`), automatically fetch the next page of prompts. Show a loading indicator (skeleton rows) while fetching. Disable infinite scroll if all results are loaded. Alternative: pagination buttons if preferred, but infinite scroll is recommended.

### FR-08: Master List Empty State
If the search query or filters result in zero prompts, display an empty state illustration (icon + message: "No prompts found") with a secondary message ("Clear filters to see results"). Include a button to clear all filters. Empty state uses full height of master panel and centers the content.

### FR-09: Master List Loading State
While prompts are loading (initial fetch or pagination), display 3–5 skeleton row placeholders with animated pulse effect. Skeleton rows have the same layout as real rows (avatar circle, lines for text). Do not show text content during loading.

### FR-10: Resize Handle
A 4px-wide vertical div positioned between the master panel and the resize handle. Default color: transparent. On hover, background changes to #7c3aed to indicate the draggable area. Cursor is `col-resize`. On drag, update the master panel width dynamically and store the position in `useUIStore.splitPanePosition` (in pixels). Persist to localStorage after drag ends. Supports both mouse drag and touch (mobile). Use shadcn `ResizablePanelGroup` component or custom implementation.

### FR-11: Detail Panel Layout
The detail (right) panel occupies the remaining space (flex-grow: 1). Background: #08080f. Contains a sticky header toolbar, a scrollable content area, and handles both selected-prompt and empty states. When no prompt is selected, shows empty state ("Select a prompt to view details"). When a prompt is selected, displays the prompt's full content.

### FR-12: Detail Header (Sticky)
A sticky header at the top of the detail panel (background #13131a, border-bottom #2a2a3a, padding 12px 20px, height ~40px). Displays the prompt title (truncated with ellipsis if longer than ~200px) and action buttons on the right: [Copy], [Fork], [History], [Share], and a ⋯ (more menu). All buttons are disabled or show "Sign in" tooltip if user is not authenticated (except [History] and [Share]). Sticky positioning (position: sticky; top: 0; z-index: 10) so the header remains visible while scrolling content below.

### FR-13: Detail Content Area
A ScrollArea container (shadcn) that renders the selected prompt's full content. Contains:
- Large title (22px, bold, #e2e8f0)
- Tag chips (category, model, difficulty — styled with borders and colors)
- Stats row (vote count, comment count, view count, timestamp)
- Rendered markdown body (markdown-it 14 library)
- Code blocks with syntax highlighting (shiki 4 library) and copy buttons
- Reactions bar (emoji toggle buttons)
- Comments section with comment list and composer
Padding: 20px on sides and top. Scrollable vertically within the panel.

### FR-14: Prompt Metadata (Title, Tags, Stats)
Display the prompt's full title, category/model/difficulty tags as colored chips, and stats (vote count, comment count, view count, timestamp). Stats use a simple layout with icons and numbers: "👍 42 votes | 💬 8 comments | 👁 234 views | 🕒 3 days ago". Stats are read-only; click is optional. Timestamp uses relative time (e.g., "3 days ago") via `useRelativeTime()` or similar hook.

### FR-15: Markdown Body Rendering
Render the prompt's main content (markdown text) using markdown-it 14. Support standard markdown syntax: headings, lists, bold/italic, links, blockquotes, and inline code. Code blocks must have syntax highlighting via shiki 4 (with language detection). Each code block displays a dark background (#12121e), border (#2a2a3a), padding (12px), monospace font, and a copy button (right-aligned, position absolute, top 6px, right 6px). Clicking copy button uses `useClipboard()` from @vueuse/core to copy the block's text to clipboard and shows brief feedback ("Copied!").

### FR-16: Reactions Bar
Below the prompt body, display a row of toggle buttons for common reactions: "👍 42", "❤️ 15", "🚀 8". Each button shows the emoji and the count. Clicking a button toggles the user's reaction (add/remove). Buttons that the user has reacted to have active styling (background #1e1b4b, border #7c3aed, text #a78bfa). Non-reacted buttons have muted styling. Use `useToggleReaction(promptId, emoji)` mutation for optimistic updates (update local state immediately, sync with API in background). Show toast on success or error.

### FR-17: Comments Section Header
A divider line above the comments section. Heading "Comments (N)" where N is the total comment count. This count updates dynamically as new comments are added.

### FR-18: Comments List
Display all comments on the prompt in chronological order (oldest first or newest first, TBD). Each comment displays:
- User avatar (32px circle)
- Author name (bold, color #c4b5fd)
- Timestamp (relative, e.g., "2d ago", color #64748b, font-size 11px)
- Comment body (rendered markdown, color #e2e8f0)
- Like count (♥ 3) with optional like button
Comments are fetched via `useCommentsQuery(promptId)` with pagination or infinite scroll. Comments have a background #13131a, border #2a2a3a, border-radius 4px, and padding 12px. Margin-bottom 16px between comments.

### FR-19: Comment Composer (Authenticated)
At the bottom of the comments section, display a comment input area for authenticated users:
- User's avatar (32px)
- Textarea placeholder "Share your thoughts..."
- Submit button
The textarea auto-grows to fit content (optional via autosize library or fixed height). Submit button is labeled "Submit" with purple styling (#4c1d95 background, #7c3aed border). Clicking Submit calls `useCreateComment(promptId, text)` mutation. On success, clear the textarea, add the comment to the list, and update the comment count. On error, show a toast. Submit button is disabled if the textarea is empty.

### FR-20: Comment Composer (Unauthenticated)
If the user is not authenticated, replace the comment composer with a CTA card: icon (🔒) + message "Sign in to react & comment" + "Sign in with GitHub" button. Clicking the button triggers `useAuthStore.login()`. This CTA also appears at the bottom of the reactions bar if user attempts to react while unauthenticated.

### FR-21: Detail Empty State
When no prompt is selected (initial view or after deselection), display a centered empty state in the detail panel: icon (📋) + message "Select a prompt to view details" + optional hint "Use ← arrow or click a prompt to start". Empty state uses color #64748b and is centered vertically and horizontally.

### FR-22: Detail Header Action Buttons
Implement the following action buttons in the detail header, visible when a prompt is selected:

**[Copy]** — Copies the full prompt text (markdown or plain) to the clipboard using `useClipboard()`. Shows "Copied!" toast feedback for 2 seconds. If user is unauthenticated, the button is still enabled (copying is a read-only action).

**[Fork]** — Opens a fork/duplicate dialog (or navigates to /prompts/new with pre-filled form). Creates a new draft prompt with the same content. Requires authentication; disabled and shows tooltip if not signed in.

**[History]** — Navigates to `/prompts/:id/versions` to show version history and allow rollback (future feature). Visible to all users (read-only). Does not require authentication.

**[Share]** — Opens a share modal or dropdown with options: copy link, share to Twitter, share to LinkedIn, etc. Pre-populates share text with prompt title and link. Visible to all; no auth required.

**[⋯ More]** — Opens a DropdownMenu with additional options: Edit (if owner), Pin (if maintainer), Report (if anon), Archive (if maintainer), etc. Edit navigates to `/prompts/:id/edit`.

### FR-23: Prompt Detail State Management
The detail panel reads from:
- `usePromptsStore.selectedPromptId` (ID of the currently selected prompt)
- `usePromptsStore.currentPrompt` (fetched prompt data)
- `useAuthStore.isAuthenticated` and `user.id` (for disabling certain actions)

The detail panel can also be triggered by the URL route `/prompts/:id`. When the route changes, update `usePromptsStore.selectedPromptId` and fetch the prompt data via TanStack Vue Query.

### FR-24: Scroll Behavior and View State
When a prompt is selected, scroll the detail panel to the top. When a prompt row is clicked in the master list, scroll that row into view (useScrollIntoView or similar). When the user scrolls down in the detail panel and clicks another row in the master list, scroll the detail panel back to the top.

### FR-25: Responsive Layout on Mobile/Tablet
- **Desktop (1024px+):** Full split pane visible; resize handle functional.
- **Tablet (640px–1023px):** Master panel defaults to ~280px; user can resize but may have less space. Optionally, hide master panel when detail is selected and show a back button.
- **Mobile (< 640px):** Stack panels vertically or show master-only initially with a full-screen detail overlay. Detail panel can be a slide-over or modal. Disable horizontal resize on mobile; use vertical stacking instead.

Implement responsive behavior via CSS media queries and conditional rendering in Vue.

### FR-26: Keyboard Navigation in Master List
Implement keyboard navigation for the master list:
- **↑ / ↓** — Move selection up/down in the visible prompt list.
- **Enter** — Confirm selection; scroll detail panel to top and focus it.
- **Escape** — Clear search query or deselect current prompt (toggle).
- **/** — Focus the master search input.
Prevent keyboard input when focus is in a textarea or input (except the search input).

### FR-27: Keyboard Shortcuts in Detail
- **C** — Copy the current prompt text to clipboard (same as [Copy] button).
- **N** — Navigate to /prompts/new (create new prompt; if unauthenticated, show toast).
- **Enter** (in comment textarea) — Submit comment (Shift+Enter for multiline).

### FR-28: Search Integration with Global Search
The master search input can be populated from the global Command palette (S01 global search). When a user searches globally and filters results to a prompt, clicking the result should navigate to /browse and select that prompt (if not already there), pre-populating the master search with the original query if desired.

## 4. Component Inventory
| UI Element | shadcn-vue Component | Reka UI Primitive | Notes |
|---|---|---|---|
| Master panel container | — | — | Flex div, fixed width with min/max constraints |
| Master search input | `Input` | `Input.Root` | With icon and clear button |
| Filter chips | `Badge` | `Badge` | Custom styling, removable |
| Result count | — | — | Text div |
| Prompt rows | — | — | Custom divs with hover/active states |
| Row avatar | `Avatar` | `Avatar.Root`, `Avatar.Fallback` | 18px, author initials |
| Row tags | `Badge` | `Badge` | Small size, inline |
| Master list ScrollArea | `ScrollArea` | `ScrollArea.Root`, `ScrollArea.Viewport` | Virtualized with @tanstack/virtual (optional) |
| Skeleton rows | — | — | Custom divs with pulse animation |
| Empty state | — | — | Icon + text + button |
| Resize handle | `ResizablePanelGroup` (shadcn) | — | 4px div, draggable |
| Detail panel container | — | — | Flex div, flex-grow: 1 |
| Detail header (sticky) | — | — | Flex div with position: sticky |
| Detail title | — | — | Large h2 or h3 |
| Detail tags | `Badge` | `Badge` | Full-size, colored |
| Detail stats | — | — | Icon + text, inline |
| Markdown body | — | — | Rendered via markdown-it 14 |
| Code block | — | — | Dark background, shiki syntax highlighting, copy button |
| Reactions bar | `Button` (toggle variant) | `Button` | Multiple toggle buttons with counts |
| Comments section | — | — | List of comment items |
| Comment item | `Avatar` | `Avatar` | Avatar + text body + metadata |
| Comment like button | `Button` | — | Optional, small |
| Comment composer textarea | `Textarea` | `Textarea.Root` | Auto-grow optional |
| Comment Submit button | `Button` | — | Purple variant |
| Comment composer CTA | — | — | Div with icon + text + button |
| Detail empty state | — | — | Icon + text, centered |
| Detail action buttons | `Button` | — | Copy, Fork, History, Share buttons |
| More menu | `DropdownMenu` | `Menu.Root`, `Menu.Item` | ⋯ button opens dropdown |

## 5. State Management (Pinia)

### Reads from:
- **usePromptsStore**
  - `selectedPromptId` (string | null) — ID of the currently selected prompt
  - `currentPrompt` (object) — full prompt data (title, body, tags, etc.)
  - `filterState.category`, `filterState.model` (strings | null) — active filters
  - `sortOrder` (string) — current sort order

- **useSearchStore**
  - `query` (string) — current search query in master search input
  - `results` (array) — filtered prompt list based on query and filters

- **useAuthStore**
  - `isAuthenticated` (boolean) — determines visibility of comment composer, reaction buttons
  - `user.id`, `user.login` (strings) — user info for avatar, comment composer
  - `user.reacted` (object | array) — tracks which reactions the user has made

- **useUIStore**
  - `splitPanePosition` (number, pixels) — stored width of master panel (persists to localStorage)

### Writes to:
- **usePromptsStore**
  - `selectedPromptId` (set when a row is clicked or route changes)
  - `currentPrompt` (set by TanStack Vue Query fetch)

- **useSearchStore**
  - `query` (set when master search input changes)
  - `results` (updated by MiniSearch filter)

- **useUIStore**
  - `splitPanePosition` (set on resize handle drag end)

## 6. API & Data (TanStack Vue Query)

| Hook | Query/Mutation | GitHub API Call | Cache Key | staleTime |
|---|---|---|---|---|
| `usePromptsQuery(filters, sort, page)` | Query | GraphQL: fetch paginated issues with labels, reactions, comment count | `['prompts', filters, sort, page]` | 60000 (1 min) |
| `usePromptDetailQuery(promptId)` | Query | GraphQL: fetch single issue with full content, reactions, user's reactions | `['prompt', promptId]` | 60000 (1 min) |
| `useCommentsQuery(promptId, page)` | Query | GraphQL: fetch comments on issue, paginated | `['comments', promptId, page]` | 30000 (30 sec) |
| `useToggleReactionMutation()` | Mutation | GraphQL: addReaction or removeReaction on issue | — | — |
| `useCreateCommentMutation()` | Mutation | GraphQL: createIssueComment | — | — |
| `useForkPromptMutation()` | Mutation | GraphQL: createIssue (copy of source issue) | — | — |
| `useClipboard()` | Utility (not query) | None; client-side | — | — |

## 7. Interaction Patterns

| Trigger | Action | Implementation |
|---|---|---|
| User types in master search input | Filter prompt list in real-time | Input `@input` handler updates `useSearchStore.query`; MiniSearch re-filters; `usePromptsQuery` watch refetches if using API filtering |
| User clicks filter chip's × | Remove that filter | Call filter removal action; update `usePromptsStore.filterState`; query refetch |
| User clicks prompt row | Select prompt and load detail | Update `selectedPromptId` in Pinia; navigate to `/prompts/:id` (if desired); scroll detail panel to top; fetch prompt detail via `usePromptDetailQuery` |
| User drags resize handle | Resize master panel width | Update `useUIStore.splitPanePosition` in real-time during drag; persist to localStorage on drag end |
| User clicks [Copy] button | Copy prompt text to clipboard | `useClipboard(currentPrompt.body).copy()`; show toast feedback |
| User clicks [Fork] button | Open fork dialog or navigate to /prompts/new | Navigate to `/prompts/new?fork=:id` or open dialog; pre-fill form with current prompt content |
| User clicks emoji button in reactions bar | Toggle reaction | Call `useToggleReactionMutation(promptId, emoji)`; optimistic update (update local state); sync with API |
| User clicks reply or comment textarea | Prepare to comment | Check `isAuthenticated`; if false, show auth CTA instead |
| User submits comment | Create new comment on prompt | Call `useCreateCommentMutation(promptId, text)`; on success, add comment to list and increment comment count; clear textarea; show toast |
| User clicks ↑ in master list | Navigate up one row | Update `selectedPromptId` to previous prompt in list; scroll row into view |
| User clicks ↓ in master list | Navigate down one row | Update `selectedPromptId` to next prompt in list; scroll row into view |

## 8. Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| ↑ | Select previous prompt in master list | Master list focus |
| ↓ | Select next prompt in master list | Master list focus |
| Enter | Confirm selection; focus detail panel | Master list focus |
| / | Focus master search input | Global (except in textareas) |
| Escape | Clear search or deselect prompt | Global |
| C | Copy current prompt text | Detail panel focus |
| N | Navigate to /prompts/new | Detail panel focus |
| Shift+Enter (in textarea) | Multiline in comment (depends on library) | Comment composer textarea |

## 9. Responsive Behavior
- **Desktop (1024px+):** Full side-by-side layout; master panel default 320px, resizable 240–520px; detail panel flex-grow; resize handle visible.
- **Tablet (640px–1023px):** Master panel 280px default (narrower); resize handle still available but may be less prominent. Alternatively, allow master panel to collapse/hide.
- **Mobile (< 640px):** Stack vertically or show master as bottom sheet / modal. Detail panel takes full width when prompt is selected; back arrow returns to master list. Disable horizontal resize; use vertical stacking or swipe-to-go-back.

Implement via CSS media queries and conditional component rendering in Vue.

## 10. Accessibility (a11y)
- **ARIA Labels:** All buttons (Copy, Fork, History, Share, reaction buttons) have `aria-label` describing their purpose.
- **Semantic HTML:** Master list is `<ul>` or role="listbox"; detail panel is `<article>`. Comments section is `<section>`.
- **Keyboard Navigation:** All interactive elements are keyboard-accessible. Tab order is logical. Arrow keys navigate rows (custom implementation). Escape key deselects.
- **Color Contrast:** Text meets WCAG AA standard against dark backgrounds.
- **Focus Indicators:** Visible focus state (outline or border) on all focusable elements.
- **Markdown Rendering:** Headings use proper `<h1>`, `<h2>`, etc.; lists use `<ul>` or `<ol>`.
- **Code Blocks:** Use `<pre>` and `<code>` with `lang` attribute for screen reader context.
- **Comments:** Each comment has `aria-label` for author and timestamp. Like buttons use `aria-pressed` for toggle state.
- **Live Regions:** New comments or reactions are announced via `aria-live="polite"` region.
- **Lazy Images:** Avatar images lazy-load if used; use native `loading="lazy"` attribute.

## 11. Acceptance Criteria

### AC-01: Master Panel Displays Prompt List
The master panel shows a list of prompts with all required fields visible: avatar, author, time, title, tags, vote count, comment count. At least 4–5 prompts are visible at once (depending on row height). List scrolls smoothly without layout shift.

### AC-02: Master Search Filters in Real-Time
Typing in the master search input filters the prompt list in real-time via MiniSearch. No API calls. Results update within 100ms of input change. Clear button (×) resets the search.

### AC-03: Filter Chips Display and Remove
Active filter chips (e.g., "category: coding") display below the search input. Clicking the × on a chip removes that filter and triggers a query refetch. Chips update dynamically as filters change.

### AC-04: Prompt Row Click Selects and Navigates
Clicking a prompt row highlights it (background #1a1a2e, left border #7c3aed), updates `selectedPromptId`, navigates to `/prompts/:id` (if using routes), and loads the detail panel. Only one row is active at a time.

### AC-05: Resize Handle is Draggable
The 4px resize handle between panels changes color to #7c3aed on hover. Dragging left/right resizes the master panel between 240px and 520px. The detail panel resizes to accommodate. On drag end, the new position is persisted to localStorage via `useUIStore.splitPanePosition`.

### AC-06: Detail Header is Sticky
The detail header remains visible at the top of the detail panel when scrolling the content below. It displays the prompt title (truncated) and action buttons ([Copy], [Fork], [History], [Share], [⋯]).

### AC-07: Detail Content Renders Correctly
The prompt title, tags, stats, and markdown body render correctly. Code blocks have syntax highlighting, copy buttons work, and all text is readable. Markdown links are clickable. Lists and headings are properly formatted.

### AC-08: Copy Button Works
Clicking the [Copy] button in the detail header copies the full prompt text to the clipboard. A "Copied!" toast appears for 2 seconds. Works for both authenticated and unauthenticated users.

### AC-09: Fork Button Opens Dialog or Form
Clicking the [Fork] button opens a dialog or navigates to /prompts/new with the current prompt's text pre-filled. Requires authentication; disabled if not signed in.

### AC-10: Reactions Toggle Correctly
Clicking a reaction emoji button (👍, ❤️, 🚀) toggles the user's reaction. Active reactions have highlighted styling. Count updates immediately (optimistic update). API syncs in background. Clicking again removes the reaction. Unauthenticated users see an auth CTA instead.

### AC-11: Comments Load and Display
All comments on the prompt display in the comments section with author avatars, names, timestamps, and text. Comments are scrollable (infinite scroll or pagination). Comment count in the header matches the number of visible comments plus any not yet loaded.

### AC-12: Comment Composer is Visible and Functional (Authenticated)
For authenticated users, a comment composer (avatar + textarea + Submit button) appears at the bottom of the comments section. Typing in the textarea updates the local state. Clicking Submit creates the comment via mutation. On success, the new comment appears in the list, the textarea clears, and the comment count increments. Submit button is disabled if textarea is empty.

### AC-13: Comment Composer Shows Auth CTA (Unauthenticated)
For unauthenticated users, the comment composer is replaced with a CTA: icon + "Sign in to react & comment" + "Sign in with GitHub" button. Clicking the button triggers OAuth login.

### AC-14: Detail Empty State Displays
When no prompt is selected, the detail panel shows a centered empty state with icon and message. Once a prompt is selected, the empty state is replaced with the prompt content.

### AC-15: Master List Keyboard Navigation Works
Pressing ↑ or ↓ navigates the master list selection up/down. Pressing Enter confirms the selection and focuses the detail panel. Pressing / focuses the master search input. Pressing Escape clears the search or deselects the current prompt.

### AC-16: Detail Panel Copy, Fork, History, Share Buttons Work
[Copy] copies to clipboard with toast feedback. [Fork] navigates to /prompts/new with pre-filled content (or opens dialog). [History] navigates to /prompts/:id/versions (if implemented). [Share] opens a share menu or popover. [⋯] opens a dropdown menu with Edit, Report, etc. (context-dependent).

### AC-17: Responsive Layout on Mobile
On mobile (< 640px), the layout adapts: master and detail panels may stack vertically, or one panel may be hidden/modal. Resize handle is hidden or disabled. Back button allows returning from detail to master list. Tap targets are adequate (44px+). Touch interactions work smoothly.

### AC-18: Split Position Persists Across Sessions
After resizing the split pane, refreshing the page or navigating away and returning shows the same split position. Position is stored in localStorage via `useUIStore.splitPanePosition`.

### AC-19: Infinite Scroll in Master List Works
As the user scrolls toward the bottom of the master list, new prompts are automatically fetched and appended. Loading indicator (skeleton rows) appears during fetch. If all results are loaded, infinite scroll stops.

### AC-20: Code Block Copy Button Works
Clicking the copy button on a code block copies the block's code to the clipboard with visual feedback ("Copied!"). Works for all code blocks in the prompt body.

### AC-21: Markdown Links are Clickable
Links in the rendered markdown body (`[text](url)`) are clickable and open in a new tab or navigate appropriately. External links open with `target="_blank"` and `rel="noopener noreferrer"`.

### AC-22: Tag Filtering Optional
Clicking a tag chip (category, model, difficulty) in the prompt detail view optionally filters the master list to that tag. This is optional but recommended for discoverability.

### AC-23: Timestamp Display is Relative
All timestamps (on prompt rows, in comments, in stats) display in relative format (e.g., "2d ago", "3 hours ago") using a hook like `useRelativeTime()` or similar. Timestamps update in real-time if needed, or refresh on page reload.

### AC-24: Error Handling for Failed Actions
If a mutation fails (reaction, comment, fork), a toast notification shows the error message. The UI reverts to the pre-action state (optimistic update rollback). Users can retry the action.
