# Phase 6: Fix Command Palette & Admin Sidebar - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Close two specific gaps from the v1.0 audit:
1. `CommandDialog` in `Navbar.vue` opens on ⌘K but `CommandList` renders no results — not connected to `useSearchStore`. Fix: wire `CommandInput` to `searchStore.setQuery()` and render `CommandItem` list from `searchStore.results`.
2. Router guard in `router/index.ts` re-verifies maintainer status via GitHub API on every `/admin` navigation but discards the result — `authStore.isMaintainer` stays stale. Fix: write `authStore.isMaintainer = confirmed` in the guard before the redirect check.

Requirements in scope: SHEL-01, ADMN-01.

What is NOT in scope: new search features, navigation shortcuts in the palette, notification improvements, any other bug fixes.

</domain>

<decisions>
## Implementation Decisions

### Command result display
- Each result item shows: prompt title prominently + colored dot + category text (matches sidebar category style)
- Colored dot uses the same category colors as `Sidebar.vue` (Coding: #3b82f6, Writing: #10b981, Analysis: #f59e0b, Creative: #ec4899, System: #8b5cf6, Other: #6b7280)
- Maximum 8 results visible at once; list scrolls for more
- Selecting a result: close palette + navigate to `/prompts/:id`

### Empty query behavior
- When palette opens with no text: show empty state with "Type to search prompts..." — no list items rendered
- When query has no matches: existing `CommandEmpty` ("No results found.") — no additional browse link needed
- Closing palette (Escape or clicking outside): reset search query to empty string via `searchStore.setQuery('')`

### Result grouping
- Flat list — no grouping by category. Results ordered by MiniSearch relevance score.
- No `CommandGroup` wrapper needed for the results section.

### isMaintainer write-back
- Router guard writes `authStore.isMaintainer = confirmed` before the redirect check (applies to both `true` and `false` outcomes)
- Pattern: `authStore.isMaintainer = confirmed; if (!confirmed) return { path: '/browse' }`
- Sidebar admin section (`v-if="isMaintainer"`) becomes immediately reactive on first `/admin` navigation

### Claude's Discretion
- Exact `CommandItem` markup structure (value prop, layout of dot + title + category text)
- Keyboard navigation behavior (handled by Reka UI's Command primitive — no custom logic needed)
- Exact placeholder text styling in the "Type to search..." empty state

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `useSearchStore` (`src/stores/useSearchStore.ts`): `query` ref, `results` computed (reactive Prompt[]), `setQuery(q)` function — clean integration point
- `CommandItem`, `CommandGroup`, `CommandSeparator` — all exported from `src/components/ui/command/index.ts`, ready to import in Navbar.vue
- `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty` — already imported and used in `Navbar.vue`
- `authStore.isMaintainer` — plain `ref(false)` in `useAuthStore`, writable from outside the store

### Established Patterns
- All stores use `storeToRefs()` for reactive destructuring in components
- `useSearchStore` instance is created the same way as other stores — `const searchStore = useSearchStore()`
- MiniSearch instance is module-level (non-reactive) — `searchStore.results` is a computed ref that reacts to `searchStore.query`
- Router guard pattern: `const authStore = useAuthStore()` at top of `beforeEach`, then direct ref mutation (`authStore.isMaintainer = ...`)

### Integration Points
- `Navbar.vue` line 184–189: `CommandDialog` > `CommandInput` + `CommandList` > `CommandEmpty` — add `CommandItem` list between `CommandEmpty` and closing `CommandList`
- `router/index.ts` line 76–77: `const confirmed = await verifyMaintainerStatus(authStore.token)` → add `authStore.isMaintainer = confirmed` before the `if (!confirmed)` redirect
- `Sidebar.vue` line 244: `v-if="isMaintainer"` already reactively bound via `storeToRefs(authStore)` — no changes needed in Sidebar

</code_context>

<specifics>
## Specific Ideas

- No specific UX references mentioned — standard command palette behavior (Spotlight/Linear style) is the model
- Colored category dot in results mirrors the exact dot pattern from `Sidebar.vue` (lines 168–170): `<span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: cat.color }" />`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-fix-command-palette-admin-sidebar*
*Context gathered: 2026-03-26*
