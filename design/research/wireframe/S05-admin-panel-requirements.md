# S05 — Admin / Moderation Panel: Requirements

## 1. Overview
- **Screen ID:** S05
- **Route(s):** `/admin` (with hash-based tabs: `#queue`, `#labels`, `#log`, `#featured`)
- **Vue Component:** `AdminView.vue`
- **Access Level:** Maintainer only (identified via GitHub collaborators endpoint `/repos/:owner/:repo/collaborators`; non-maintainers are redirected to `/browse` with error toast)
- **Purpose:** Provides a dedicated moderation workspace for repository maintainers. Displays repository statistics, manages a queue of flagged prompts with quick-action buttons, allows label administration, shows moderation history, and manages featured prompts list.

## 2. User Stories

1. **As a maintainer,** I want to view all flagged prompts in a single queue so that I can quickly identify and act on community reports.
2. **As a maintainer,** I want to approve flagged prompts (removing the flag) so that legitimate content doesn't remain hidden from the community.
3. **As a maintainer,** I want to hide inappropriate prompts and close them so that harmful content doesn't appear in search results or browse.
4. **As a maintainer,** I want to permanently delete a prompt by closing its issue so that spam and abusive content are completely removed.
5. **As a maintainer,** I want to manage repository labels (add, edit, delete) so that categorization taxonomy remains clean and organized.
6. **As a maintainer,** I want to view a moderation log of all actions (flag removals, deletions, label changes) so that I can audit and track governance decisions.
7. **As a maintainer,** I want to mark prompts as featured so that high-quality content is promoted to all users.
8. **As a maintainer,** I want to bulk-approve or bulk-hide multiple flagged prompts so that I can handle large report backlogs efficiently.

## 3. Functional Requirements

### FR-01: Access Control & Authorization
Non-maintainer users accessing `/admin` are immediately redirected to `/browse` and shown an error toast ("Access Denied: Only maintainers can view this page"). Maintainer status is checked via `useAuthStore.isMaintainer` (set on app init by querying `/repos/:owner/:repo/collaborators/:username`).

### FR-02: Statistics Overview Bar
Display four stat cards in a horizontal row (responsive to 2×2 grid on mobile). Cards show: Total Prompts (count of all open issues), Open/Active (count of open issues), Flagged (count of issues with `state:flagged` label, displayed in red if > 0), Featured (count of issues with `state:featured` label). Each card is a `Card` component from shadcn-vue. Total Prompts and Flagged cards are clickable links to `/admin#queue`.

### FR-03: Tab Navigation System
Implement shadcn-vue `Tabs` component with four tabs: "Moderation Queue" (default), "Label Manager", "Moderation Log", "Featured Prompts". Tab selection updates URL hash (`#queue`, `#labels`, `#log`, `#featured`). On page load, hash is parsed and correct tab is activated. Users can deep-link to tabs.

### FR-04: Moderation Queue Tab - Flagged Prompts Table
Display all issues with `state:flagged` label in a DataTable with columns: checkbox (bulk select), title (link to issue detail view `/prompts/:id`), author avatar + name, date flagged, flag reason (shows label badges), actions (View, Approve, Hide, Delete buttons). Table is sortable by date (newest first, default) and searchable by title. Empty state shows "🎉 No flagged prompts" message in green.

### FR-05: Moderation Queue - Approve Action
[Approve] button removes `state:flagged` label from the issue via `useRemoveLabelFromIssue(issueId, 'state:flagged')`. Optimistic UI removes row from table immediately. If mutation succeeds, row stays gone. If mutation fails, row re-appears and error toast shows failure reason. Row is styled with green button color.

### FR-06: Moderation Queue - Hide Action
[Hide] button adds `state:hidden` label and closes the issue. Implemented as two API calls: `useAddLabelToIssue(issueId, 'state:hidden')` then `useCloseIssue(issueId)`. Optimistic UI removes row. On success, toast confirms "Prompt hidden & closed". Yellow button color. Hidden prompts do not appear in `/browse` view.

### FR-07: Moderation Queue - Delete Action
[Delete] button closes the issue permanently via `useCloseIssue(issueId)`. Optimistic UI removes row. On success, toast confirms "Prompt deleted". Red button color. Closed issues do not appear in any user-facing browse view.

### FR-08: Moderation Queue - Bulk Actions
When user checks ≥1 row checkbox, a bulk action bar slides up from bottom of screen with [Bulk Approve] and [Bulk Hide] buttons. Bulk Approve removes `state:flagged` from all selected rows in parallel (`Promise.all()`). Bulk Hide adds `state:hidden` and closes all selected rows. On completion, bulk bar disappears and selection is cleared. Buttons are disabled during request.

### FR-09: Label Manager Tab - Display Existing Labels
Show all repository labels in a grid layout (3 columns on desktop, 1 on mobile). Each label card displays: color swatch (24px circle, color from GitHub label), label name, category type badge (category:/model:/difficulty:/state:/custom), prompt count (number of issues with this label), [Edit] and [Delete] buttons. Label cards are color-coded by prefix: category=purple (#7c3aed), model=blue (#3b82f6), difficulty=green (#22c55e), state=orange (#f59e0b).

### FR-10: Label Manager Tab - Add New Label Form
Inline form (not modal) with fields: color picker (color input HTML element with preset swatches), name input (text, with real-time uniqueness validation), type selector (dropdown: category | model | difficulty | state | custom). [Add Label] button submits to `POST /repos/:owner/:repo/labels` via Octokit. On success, new label card appears instantly in grid and form inputs are cleared. On error, toast shows error. Validation: label name must be unique (check existing labels), must follow prefix naming convention (e.g., if type="model", auto-prepend "model:").

### FR-11: Label Manager Tab - Edit Label
[Edit] button on label card opens an edit form (inline or modal). User can change color, name, and type. [Save] button calls GitHub REST PATCH endpoint to update label. On success, card updates instantly. On error, toast shows error and form closes.

### FR-12: Label Manager Tab - Delete Label
[Delete] button on label card shows a confirmation popover ("Remove this label from X prompts?"). [Confirm] button calls `DELETE /repos/:owner/:repo/labels/:label_name`. On success, label card disappears. On error, toast shows error. If label is used by issues, GitHub API returns a conflict; handle gracefully with appropriate error message.

### FR-13: Moderation Log Tab
Display a table with columns: Action (text: "Flagged", "Unflagged", "Closed", "Reopened", etc.), Target Prompt (title, link to detail), Performed By (username, link to GitHub profile), Date (human-readable, e.g., "2 hours ago"), Outcome (badge showing status). Fetch from GitHub issue events API (search `/repos/:owner/:repo/issues/events` or use GraphQL `issueTimeline`). Support filtering by: action type (multiselect dropdown), date range (date picker start/end). Paginated (20 items per page). Sort by date descending (newest first).

### FR-14: Featured Prompts Tab
Display all issues with `state:featured` label in a grid or list. Each item shows: title, category+model tags, description excerpt, [Remove from Featured] button. Below the list, show a search interface: search input to find prompts by title, results dropdown, [Add to Featured] button next to each result. Clicking [Add to Featured] calls `useAddLabelToIssue(resultIssueId, 'state:featured')` and result appears in featured list above. On error, toast shows error. Empty state: "No featured prompts yet. Search and add one below."

### FR-15: Real-time Data Refresh
After any moderation action (approve, hide, delete, label add/remove), refetch the affected data (via `@tanstack/vue-query` invalidate queries). Queue table and stats bar update automatically. No manual refresh needed.

### FR-16: Error Handling & Toasts
All API mutations show a loading state (button disabled, spinner). On success, show confirmation toast (color: green, dismiss after 3s). On error, show error toast (color: red, auto-dismiss after 5s or user closes). Error messages are human-readable and suggest remediation (e.g., "Label already exists. Choose a different name.").

### FR-17: Responsive Design
On mobile (< 640px): stats bar stacks vertically, table collapses to card view (title + actions, hide non-essential columns), sidebar is hidden or replaced by hamburger menu. Tabs remain accessible via dropdown or swipe.

### FR-18: Keyboard Shortcuts (Optional but Recommended)
- `Shift+A`: Approve currently selected row (if table focused)
- `Shift+H`: Hide currently selected row
- `Shift+D`: Delete currently selected row
- `Esc`: Deselect all checked rows, close modals
- `Cmd/Ctrl + K`: Open global command palette to navigate to tabs or actions

## 4. Component Inventory

| UI Element | shadcn-vue Component | Reka UI Primitive | Notes |
|---|---|---|---|
| Stat Cards | Card | div + Grid | Four metric cards with value + label |
| Tab Navigation | Tabs / TabsList / TabsTrigger / TabsContent | — | Hash-based tab routing |
| Flagged Prompts Table | DataTable (or Table + Sorting UI) | Table | Sortable, searchable, selectable rows |
| Checkbox (Bulk Select) | Checkbox | input[type=checkbox] | Per-row and header select-all |
| Buttons (Approve, Hide, Delete) | Button | button | Color variants: primary, green, yellow, red |
| Label Card Grid | Card | div + Grid | Label name, color swatch, type badge, counts |
| Label Color Picker | Input[type=color] + Popover for presets | input[type=color] | 8-12 preset color swatches |
| Label Type Selector | Select / SelectContent / SelectItem | select | category, model, difficulty, state, custom |
| Bulk Action Bar | Button + Popover | div (fixed bottom) | Appears on row selection, slide-up animation |
| Search Input | Input | input[type=text] | Filter by title/author in queues |
| Confirmation Popover | Popover / PopoverContent / PopoverTrigger | div (position: absolute) | "Are you sure?" dialogs for destructive actions |
| Toast Notifications | Sonner (or custom Toast component) | — | Error, success, info messages |
| Date Range Picker | DatePickerRange (shadcn-vue) or custom | input[type=date] | For moderation log filtering |
| Avatar | Avatar / AvatarImage / AvatarFallback | img | Author avatars (GitHub avatar_url) |
| Badge | Badge | span | Category type, label status, outcome badges |
| Spinner / Loading State | — (use opacity + disabled attr) | div (spinner SVG) | Show during mutation requests |

## 5. State Management (Pinia)

### Reads from:
- **useAuthStore**: `user` (GitHub user object), `token` (GitHub API token), `isAuthenticated`, `isMaintainer` (boolean, pre-computed on login)
- **useUIStore**: `theme` (dark/light), `sidebarCollapsed` (for responsive sidebar toggle)

### Writes to:
- **usePromptsStore** (optional): `filterState` may be updated to reflect current admin view filters (e.g., `{ flagged: true }`)

### No store writes for admin-specific state; use Vue reactive variables or @tanstack/vue-query for cache.

## 6. API & Data (TanStack Vue Query)

| Hook | Type | GitHub API Call | Cache Key | staleTime |
|---|---|---|---|---|
| useAdminQueue() | Query | `GET /repos/:owner/:repo/issues?labels=state:flagged&state=open` | `['admin', 'queue']` | 30s |
| useAllLabels() | Query | `GET /repos/:owner/:repo/labels?per_page=100` | `['labels']` | 60s |
| useFeaturedPrompts() | Query | `GET /repos/:owner/:repo/issues?labels=state:featured&state=open` | `['admin', 'featured']` | 30s |
| useRemoveLabelFromIssue(issueId, label) | Mutation | `DELETE /repos/:owner/:repo/issues/:issue_number/labels/:name` | invalidates `['admin', 'queue']`, `['labels']` | — |
| useAddLabelToIssue(issueId, label) | Mutation | `POST /repos/:owner/:repo/issues/:issue_number/labels` | invalidates `['admin', 'queue']`, `['labels']`, `['admin', 'featured']` | — |
| useCloseIssue(issueId) | Mutation | `PATCH /repos/:owner/:repo/issues/:issue_number` with `state: closed` | invalidates `['admin', 'queue']`, `['admin', 'featured']` | — |
| useReopenIssue(issueId) | Mutation | `PATCH /repos/:owner/:repo/issues/:issue_number` with `state: open` | invalidates `['admin', 'queue']` | — |
| useModerationLog(filters) | Query | `GET /repos/:owner/:repo/issues/events` (or GraphQL timeline) | `['admin', 'log', filters]` | 60s |

All mutations use optimistic UI updates (remove/add row before API call). On error, rollback state.

## 7. Interaction Patterns

| Trigger | Action | Implementation |
|---|---|---|
| User clicks [Approve] | Remove `state:flagged` label | useRemoveLabelFromIssue mutation + optimistic row removal |
| User clicks [Hide] | Add `state:hidden` label + close issue | useAddLabelToIssue + useCloseIssue mutations in sequence |
| User clicks [Delete] | Close issue | useCloseIssue mutation |
| User checks row checkbox | Show bulk action bar | Toggle `selectedRows` Set; render bar if size > 0 |
| User clicks [Bulk Approve] | Remove flag from all selected | Promise.all(selectedRows.map(id => useRemoveLabelFromIssue)) |
| User clicks [Bulk Hide] | Hide + close all selected | Promise.all(selectedRows.map(id => useAddLabelToIssue + useCloseIssue)) |
| User clicks tab | Switch view + update URL hash | router.push('/admin#tabName'); scroll to top |
| User fills label form + clicks [Add] | Create new label | useCreateLabel mutation; new label card appears |
| User searches in label manager | Filter labels by name | Client-side array filter (useAllLabels result) |
| User clicks date range in log | Filter log by date | Re-query useModerationLog with updated filters |
| User clicks [Add to Featured] in search | Add feature label to prompt | useAddLabelToIssue mutation; row appears in featured list |

## 8. Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| `Shift + A` | Approve focused/selected row | Moderation Queue table only |
| `Shift + H` | Hide focused/selected row | Moderation Queue table only |
| `Shift + D` | Delete focused/selected row | Moderation Queue table only |
| `Esc` | Clear all row selections; close any modal | Entire admin panel |
| `Cmd/Ctrl + K` | Open command palette to jump to tab or action | Entire admin panel |
| `Tab` | Move focus between form fields and buttons | Label Manager tab, log filters |

## 9. Responsive Behavior

**Desktop (≥1024px):**
- Sidebar visible on left (240px fixed), main content on right
- Stats bar: 4 cards in horizontal row
- Table: full columns visible, horizontal scroll if needed
- Label grid: 3 columns
- Bulk action bar: fixed bottom, 200px height

**Tablet (640px–1023px):**
- Sidebar hidden by default; hamburger menu to toggle
- Stats bar: 2×2 grid
- Table: collapse to card view (title, author, actions only)
- Label grid: 2 columns
- Bulk action bar: full-width, slides up from bottom

**Mobile (<640px):**
- No sidebar; main content full width
- Stats bar: 1 column, stackable
- Table: card view (1 column), swipeable actions
- Label grid: 1 column
- Tabs: dropdown selector instead of horizontal tabs
- Bulk action bar: full-width, slide-up with larger touch targets

## 10. Accessibility (a11y)

- All buttons have `aria-label` attributes describing action ("Approve prompt: {title}")
- Table rows marked with `role="row"` and `aria-selected` for screen readers
- Checkbox column has `aria-label="Select all"` for header checkbox
- Tab navigation uses `aria-selected` and `aria-controls` to link triggers to panels
- Color-only information (red for flagged) also uses text or icons; never rely on color alone
- Confirmation popovers use `role="alertdialog"` with focus management (focus moves to popover on open)
- Search inputs have `aria-describedby` linking to helper text
- Toast notifications use `role="status"` and `aria-live="polite"` for screen reader announcements
- Keyboard navigation: `Tab` through all interactive elements, `Enter` to activate buttons, `Space` for checkboxes, `Escape` to close modals
- Labels: All form inputs have associated `<label>` elements (not placeholder-only)
- Contrast: All text meets WCAG AA standards (4.5:1 for body text, 3:1 for UI components)

## 11. Acceptance Criteria

### AC-01: Non-Maintainer Access Denial
When a non-maintainer user navigates to `/admin`, they are immediately redirected to `/browse` and shown a red error toast ("Access Denied: Only maintainers can view this page"). The redirect happens synchronously before any admin content renders.

### AC-02: Stat Card Display
The stats bar displays exactly 4 cards (Total Prompts, Open/Active, Flagged, Featured). Numbers are dynamically fetched and update in real-time. Flagged card displays red color if count > 0. Clicking Total Prompts or Flagged card navigates to `/admin#queue`.

### AC-03: Tab Navigation with Deep Linking
User can click each tab (Moderation Queue, Label Manager, Log, Featured) and URL hash updates correctly (#queue, #labels, #log, #featured). User can bookmark URL `/admin#labels` and it opens the Label Manager tab on page load.

### AC-04: Flagged Queue Display
The Moderation Queue tab displays all issues with `state:flagged` label in a table with 6 columns: checkbox, title, author, date, reason, actions. Table is sortable by date (default newest-first) and searchable by title. Empty state displays "🎉 No flagged prompts" when no flags exist.

### AC-05: Approve Action
Clicking [Approve] on a flagged prompt removes the `state:flagged` label and optimistically removes the row from the table. If API call succeeds, row stays removed. If it fails, row re-appears and an error toast displays.

### AC-06: Hide Action
Clicking [Hide] on a flagged prompt adds `state:hidden` label, closes the issue, and optimistically removes the row. Success toast confirms "Prompt hidden & closed". Hidden prompts do not appear in `/browse` view.

### AC-07: Delete Action
Clicking [Delete] on a flagged prompt closes the issue via API and optimistically removes the row. Success toast confirms "Prompt deleted". Deleted (closed) issues do not appear in any user-facing view.

### AC-08: Bulk Approve
User selects 3+ rows via checkboxes. Bulk action bar appears from bottom. Clicking [Bulk Approve] removes `state:flagged` label from all selected rows in parallel. All rows removed optimistically. On completion, bulk bar disappears and selection clears.

### AC-09: Bulk Hide
User selects rows and clicks [Bulk Hide]. All selected issues receive `state:hidden` label and are closed in parallel. Rows removed optimistically. Success toast shows count ("3 prompts hidden").

### AC-10: Label Manager - Add Label
User fills the inline form (color, name, type) and clicks [Add Label]. New label is created in GitHub and appears as a new card in the grid. Form inputs clear. If label name already exists, validation error displays.

### AC-11: Label Manager - Edit Label
User clicks [Edit] on a label card, modifies color/name/type, and clicks [Save]. Label is updated in GitHub. Card updates instantly with new values.

### AC-12: Label Manager - Delete Label
User clicks [Delete] on a label card, confirms action in popover, and label is deleted from GitHub. Card disappears from grid. If label is used by issues, error handling gracefully informs user.

### AC-13: Moderation Log - Display & Filter
Moderation Log tab shows action history with columns: Action, Target Prompt, Performed By, Date, Outcome. User can filter by action type (dropdown) and date range (date picker). Results update instantly. Paginated at 20 items/page.

### AC-14: Featured Prompts - Add & Remove
Featured Prompts tab shows issues with `state:featured` label. User can search for prompts and click [Add to Featured] to add the `state:featured` label. [Remove from Featured] button removes the label from featured list. Changes reflect instantly.

### AC-15: Error Handling
All API errors (network, validation, permission) are caught and displayed as error toasts with human-readable messages. Buttons are disabled during requests. If a mutation fails, optimistic UI is rolled back.

## 12. Technical Notes

- **GitHub API Integration**: Use `@octokit/graphql` (GraphQL preferred for complex queries with nested data) and `@octokit/core` (REST for simple label CRUD). All calls authenticated with GitHub token from `useAuthStore.token`.
- **Optimistic Updates**: Before sending API call, immediately update local query cache (Pinia store or TanStack Query) to reflect expected state. If API call fails, rollback cache to previous value.
- **Bulk Operations**: Use `Promise.all()` to parallelize independent mutations (e.g., removing label from 10 issues simultaneously). Limit to reasonable concurrency (< 10 parallel) to avoid rate limiting.
- **Data Freshness**: Assume stale-time of 30–60 seconds for admin data. After mutations, invalidate affected queries to refetch. Users expect near-real-time admin view.
- **Performance**: Paginate large result sets (e.g., moderation log). Use virtual scrolling (windowing) for large tables if list exceeds 500 rows.
- **Monitoring**: Log all admin actions (mutations) to analytics/telemetry for audit trail (separate from GitHub activity log).
