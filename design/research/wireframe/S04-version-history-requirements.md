# S04 — Version History: Requirements

## 1. Overview
- **Screen ID:** S04
- **Route(s):** `/prompts/:id/versions`
- **Vue Component:** `VersionHistoryView.vue`
- **Access Level:** Read = all authenticated users. Restore = author or maintainer only.
- **Purpose:** Full-page timeline view of all edits to a prompt with side-by-side diff comparison. Left panel shows chronological version list. Right panel shows a diff view comparing any two selected versions. Authors and maintainers can restore a previous version, which creates a new version comment with the old content.

## 2. User Stories
1. As a prompt reader, I want to see the full edit history of a prompt so that I can understand how it evolved and who contributed.
2. As a prompt reader, I want to compare any two versions side-by-side so that I can see exactly what changed between them.
3. As a prompt author, I want to restore a previous version of my prompt if recent edits broke something, so that I can quickly revert to a known good state.
4. As a prompt author, I want to see what specific lines changed in the latest edit so that I can review the exact differences before deciding to restore.
5. As a maintainer, I want to restore any prompt version (not just my own) so that I can help authors undo problematic edits.
6. As a user, I want to see the author, timestamp, and changelog message for each version so that I understand the context of changes.
7. As a user, I want to jump to a specific version's author profile or GitHub issue so that I can learn more about the contribution.

## 3. Functional Requirements

### FR-01: Route & Component Initialization
When a user navigates to `/prompts/:id/versions`, fetch the prompt via `usePromptDetail(id)` and all its version history via `usePromptVersions(id)`. Display the component with a two-panel layout (left = version list, right = diff view). Load the latest version as the selected version initially.

### FR-02: Fetch & Parse Version Comments
Implement `usePromptVersions(id)` hook that fetches all GitHub issue comments for the given issue. Filter comments whose body starts with `"## Version N — YYYY-MM-DD"` (structured version comments). Parse each comment to extract:
- Version number (N)
- Date (YYYY-MM-DD)
- Changelog message (optional, line after header)
- Full prompt content (remainder of body)
Sort chronologically by version number (oldest first). Cache results for 5 minutes. Return array of `VersionObject { version: N, date: Date, author: string, message: string, content: string, commentId: string }`.

### FR-03: Version List Rendering
Render the left panel with:
- Prompt title (truncated) + "N versions" count badge
- Scrollable list of version items (max-height 600px)
- Each item displays: version badge (v1, v2, etc.), author avatar (24px circle), username, relative date ("2 hours ago"), one-line changelog message, and "Current" badge on the latest version
- Selected version: highlighted with left purple border and darker background color
- Restore button: visible on hover, only for author/maintainer, hidden for current version

### FR-04: Version Item Selection
When user clicks a version item in the list, set it as the right-side (version B) of the diff comparison. Automatically set the version immediately before it as the left-side (version A). Update the diff view to show the comparison. If version is the first, show "This is the original prompt" notice instead of diff.

### FR-05: Version Metadata Display
Below the diff lines, render a metadata card showing:
- Author (GitHub username, clickable link to profile)
- Date (full date + time, formatted)
- Changelog message (the commit message for this version)
- Changes summary: "+X lines, −Y lines" (calculated from diff)
- [View on GitHub ↗] link to the GitHub issue comment

### FR-06: Diff View Toolbar
Render a toolbar above the diff with:
- Label: "Comparing:" followed by two Select dropdowns for version A and version B
- Each Select populated with all available versions (v1, v2, ..., vN)
- On Select change, compute new diff between selected versions
- Toggle buttons: [View Raw] (switch between diff and raw markdown) and layout selector [Side by Side | Unified]

### FR-07: Diff Computation & Rendering
Implement diff algorithm using `jsdiff` library or custom line-by-line comparison:
- Parse version A and version B content
- For each line: determine if removed (−), added (+), or unchanged
- Render diff lines with:
  - Line numbers on left (both versions)
  - Marker column: "−" (red) for removed, "+" (green) for added, " " (space) for unchanged
  - Content column: the actual line text
  - Colors: removed = bg #2e0a0a, text #f87171; added = bg #0a2e10, text #4ade80; unchanged = normal
  - Monospace font (Menlo/Monaco, 12px)
- Collapse sections with 5+ unchanged lines into "… X unchanged lines …" to reduce scrolling

### FR-08: Diff Side-by-Side Layout
When "Side by Side" is active, render a two-column layout:
- Left column: version A (with line numbers and removed lines highlighted in red)
- Right column: version B (with line numbers and added lines highlighted in green)
- Unchanged lines appear in both columns aligned horizontally
- Line numbers reset for each column independently

### FR-09: Diff Unified Layout
When "Unified" is active, render a single-column layout:
- All lines from both versions in a single flow
- Each line prefixed with: "−" (red) for removed, "+" (green) for added, " " (space) for unchanged
- Line numbers shown for the version B (right-side) content

### FR-10: Raw Markdown View
Implement a "View Raw" toggle that switches the diff view to show raw markdown:
- Display full markdown content of version B (or both versions side-by-side if in that layout)
- Syntax highlighting via `shiki` for code blocks
- Useful for reviewing the full context without diff noise

### FR-11: Restore Version Flow
When user clicks [Restore] button on a non-current version:
1. Check if user is author (`comment.user.login === useAuthStore.user.login`) or maintainer (`useAuthStore.isMaintainer`)
2. If not authorized, disable button and show tooltip "Only author or maintainer can restore"
3. If authorized, open ConfirmDialog: "Restore version N (YYYY-MM-DD)? A new version comment will be created with the old content."
4. On confirm, invoke `useRestoreVersion(id, versionCommentId)` mutation
5. Mutation posts new GitHub issue comment with header "## Version M — YYYY-MM-DD" and full content from version N
6. Increment prompt's `version` field
7. On success, invalidate `usePromptVersions` cache and navigate to `/prompts/:id` with success toast

### FR-12: Current Version Badge
Mark the latest version in the list with a "Current" badge. Only show [Restore] button on non-current versions. Show a notice in the diff toolbar when comparing the current version: "This is the current version."

### FR-13: Author Avatar & Profile Link
Each version item shows the GitHub user avatar (24px circle, fetched from GitHub API). Click the avatar or username to navigate to the author's GitHub profile. Display author name/username in a tooltip on hover.

### FR-14: Relative Time Display
Show relative time for each version ("2 hours ago", "3 days ago"). Update every 60 seconds to keep relative times fresh. On hover, show full date/time in a tooltip (e.g., "Mar 14, 2026 at 2:30 PM UTC").

### FR-15: Mobile Responsive
On screens < 768px, switch to a stacked layout:
- Version list at the top (max-height 300px, scrollable)
- Diff view below (scrollable)
- Alternatively, use tabs: "Versions" | "Diff"

### FR-16: Keyboard Shortcuts
Implement shortcuts:
- Arrow Up/Down: Select previous/next version in the list
- Escape: Close any open dialog
- ⌘J: Jump to latest version (v N)

### FR-17: Empty State Handling
If only one version exists (first version ever):
- Version list shows only v1
- Diff view shows "This is the original prompt. No previous versions to compare."
- [Restore] button is hidden
- Metadata card shows basic info (author, creation date)

### FR-18: Error Handling
If `usePromptVersions` fails to fetch:
- Show error banner: "Unable to load version history. [Retry]"
- Disable all interactive elements
- On retry, re-fetch versions

### FR-19: Performance Optimization
- Virtualize the version list if > 50 versions (use VueUse `useVirtualList`)
- Lazy-load diff content: only render visible lines + 50 line buffer
- Cache parsed version objects in TanStack Vue Query with 5-minute staleTime
- Debounce diff computation (100ms) if user rapidly changes selectors

## 4. Component Inventory
| UI Element | shadcn-vue Component | Reka UI Primitive | Notes |
|---|---|---|---|
| Version list | Custom scrollable div | None | Virtualized if > 50 versions |
| Version item | Div (custom) | None | Hover state shows Restore button |
| Version badge | Badge | None | "v1", "v2", etc. |
| Author avatar | Avatar | None | GitHub user image, 24px |
| Version date | Span | None | Relative time, update every 60s |
| Restore button | Button | None | Visible on hover, disabled for non-authors |
| Comparing label | Span | None | "Comparing:" text |
| Version A selector | Select | SelectRoot/SelectValue/SelectContent | Dropdown of versions |
| Version B selector | Select | SelectRoot/SelectValue/SelectContent | Dropdown of versions |
| View Raw toggle | Button | None | Switch to raw markdown view |
| Layout toggle | Button group | None | Side by Side vs Unified |
| Diff lines | Div (custom) | None | Monospace, scrollable, lazy-loaded |
| Diff line number | Span | None | Left gutter, gray text |
| Diff marker | Span | None | "−" / "+" / " " |
| Diff content | Span | None | Monospace, color-coded |
| Collapse button | Button | None | "… X unchanged lines …" |
| Metadata card | Card (custom) | None | Author, date, message, stats |
| Confirm dialog | Dialog | DialogRoot/DialogContent/DialogTrigger | Restore confirmation |
| Toast | Toast | ToastRoot/ToastAction | Success/error notifications |
| GitHub link | Anchor | None | "View on GitHub ↗" |

## 5. State Management (Pinia)

### Reads from:
- `useAuthStore`: `isAuthenticated`, `user`, `isMaintainer`
- `useUIStore`: `theme`, `diffMode` ('rendered' | 'raw'), `diffLayout` ('side-by-side' | 'unified')

### Writes to:
- `useUIStore`: Set `diffMode`, `diffLayout` on toggle changes
- Local component state: `selectedVersionA`, `selectedVersionB` (via ref)

## 6. API & Data (TanStack Vue Query)

| Hook | Type | GitHub API | Cache Key | staleTime |
|---|---|---|---|---|
| `usePromptDetail(id)` | Query | GET /repos/{owner}/{repo}/issues/{issue_number} | `['prompt', id]` | 5 minutes |
| `usePromptVersions(id)` | Query | GET /repos/{owner}/{repo}/issues/{issue_number}/comments | `['promptVersions', id]` | 5 minutes |
| `useRestoreVersion(id, commentId)` | Mutation | POST /repos/{owner}/{repo}/issues/{issue_number}/comments | N/A | N/A |

## 7. Interaction Patterns

| Trigger | Action | Implementation |
|---|---|---|
| Component mounts | Load all versions | usePromptVersions(id) query, populate version list |
| User clicks version item | Select as right-side diff | Set selectedVersionB, auto-select previous as A, compute diff |
| User changes Version A selector | Compute new diff | Debounced (100ms) diff calculation, render |
| User changes Version B selector | Compute new diff | Debounced (100ms) diff calculation, render |
| User clicks [View Raw] | Toggle diff/raw mode | Set useUIStore.diffMode, re-render |
| User clicks [Side by Side] | Switch layout | Set useUIStore.diffLayout = 'side-by-side', re-render |
| User clicks [Unified] | Switch layout | Set useUIStore.diffLayout = 'unified', re-render |
| User clicks [Restore] | Open confirm dialog | Check authorization, show ConfirmDialog |
| User confirms restore | Restore version | useRestoreVersion mutation, invalidate cache, navigate to /prompts/:id |
| 60 seconds elapse | Update relative times | Recalculate formatDistanceToNow for all versions |
| User clicks author avatar | Navigate to GitHub | Open GitHub profile URL in new tab |
| Version list scrolls | Lazy-load diff content | Render only visible lines + 50 buffer |

## 8. Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| ↑ / ↓ | Select previous/next version | Version list (if focused) |
| Escape | Close dialog or deselect | Global |
| ⌘J / Ctrl+J | Jump to latest version | Global |

## 9. Responsive Behavior

### Desktop (≥1024px)
- Two-panel horizontal layout: 280px left (version list) | flex-1 right (diff view)
- Full-height components, internal scrolling
- All elements visible simultaneously

### Tablet (768px–1023px)
- Possibly narrow the left panel (240px) or stack vertically
- Consider switching to tabs if horizontal space too constrained

### Mobile (<768px)
- Stacked layout: version list (max-height 300px) over diff view (scrollable)
- Or tabs: "Versions" tab shows list, "Diff" tab shows comparison
- Diff lines become single-column (Unified layout forced)
- Version item badges and buttons may be truncated

## 10. Accessibility (a11y)

- **Semantic HTML:** Use `<button>` for interactive elements, `<a>` for links. Label sections with `<h2>`.
- **ARIA attributes:**
  - Version list items: `role="option"` or `role="listitem"`, `aria-selected` state
  - Restore button: `aria-label="Restore version N"`, `aria-disabled` when not authorized
  - Diff lines: `role="presentation"` (content-only)
  - Selectors: Standard Select accessibility (aria-labelledby)
- **Keyboard navigation:** Tab order: version list → selectors → toggle buttons → Restore button. Arrow keys navigate version list.
- **Color contrast:** Diff colors (red #f87171, green #4ade80) vs bg (#2e0a0a, #0a2e10) meet WCAG AA.
- **Focus indicators:** Visible 2px outline (#7c3aed) on all interactive elements.
- **Screen reader:** Announce version selection, restore authorization status, diff summary ("+X lines, −Y lines").

## 11. Acceptance Criteria

### AC-01: Load Version History
Given a user navigates to `/prompts/1/versions`, when the page loads, then `usePromptVersions(1)` should fetch all version comments from GitHub, and the version list should display v1 through vN in chronological order.

### AC-02: Select Version from List
Given a user clicks version v3 in the list, when the click fires, then version v3 should be highlighted (selected state), and the diff should show the comparison between v2 (auto-selected) and v3.

### AC-03: First Version Handling
Given a prompt has only one version (v1), when the page loads, then the version list should show only v1, the diff view should display "This is the original prompt", and no [Restore] button should appear.

### AC-04: Multi-version Comparison
Given versions v2 and v4 are selected, when the user selects v4 from the Version B dropdown, then the diff should render showing all changes between v2 and v4.

### AC-05: Diff Coloring
Given a diff is being rendered, when a line is removed from v1 to v2, then it should have background color #2e0a0a and text color #f87171. When added, bg #0a2e10 and text #4ade80.

### AC-06: Side-by-Side Layout
Given "Side by Side" layout is active, when the page renders a diff, then version A should appear in the left column and version B in the right column, with line numbers for each.

### AC-07: Unified Layout
Given "Unified" layout is active, when the page renders a diff, then removed lines should be prefixed with "−" (red) and added lines with "+" (green) in a single column.

### AC-08: Raw Markdown Toggle
Given the user clicks [View Raw], when the toggle is activated, then the diff view should switch to show raw markdown with shiki syntax highlighting, and the toggle button should appear active.

### AC-09: Restore Version Authorization
Given a non-author user navigates to `/prompts/1/versions`, when they hover over the [Restore] button on v2, then the button should be disabled and show a tooltip "Only author or maintainer can restore".

### AC-10: Restore Flow
Given the prompt author clicks [Restore] on version v2, when they confirm the dialog, then `useRestoreVersion(1, commentId)` should POST a new version comment to GitHub, and the user should be navigated to `/prompts/1` with a success toast.

### AC-11: Current Version Badge
Given a prompt has versions v1–v5, when the page loads, then v5 should show a "Current" badge, and the [Restore] button should not appear on v5.

### AC-12: Author Avatar Display
Given version v3 was created by "alice_smith", when the version list renders v3, then the author avatar should display a 24px circle with Alice's GitHub avatar image.

### AC-13: Relative Time Update
Given a version shows "2 hours ago", when 60 seconds have elapsed, then the relative time should be recalculated and updated if needed.

### AC-14: Metadata Card
Given version v4 is selected, when the user views the diff, then the metadata card should show the author (alice_smith), date, changelog message ("Improved system context"), "+5 lines, −3 lines", and a link to the GitHub issue.

### AC-15: Collapsed Sections
Given a diff has 10 unchanged lines in a row, when the diff renders, then it should collapse into "… 10 unchanged lines …" button instead of showing all 10 lines, and clicking should expand them.

### AC-16: Error Recovery
Given the versions fetch fails, when the page displays an error banner with [Retry], and the user clicks [Retry], then the fetch should be reattempted and versions should load.

### AC-17: Mobile Responsive
Given a user is on a mobile device (<768px), when the page loads, then the layout should stack with the version list above the diff view, and the diff should use Unified layout.
