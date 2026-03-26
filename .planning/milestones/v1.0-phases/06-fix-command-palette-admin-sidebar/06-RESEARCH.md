# Phase 6: Fix Command Palette & Admin Sidebar - Research

**Researched:** 2026-03-26
**Domain:** Vue 3 component wiring, Pinia store integration, Reka UI Command primitive, Vue Router guards
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Each result item shows: prompt title prominently + colored dot + category text (matches sidebar category style)
- Colored dot uses the same category colors as `Sidebar.vue` (Coding: #3b82f6, Writing: #10b981, Analysis: #f59e0b, Creative: #ec4899, System: #8b5cf6, Other: #6b7280)
- Maximum 8 results visible at once; list scrolls for more
- Selecting a result: close palette + navigate to `/prompts/:id`
- When palette opens with no text: show empty state with "Type to search prompts..." — no list items rendered
- When query has no matches: existing `CommandEmpty` ("No results found.") — no additional browse link needed
- Closing palette (Escape or clicking outside): reset search query to empty string via `searchStore.setQuery('')`
- Flat list — no grouping by category. Results ordered by MiniSearch relevance score. No `CommandGroup` wrapper.
- Router guard writes `authStore.isMaintainer = confirmed` before the redirect check (applies to both `true` and `false` outcomes)
- Pattern: `authStore.isMaintainer = confirmed; if (!confirmed) return { path: '/browse' }`
- Sidebar admin section (`v-if="isMaintainer"`) becomes immediately reactive on first `/admin` navigation

### Claude's Discretion
- Exact `CommandItem` markup structure (value prop, layout of dot + title + category text)
- Keyboard navigation behavior (handled by Reka UI's Command primitive — no custom logic needed)
- Exact placeholder text styling in the "Type to search..." empty state

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SHEL-01 | Any user can invoke global search from any screen using ⌘K keyboard shortcut | CommandDialog already opens on ⌘K via `commandPaletteOpen` in UIStore; gap is that CommandList renders no results — requires wiring `CommandInput` → `useSearchStore.setQuery()` and rendering `CommandItem` list from `searchStore.results` |
| ADMN-01 | Maintainer/Curator can access the admin panel (non-maintainers redirected immediately) | Router guard already calls `verifyMaintainerStatus` but discards the result — `authStore.isMaintainer` stays `false` stale; fix is one line: `authStore.isMaintainer = confirmed` before the redirect check, making `Sidebar.vue`'s `v-if="isMaintainer"` reactive |
</phase_requirements>

---

## Summary

Phase 6 closes two precise integration gaps identified in the v1.0 audit. Both are single-file, surgical changes with no new dependencies and no architectural change needed.

**Gap 1 — Command Palette (SHEL-01):** `Navbar.vue` already renders a `CommandDialog` that opens on ⌘K and contains `CommandInput` + `CommandList` + `CommandEmpty`. The `CommandInput` is a Reka UI `ListboxFilter` that writes to Reka's internal `filterState.search` for its own substring matching. To integrate with `useSearchStore` (which uses MiniSearch, not Reka's filter), the planner must wire a `watch` on `filterState.search` (via `useCommand()`) OR bind `@input`/`v-model` on the `CommandInput` to call `searchStore.setQuery()`. Because `CommandInput` uses `filterState.search` internally for Reka item visibility, the cleanest approach is to watch the `commandPaletteOpen` flag and, when it closes, reset the store query. The rendered `CommandItem` list comes from `searchStore.results` (a reactive computed `Prompt[]`), with each item navigating to `/prompts/:id` and closing the palette.

**Gap 2 — Admin Sidebar (ADMN-01):** `router/index.ts` line 76 calls `verifyMaintainerStatus(authStore.token)` and stores the result in `confirmed`, but immediately uses it only for the redirect guard without writing it back to `authStore.isMaintainer`. `Sidebar.vue` uses `v-if="isMaintainer"` bound via `storeToRefs(authStore)`, which is reactive but starts `false` on page load and is never updated by the router guard. The fix is a single line inserted before the redirect: `authStore.isMaintainer = confirmed`. The `isMaintainer` ref in `useAuthStore` is a plain writable `ref(false)` — external assignment is valid and already used in `fetchCurrentUser`.

**Primary recommendation:** Wire `CommandInput` to `useSearchStore` using a watcher on the Reka `filterState.search` (accessed via `useCommand()` composable) + `watch(commandPaletteOpen, ...)` for close-reset; add one line to router guard for `isMaintainer` write-back.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vue 3 | 3.x | Reactivity, component model | Project foundation |
| Pinia | 2.x | Store management | Already `useSearchStore`, `useAuthStore`, `useUIStore` |
| Reka UI | shadcn-vue copy-in | Command primitive, Listbox, Dialog | Powers `CommandDialog`, `CommandInput`, `CommandItem` |
| vue-router | 4.x | Navigation guards, `beforeEach` | Already used for auth/maintainer guards |
| `@vueuse/core` | latest | `storeToRefs`, `useDark` | Already imported in Navbar.vue |

### No New Dependencies
This phase requires zero new package installs. All needed components (`CommandItem`) and stores are already present.

---

## Architecture Patterns

### Reka UI Command Primitive — How it Actually Works

This is the most important architectural finding for the planner.

The `Command.vue` (Reka UI) creates a `filterState` reactive object with a `search` string. `CommandInput.vue` binds `v-model="filterState.search"` on `ListboxFilter`. `CommandItem.vue` reads `filterState.filtered.items` to decide whether to render itself — items are shown/hidden based on Reka's own substring `contains()` filter.

**Key implication:** When `CommandItem` elements are rendered from `searchStore.results`, Reka's internal `filterState.search` still runs its own `contains()` filter on the rendered items' text content. This means if the planner renders all items from MiniSearch results, Reka will also apply substring filtering on top — which is acceptable (double-filtering will not show wrong results, only potentially fewer). Alternatively, disable Reka's internal filter by not using it as the filter driver.

The cleanest integration pattern:

```vue
<!-- In Navbar.vue script setup -->
const searchStore = useSearchStore()
const { results } = storeToRefs(searchStore)
const { commandPaletteOpen } = storeToRefs(uiStore)

// Watch the input at the Reka level — access via useCommand() injected context
// OR use a simpler approach: watch commandPaletteOpen for close-reset
// and use @input on CommandInput for the query
watch(commandPaletteOpen, (open) => {
  if (!open) searchStore.setQuery('')
})
```

For query wiring, `CommandInput` does not expose a separate `@update:modelValue` or `@input` event that bypasses `filterState`. The practical approach is to use `watch` on `filterState.search`. However `filterState` is provided via `provideCommandContext` and is only accessible inside children of `Command` via `useCommand()`. From `Navbar.vue` (parent of `CommandDialog`), the simplest approach is to use a `ref` for the query and bind it in the `CommandInput` via an `@input` or `@change` native event listener — since `CommandInput` inherits attrs via `v-bind="$attrs"` with `inheritAttrs: false`. This allows `<CommandInput @input="onInput" />` to receive native input events.

**Verified pattern from CommandInput.vue source:**
```vue
defineOptions({ inheritAttrs: false })
// ...
<ListboxFilter v-bind="{ ...forwardedProps, ...$attrs }" v-model="filterState.search" />
```
`$attrs` is spread onto `ListboxFilter`, which renders as an `<input>`. Native `@input` events on `CommandInput` reach the underlying input element.

### Pattern 1: CommandInput native event binding

**What:** Bind a native `@input` event on `CommandInput` from `Navbar.vue` to call `searchStore.setQuery()`
**When to use:** When the parent needs to sync its own store with what the user types in the Command input

```vue
<!-- Source: direct inspection of CommandInput.vue — inheritAttrs: false + $attrs spread -->
<CommandInput
  placeholder="Search prompts..."
  @input="(e: Event) => searchStore.setQuery((e.target as HTMLInputElement).value)"
/>
```

### Pattern 2: Close-reset via watch on commandPaletteOpen

**What:** Watch the open/close boolean and reset query when palette closes

```vue
// Source: Navbar.vue + useUIStore.ts analysis
watch(commandPaletteOpen, (open) => {
  if (!open) searchStore.setQuery('')
})
```

### Pattern 3: Conditional empty state (no query → no list)

**What:** Render `CommandItem` list only when query is non-empty
**When to use:** Per locked decision — empty query shows "Type to search prompts..." not a result list

```vue
<!-- Source: CONTEXT.md decision + useSearchStore.ts behavior -->
<CommandList>
  <template v-if="searchStore.query.trim()">
    <CommandItem
      v-for="prompt in results.slice(0, 8)"
      :key="prompt.id"
      :value="prompt.title"
      @select="() => onSelectResult(prompt)"
    >
      <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: categoryColor(prompt.frontmatter.category) }" />
      <span class="font-medium">{{ prompt.title }}</span>
      <span class="text-muted-foreground text-xs ml-auto">{{ prompt.frontmatter.category }}</span>
    </CommandItem>
  </template>
  <template v-else>
    <!-- Custom empty state when no query typed -->
    <div class="py-6 text-center text-sm text-muted-foreground">Type to search prompts...</div>
  </template>
  <CommandEmpty>No results found.</CommandEmpty>
</CommandList>
```

Note: `CommandEmpty` from Reka UI renders when `filterState.filtered.count === 0`. Since the items are pre-filtered by MiniSearch before rendering, `CommandEmpty` will show when the rendered list has no items — which aligns with "no matches" behavior.

### Pattern 4: isMaintainer write-back in router guard

**What:** One-line addition in `router/index.ts` before the redirect check
**Source:** Direct inspection of `router/index.ts` lines 71–78 + `useAuthStore.ts` `isMaintainer = ref(false)`

Current code:
```typescript
const confirmed = await verifyMaintainerStatus(authStore.token)
if (!confirmed) return { path: '/browse' }
```

Fixed code:
```typescript
const confirmed = await verifyMaintainerStatus(authStore.token)
authStore.isMaintainer = confirmed  // <-- ADD THIS LINE
if (!confirmed) return { path: '/browse' }
```

This works because:
1. `authStore.isMaintainer` is a plain `ref(false)` — direct assignment is valid in Pinia setup stores
2. `Sidebar.vue` uses `const { isMaintainer } = storeToRefs(authStore)` — reactive; updates automatically
3. `authStore.isMaintainer` is already written in `fetchCurrentUser` at login, so the pattern is established

### Anti-Patterns to Avoid

- **Hand-rolling keyboard navigation in CommandItem**: Reka UI's `ListboxItem` handles ArrowUp/ArrowDown/Enter/Escape. Adding custom `@keydown` handlers will conflict.
- **Accessing `filterState` via `useCommand()` from outside `Command` subtree**: `useCommand()` uses `createContext` — it throws if called outside the provider tree. `Navbar.vue` is the parent of `CommandDialog`, not a child of `Command`.
- **Passing `useSearchStore.results` directly as `CommandItem` text content for Reka filtering**: Reka's `contains()` will filter rendered items by their text content. Acceptable as a secondary filter but not the primary search driver.
- **Setting `searchStore.query` from `CommandInput`'s `modelValue` prop**: `CommandInput` props only accept `ListboxFilterProps` — it does not expose a controlled value that bypasses `filterState`.
- **Conditional `v-if` on `CommandEmpty`**: Do not conditionally hide/show `CommandEmpty` — it self-manages visibility based on item count via Reka internals.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard navigation in palette | Custom `@keydown` handlers | Reka UI `ListboxItem` | Reka handles focus, ArrowKeys, Enter, Escape automatically |
| Search filtering | Re-implement substring match | `useSearchStore.results` (MiniSearch) | Already built, INFR-03 compliant (<50ms) |
| Dialog open/close on ⌘K | Custom keyboard listener | `commandPaletteOpen` in UIStore | `useKeyboardShortcuts.ts` already wires ⌘K to `uiStore.openCommandPalette()` |
| Maintaining `isMaintainer` state | Re-fetch on every render | `authStore.isMaintainer` write in router guard | Router already has the verified result — just persist it |

---

## Common Pitfalls

### Pitfall 1: Double-filtering artifacts with Reka + MiniSearch
**What goes wrong:** MiniSearch returns `results` (pre-filtered by relevance). Reka's `Command.vue` also runs its own `contains()` filter on the text content of rendered `CommandItem`s. If the user types "java", MiniSearch may return a prompt titled "Python scripting" (matched on body text), but Reka's text filter will hide it because "java" is not in the `CommandItem` text content.
**Why it happens:** Reka's filter operates on item text content set via `allItems.set(id, currentElement.textContent)` in `CommandItem.vue` `onMounted`.
**How to avoid:** This is acceptable behavior for this phase — the locked decision uses MiniSearch results ordered by relevance, and Reka's secondary filter only reduces noisy matches. The title is the primary text content, so if the title matches, it will pass both filters. No special action needed.
**Warning signs:** If results disappear that should appear — check whether `CommandItem :value` prop or slot text content matches what the user typed.

### Pitfall 2: `useCommand()` called outside Command context
**What goes wrong:** Calling `useCommand()` or `useCommandGroup()` in `Navbar.vue` (which is the parent of `CommandDialog`, not a child of `Command`) throws a Reka context injection error.
**Why it happens:** `createContext` from reka-ui throws when no provider is found in the component tree above the caller.
**How to avoid:** Do not call `useCommand()` in `Navbar.vue`. Use `@input` native event handler on `CommandInput` to sync with `searchStore`.

### Pitfall 3: `CommandItem` select event clears Reka's filterState but not searchStore
**What goes wrong:** `CommandItem.vue`'s `@select` handler does `filterState.search = ''` (Reka's internal state), but `searchStore.query` still has the old value on next palette open.
**Why it happens:** Reka resets its own `filterState.search` on item select, but `searchStore` is external.
**How to avoid:** In the `onSelectResult` handler, call `searchStore.setQuery('')` before navigating, and ensure the `watch(commandPaletteOpen, ...)` close-reset also covers the selection flow.

### Pitfall 4: `authStore.isMaintainer` stale on subsequent `/admin` visits
**What goes wrong:** Even after the fix, if a user becomes a non-maintainer between visits, `isMaintainer` could be `true` from the previous navigation. But the router guard calls `verifyMaintainerStatus` on EVERY `/admin` navigation (per INFR-08), so the write-back will always reflect the current confirmed status.
**Why it happens:** N/A — the fix is correct for both `true` and `false` outcomes per locked decision.
**How to avoid:** Ensure the write-back uses `authStore.isMaintainer = confirmed` (not `= true`) — write unconditionally for both outcomes.

### Pitfall 5: Navbar.spec.ts stubs CommandDialog — new behavior not tested by existing stubs
**What goes wrong:** Existing `Navbar.spec.ts` stubs `CommandDialog` as `{ template: '<div />' }`. Adding `useSearchStore` to Navbar.vue won't break existing tests, but new Command palette behavior (input, item list) won't be testable through those stubs.
**Why it happens:** Component stubs suppress child rendering.
**How to avoid:** Add a focused test for the search wiring — either un-stub `CommandDialog` with `createTestingPinia` providing `search` store state, or test `useSearchStore` integration separately. The planner should add new test cases (not modify the existing two).

---

## Code Examples

### Complete `onSelectResult` handler pattern
```typescript
// Source: CONTEXT.md locked decisions + useUIStore.ts analysis
function onSelectResult(prompt: Prompt) {
  searchStore.setQuery('')
  uiStore.closeCommandPalette()
  router.push(`/prompts/${prompt.id}`)
}
```

### Category color map (verbatim from CONTEXT.md locked decisions)
```typescript
// Source: CONTEXT.md (mirrors Sidebar.vue category colors)
const CATEGORY_COLORS: Record<string, string> = {
  Coding:   '#3b82f6',
  Writing:  '#10b981',
  Analysis: '#f59e0b',
  Creative: '#ec4899',
  System:   '#8b5cf6',
  Other:    '#6b7280',
}

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other
}
```

### Dot pattern (verbatim from Sidebar.vue lines 168–170)
```vue
<!-- Source: Sidebar.vue lines 167-170 — exact pattern to mirror -->
<span
  class="size-2 rounded-full shrink-0"
  :style="{ backgroundColor: cat.color }"
/>
```

### Router guard write-back (exact insertion point)
```typescript
// Source: router/index.ts lines 75-78
// Re-verify via GitHub API on every admin navigation (INFR-08)
const confirmed = await verifyMaintainerStatus(authStore.token)
authStore.isMaintainer = confirmed          // INSERT: write-back before redirect
if (!confirmed) return { path: '/browse' }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CommandList renders nothing | CommandList renders MiniSearch results | Phase 6 | SHEL-01 functional |
| `isMaintainer` stays stale after router guard | `isMaintainer` updated on every `/admin` navigation | Phase 6 | ADMN-01 functional; sidebar admin links visible |

---

## Open Questions

1. **Should `CommandInput` reset Reka's `filterState.search` on palette close?**
   - What we know: `watch(commandPaletteOpen, open => { if (!open) searchStore.setQuery('') })` resets the MiniSearch query. However, Reka's `filterState.search` is internal to `Command.vue` and is not directly accessible from `Navbar.vue`.
   - What's unclear: Will `filterState.search` auto-reset when the dialog closes (CommandDialog unmounts/hides Command)?
   - Recommendation: `CommandDialog` uses a `Dialog` which uses conditional rendering. When closed, `Command` unmounts → `filterState` is recreated fresh on next open. This means Reka's filter auto-resets on close. Confirmed by `Command.vue` — `filterState` is local `reactive({})` in setup, recreated each mount. No action needed beyond `searchStore.setQuery('')`.

2. **`CommandEmpty` visibility with mixed empty state logic**
   - What we know: `CommandEmpty` renders when `filterState.filtered.count === 0`. When `query` is empty and we render no `CommandItem`s (our custom empty state), `filterState.filtered.count` will be 0, potentially showing both the custom "Type to search..." div AND `CommandEmpty`.
   - Recommendation: Use `v-if="searchStore.query.trim()"` on `CommandEmpty` to suppress it when no query is active, and show the custom div only when query is empty. This ensures: no query → custom message only; query with no matches → `CommandEmpty` only; query with matches → list items only.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run src/components/layout/Navbar.spec.ts src/router/index.spec.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHEL-01 | CommandInput @input calls searchStore.setQuery | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ (needs new test cases) |
| SHEL-01 | Closing palette resets searchStore.query to '' | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ (needs new test cases) |
| SHEL-01 | CommandItem list renders from searchStore.results | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ (needs new test cases) |
| SHEL-01 | Selecting a result navigates to /prompts/:id | unit | `npx vitest run src/components/layout/Navbar.spec.ts` | ✅ (needs new test cases) |
| ADMN-01 | authStore.isMaintainer written true when verifyMaintainerStatus returns true | unit | `npx vitest run src/router/index.spec.ts` | ✅ (needs new test case) |
| ADMN-01 | authStore.isMaintainer written false when verifyMaintainerStatus returns false | unit | `npx vitest run src/router/index.spec.ts` | ✅ (needs new test case) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/components/layout/Navbar.spec.ts src/router/index.spec.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/components/layout/Navbar.spec.ts` — add: search store wiring tests (stubs must include CommandItem, un-stub or expand CommandDialog for palette tests). File exists but needs new test cases covering SHEL-01 behaviors.
- [ ] `src/router/index.spec.ts` — add: `authStore.isMaintainer` write-back tests. File exists but needs two new test cases covering ADMN-01 write-back for both `true` and `false` outcomes.

---

## Sources

### Primary (HIGH confidence)
- Direct file inspection: `src/components/layout/Navbar.vue` — exact import list, CommandDialog location (lines 184–189), current stubs in spec
- Direct file inspection: `src/components/ui/command/Command.vue` — filterState reactive architecture, Reka's internal filter logic
- Direct file inspection: `src/components/ui/command/CommandInput.vue` — `inheritAttrs: false` + `$attrs` spread confirming native event passthrough
- Direct file inspection: `src/components/ui/command/CommandItem.vue` — `@select` resets `filterState.search`, allItems text content mapping
- Direct file inspection: `src/stores/useSearchStore.ts` — `query`, `results` computed, `setQuery()` API
- Direct file inspection: `src/stores/useAuthStore.ts` — `isMaintainer = ref(false)`, writable, used in `fetchCurrentUser`
- Direct file inspection: `src/router/index.ts` — lines 71–78, exact insertion point for write-back
- Direct file inspection: `src/components/layout/Sidebar.vue` — `v-if="isMaintainer"` on admin section (line 244), dot pattern (lines 167–170)
- Direct file inspection: `src/router/index.spec.ts` — existing test coverage of router guard
- Direct file inspection: `src/components/layout/Navbar.spec.ts` — existing stubs, test coverage

### Secondary (MEDIUM confidence)
- `src/stores/useUIStore.ts` — `commandPaletteOpen`, `openCommandPalette()`, `closeCommandPalette()`
- `.planning/phases/06-fix-command-palette-admin-sidebar/06-CONTEXT.md` — locked implementation decisions
- `.planning/REQUIREMENTS.md` — SHEL-01, ADMN-01 requirement text

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, inspected directly
- Architecture: HIGH — Command primitive architecture verified by reading all 3 component files (Command.vue, CommandInput.vue, CommandItem.vue)
- Pitfalls: HIGH — derived from direct inspection of component source, not assumption
- Integration points: HIGH — exact line numbers verified in Navbar.vue, router/index.ts, Sidebar.vue

**Research date:** 2026-03-26
**Valid until:** 2026-04-25 (stable — no fast-moving external dependencies; all changes are internal wiring)
