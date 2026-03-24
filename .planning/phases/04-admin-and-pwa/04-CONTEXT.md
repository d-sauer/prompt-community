# Phase 4: Admin & PWA - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin panel for maintainer/curator moderation (moderation queue, label management, featured prompts, moderation log, stats overview) + PWA for offline browsing of cached prompts and background sync of write actions on reconnect.

Requirements in scope: ADMN-01, ADMN-02, ADMN-03, ADMN-04, ADMN-05, ADMN-06, ADMN-07, ADMN-08, SHEL-07, SHEL-08.

What is NOT in scope: any new browsing or contribution features, push notifications, background sync for prompt creation/editing.

</domain>

<decisions>
## Implementation Decisions

### Admin panel layout
- Tabbed sections within AdminView: **Queue | Labels | Log** (using existing Tabs component — same pattern as profile page)
- Sticky summary bar above the tabs showing: total prompts, flagged count, featured count (always visible regardless of active tab)
- Moderation queue: table rows with inline action buttons (Approve / Hide / Delete) + bulk checkboxes on left column
- Queue pagination: 20 items per page with prev/next controls

### Moderation action model
- **Approve** = remove `flag:review` label from the GitHub Issue (no additional labels added)
- **Hide** = add `status:hidden` label; Browse query must filter out `status:hidden` items
- **Delete** = permanently delete the GitHub Issue via GitHub API; requires a confirmation Dialog before executing (hard delete, no recovery)
- **Action logging** = after each action, post a system comment to the GitHub Issue: e.g. `✓ Approved by @login on 2026-03-24`. This is the moderation log source (ADMN-08 reads these comments).

### Bulk actions
- Checkboxes select multiple queue items; a bulk action toolbar appears when 1+ items are selected
- Bulk actions: Approve all selected / Hide all selected / Delete all selected
- Bulk delete requires a single confirmation Dialog listing count (e.g. "Delete 3 prompts permanently?")

### Featured prompts (ADMN-07)
- Feature = add `status:featured` label to a prompt; unfeature = remove it
- Featured toggle available from the moderation queue table row actions (not a separate tab)

### Label management (ADMN-06)
- Labels tab shows all GitHub labels in the data repo, grouped by namespace prefix
- Namespace prefix enforcement: labels must follow `namespace:value` pattern (e.g. `category:engineering`, `model:claude`, `status:hidden`)
- Claude's discretion: which specific namespaces exist and their validation rules (researcher should discover current labels from the data repo)
- Hard block on save if label doesn't match `namespace:value` format — inline error message, not silent failure

### Moderation log (ADMN-08)
- Log tab reads system comments from issues (those matching the "✓ [action] by @login on [date]" pattern)
- Filterable by date range
- Shows: timestamp, action taken, prompt title, maintainer who acted

### PWA offline scope
- Service worker via `vite-plugin-pwa` (already in tech stack, not yet configured)
- Cache strategy: app shell (HTML/JS/CSS) + network-first for API responses, falling back to cache for previously visited prompt pages
- No pre-caching of all prompts — only pages the user has visited are available offline

### PWA write sync queue
- Queue: `postComment` and `toggleReaction` mutations only (not prompt create/edit/flag)
- Queue stored in localStorage (auth tokens are Pinia-memory-only, so queued items must not contain tokens — re-authenticate on sync)
- On reconnect: drain queue automatically, show Sonner toast for each synced item

### Offline UX
- Connectivity detection via `VueUse useOnline()`
- On disconnect: Sonner toast "You're offline — showing cached content"
- On reconnect: Sonner toast "Back online — syncing X queued action(s)"
- No persistent banner; toast is sufficient

### PWA install
- No custom install prompt — browser native install UI only
- `vite-plugin-pwa` makes the app installable without any additional UI

### Claude's Discretion
- Exact workbox cache strategy configuration (stale-while-revalidate vs. network-first per route)
- Queue drain error handling (failed sync retry logic)
- Exact GitHub API call for reading moderation log comments (filter pattern)
- Label edit/delete confirmation UX (inline row editing vs. Dialog)
- Admin table responsive behavior on smaller screens

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AdminView.vue` — already exists as a placeholder at `/admin`; ready to be implemented
- `src/components/ui/tabs/` — Tabs component (already used in ProfileTabs.vue — same pattern to follow)
- `src/components/ui/dialog/` — Dialog component for delete confirmation
- `src/components/ui/badge/` — Badge for status labels (used in PromptMetadata)
- `src/components/ui/button/` — Button with variant support
- `src/components/ui/skeleton/` — Skeleton loading states
- `src/components/ui/sonner/` — Toast notifications (already used for bookmark guard)
- `src/components/ui/input/` + `select/` — For label form and log date filter
- `useFlagPrompt.ts` — existing `flagMutation` pattern; label mutations follow the same shape

### Established Patterns
- `useMutation` composables: `mutationFn` calls GitHub REST/GraphQL, `onSuccess` invalidates query cache
- Auth guard: check `authStore.isAuthenticated` + `authStore.isMaintainer` before mutation
- Sonner toast: used in PromptActions bookmark guard — `import { toast } from 'vue-sonner'`
- `window.confirm()` used for quick confirmations in CommentSection flag button; upgrade to Dialog for destructive admin actions

### Integration Points
- `/admin` route already registered in `src/router/index.ts` with `meta: { requiresMaintainer: true }` and `verifyMaintainerStatus()` guard — access control is already enforced
- `src/lib/github/mutations.ts` — add label mutation functions here (addLabel, removeLabel, deleteIssue, addComment)
- `src/lib/github/queries.ts` — add query for fetching flagged issues and issue comments for log
- `vite.config.ts` — add `vite-plugin-pwa` plugin configuration here
- VueUse `useOnline()` — available via `@vueuse/core` (already a dependency)

</code_context>

<specifics>
## Specific Ideas

- Moderation log system comment format: `✓ [Action] by @[login] on [date]` — consistent prefix makes them parseable
- Status labels follow `status:` namespace: `status:hidden`, `status:featured` (consistent with the label namespace convention)
- The label management tab should show labels grouped by namespace (all `category:*` together, all `model:*` together, etc.)

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-admin-and-pwa*
*Context gathered: 2026-03-24*
