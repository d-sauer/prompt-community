---
phase: 02-read-and-contribute
plan: "02"
subsystem: ui
tags: [vue, pinia, vueuse, tanstack-query, cloudflare-workers, r2, github-rest, shadcn-vue, tailwind]

# Dependency graph
requires:
  - phase: 02-read-and-contribute
    plan: "01"
    provides: usePromptDetail, PromptFrontmatter, buildFrontmatter, initMarkdown/renderMarkdown, useAuthStore, useSearchStore, router, shadcn-vue components

provides:
  - useDraftStore: auto-save every 30s via useIntervalFn, useLocalStorage persistence, isDirty tracking, save/recover/clear
  - upload.ts CF Worker: handleUpload validates auth/type/size, uploads to R2, returns public URL
  - mutations.ts: createIssue, updateIssue, createVersionComment GitHub REST helpers
  - useCreatePrompt: TanStack useMutation POST /issues, resetQueries on success, draftStore.clear()
  - useUpdatePrompt: edit mode (PATCH) and version mode (POST comment + PATCH) — VERS-01
  - PromptEditorView: create/edit/fork modes with auth guard and validation
  - EditorLayout: ResizablePanelGroup split pane (desktop) + Tabs (mobile), beforeunload guard
  - 6 editor components: MarkdownEditor, MetadataFields, TagsInput, ImageUploadZone, PreviewPane, StatusBadge
  - router: /prompts/:id/edit route + beforeEach unsaved-changes confirm guard

affects:
  - 02-03-versions (uses useUpdatePrompt version mode, MarkdownBody)
  - 03-admin (uses mutations.ts for admin operations)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useIntervalFn (not useInterval) for running side-effect callbacks on interval
    - suppressDirty flag pattern to batch-update store fields without triggering isDirty watch
    - Inline R2Bucket interface in worker file (avoids @cloudflare/workers-types dependency in browser build)
    - Mock formData() on Request object in tests to avoid jsdom multipart parsing timeout
    - vi.mock('@vueuse/core') with capturedIntervalCallback pattern for testing useIntervalFn

key-files:
  created:
    - src/stores/useDraftStore.ts — Pinia setup store with auto-save, useLocalStorage, isDirty tracking
    - src/stores/useDraftStore.spec.ts — 5 passing tests for draft store behavior
    - src/workers/upload.ts — CF Worker handleUpload with auth/type/size validation and R2 upload
    - src/workers/upload.spec.ts — 4 passing tests for upload validation
    - src/lib/github/mutations.ts — createIssue, updateIssue, createVersionComment REST helpers
    - src/composables/queries/useCreatePrompt.ts — TanStack useMutation for creating prompts
    - src/composables/queries/useUpdatePrompt.ts — TanStack useMutation for edit/version update
    - src/components/editor/EditorLayout.vue — split pane layout with mobile tabs
    - src/components/editor/MarkdownEditor.vue — shadcn Textarea with monospace font
    - src/components/editor/MetadataFields.vue — type/category/model/difficulty/usage selects
    - src/components/editor/TagsInput.vue — chip input, max 5 tags, Enter/comma/backspace
    - src/components/editor/ImageUploadZone.vue — drag-and-drop + file picker with CF Worker upload
    - src/components/editor/PreviewPane.vue — 300ms debounced markdown rendering
    - src/components/editor/StatusBadge.vue — Saved/Unsaved/Saving state display
  modified:
    - src/views/PromptEditorView.vue — full create/edit/fork implementation (was placeholder)
    - src/router/index.ts — added /prompts/:id/edit route + unsaved-changes beforeEach guard

key-decisions:
  - "useIntervalFn (not useInterval) for auto-save — useInterval returns a counter ref, useIntervalFn runs a callback"
  - "suppressDirty flag + nextTick reset in recover/clear — Vue watch fires async so sync flag prevents isDirty bounce"
  - "Inline R2Bucket interface in upload.ts — avoids adding @cloudflare/workers-types to browser build tsconfig"
  - "Mock formData() on Request in upload.spec.ts — jsdom's Request with FormData body hangs on .formData() due to multipart parser"
  - "file.arrayBuffer() instead of file.stream() — File.prototype.stream() not available in jsdom test environment"

patterns-established:
  - "VueUse mock pattern: vi.mock('@vueuse/core') with capturedIntervalCallback for testing interval-driven behavior"
  - "suppressDirty pattern: set flag + field values synchronously, reset in nextTick after watch fires"
  - "CF Worker testing: mock formData() directly on Request to avoid Node.js multipart parsing issues"

requirements-completed:
  - CONT-01
  - CONT-02
  - CONT-03
  - CONT-04
  - CONT-05
  - CONT-06
  - CONT-07
  - CONT-08
  - CONT-09
  - CONT-10
  - CONT-11
  - VERS-01

# Metrics
duration: 9min
completed: 2026-03-15
---

# Phase 2 Plan 02: Read and Contribute — Content Editor Summary

**Split-pane markdown editor with auto-save (useDraftStore), CF Worker R2 image upload, GitHub REST create/update/version mutations, and PromptEditorView supporting create/edit/fork modes**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-15T06:08:15Z
- **Completed:** 2026-03-15T06:17:36Z
- **Tasks:** 3
- **Files modified:** 16

## Accomplishments

- Complete contribution editor: PromptEditorView with create/edit/fork modes, pre-fill from usePromptDetail, auth guard, field validation before publish
- useDraftStore with 30-second auto-save via useIntervalFn, useLocalStorage persistence, isDirty tracking with suppressDirty batch-update pattern
- CF Worker upload endpoint with auth/type/size validation, R2 bucket storage, CORS preflight — tested with mocked formData() to bypass jsdom timeout
- GitHub REST mutations (createIssue, updateIssue, createVersionComment) + TanStack useCreatePrompt/useUpdatePrompt composables
- 7 editor components: EditorLayout (ResizablePanelGroup + Tabs), MarkdownEditor, MetadataFields, TagsInput (max 5, chip input), ImageUploadZone (drag-and-drop + file picker), PreviewPane (300ms debounce), StatusBadge
- Unsaved-changes guard: router beforeEach confirm dialog + EditorLayout beforeunload handler (CONT-11)

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 test stubs + useDraftStore + CF Worker upload** - `b409986` (feat)
2. **Task 2: GitHub REST mutations (mutations.ts, useCreatePrompt, useUpdatePrompt)** - `d09ba9f` (feat)
3. **Task 3: PromptEditorView and editor components** - `b580a93` (feat)

## Files Created/Modified

- `src/stores/useDraftStore.ts` — Pinia setup store: auto-save every 30s, useLocalStorage persistence, isDirty/lastSaved/save/recover/clear
- `src/stores/useDraftStore.spec.ts` — 5 tests: interval callback, isDirty toggle, save/recover/clear
- `src/workers/upload.ts` — CF Worker: auth header check (401), type validation (400), size check (413), R2 upload + CORS
- `src/workers/upload.spec.ts` — 4 tests: rejection + success path with mocked formData/R2
- `src/lib/github/mutations.ts` — createIssue, updateIssue, createVersionComment REST helpers via Octokit
- `src/composables/queries/useCreatePrompt.ts` — useMutation, buildFrontmatter body, namespace:value labels, resetQueries + draftStore.clear on success
- `src/composables/queries/useUpdatePrompt.ts` — edit mode (PATCH) and version mode (POST comment + PATCH bump) — VERS-01
- `src/views/PromptEditorView.vue` — full create/edit/fork view with mode detection, pre-fill, validate, handlePublish
- `src/components/editor/EditorLayout.vue` — ResizablePanelGroup (desktop) + Tabs (mobile), publish toolbar, beforeunload guard
- `src/components/editor/MarkdownEditor.vue` — Textarea with monospace font, String($event) cast
- `src/components/editor/MetadataFields.vue` — type/category/model/difficulty selects + usage instructions; ExtendedFrontmatter type
- `src/components/editor/TagsInput.vue` — chip input, max 5, Enter/comma add, backspace remove
- `src/components/editor/ImageUploadZone.vue` — drag-and-drop + file picker, client validation, CF Worker fetch, insert markdown link
- `src/components/editor/PreviewPane.vue` — 300ms debounced useDebounceFn, markdownReady guard
- `src/components/editor/StatusBadge.vue` — computed statusText/statusClass from isDirty/lastSaved/isSaving
- `src/router/index.ts` — added /prompts/:id/edit route (requiresAuth) + unsaved-changes beforeEach guard

## Decisions Made

- `useIntervalFn` (not `useInterval`) for auto-save — `useInterval` returns a counter ref, `useIntervalFn` runs a callback on interval
- suppressDirty flag with nextTick reset in `recover()` — Vue watch fires asynchronously, so synchronous flag prevents the watch from setting isDirty=true after recover sets fields
- Inline `R2Bucket` interface in upload.ts — avoids pulling `@cloudflare/workers-types` into the browser build's tsconfig chain
- Mock `formData()` on Request in upload.spec.ts — jsdom's `Request.formData()` with multipart body hangs indefinitely; mocking the method directly bypasses the parser

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] useInterval → useIntervalFn for callback-based interval**
- **Found during:** Task 1 (build verification)
- **Issue:** `useInterval` from VueUse returns a reactive counter ref — passing a callback is a type error
- **Fix:** Changed to `useIntervalFn(save, 30_000)` which accepts `() => void` callback
- **Files modified:** src/stores/useDraftStore.ts, src/stores/useDraftStore.spec.ts
- **Verification:** TypeScript compiles, tests pass
- **Committed in:** b580a93 (Task 3 commit — fix applied during build verification)

**2. [Rule 1 - Bug] file.stream() → file.arrayBuffer() for R2 upload**
- **Found during:** Task 1 (test run)
- **Issue:** `File.prototype.stream()` is not available in jsdom; test threw "stream is not a function"
- **Fix:** Changed to `await file.arrayBuffer()` which jsdom supports
- **Files modified:** src/workers/upload.ts
- **Verification:** upload.spec.ts passes
- **Committed in:** b409986 (Task 1 commit)

**3. [Rule 3 - Blocking] R2Bucket global type not available in browser tsconfig**
- **Found during:** Task 3 (build verification)
- **Issue:** `R2Bucket` is a Cloudflare Workers global not declared in tsconfig.app.json
- **Fix:** Defined inline `interface R2Bucket { put(...): Promise<void> }` in upload.ts
- **Files modified:** src/workers/upload.ts, src/workers/upload.spec.ts
- **Verification:** `npm run build` zero errors
- **Committed in:** b580a93 (Task 3 commit)

**4. [Rule 1 - Bug] AcceptableValue (includes bigint) not assignable to string in MetadataFields**
- **Found during:** Task 3 (build verification)
- **Issue:** shadcn-vue Select `@update:model-value` emits `AcceptableValue` (includes `bigint`); update() typed as `string | number | boolean | null | undefined` was too narrow
- **Fix:** Changed update() parameter to `unknown` and cast with `String(value ?? '')`
- **Files modified:** src/components/editor/MetadataFields.vue
- **Verification:** Build passes
- **Committed in:** b580a93 (Task 3 commit)

**5. [Rule 1 - Bug] Textarea @update:model-value emits string | number**
- **Found during:** Task 3 (build verification)
- **Issue:** shadcn Textarea emits `string | number` but defineModel is typed as `string`
- **Fix:** Changed template to `model = String($event)` in MarkdownEditor.vue
- **Files modified:** src/components/editor/MarkdownEditor.vue
- **Verification:** Build passes
- **Committed in:** b580a93 (Task 3 commit)

**6. [Rule 2 - Missing Critical] suppressDirty flag for recover/clear operations**
- **Found during:** Task 1 (test run — recover() test failed: isDirty=true after recover)
- **Issue:** Vue's watch fires asynchronously; after recover() sets fields, watch fired and set isDirty=true overriding the false set synchronously
- **Fix:** Added suppressDirty flag to prevent watch from firing during bulk field updates; reset in nextTick
- **Files modified:** src/stores/useDraftStore.ts
- **Verification:** recover() test passes: isDirty=false after two nextTicks
- **Committed in:** b580a93 (Task 3 commit)

---

**Total deviations:** 6 auto-fixed (3 bugs, 1 blocking, 1 missing critical, 1 type narrowing)
**Impact on plan:** All auto-fixes essential for TypeScript correctness, test compatibility, and functional correctness. No scope creep.

## Issues Encountered

- jsdom localStorage unavailable (`--localstorage-file` warning without valid path) — required mocking `useLocalStorage` from VueUse in useDraftStore.spec.ts; all other tests unaffected
- router/index.spec.ts shows stderr warnings from useDraftStore initializing without mocked localStorage — these are non-fatal (tests still pass)

## User Setup Required

**External services require manual configuration for image uploads (CONT-05):**

1. **Cloudflare R2 bucket**: Create bucket in Cloudflare Dashboard → R2 → Create bucket. Enable Public Access under Settings.
2. **Wrangler binding**: Add `[[r2_buckets]]` with binding name `R2_BUCKET` pointing to your bucket in `wrangler.toml`
3. **Worker env vars**: Add `R2_PUBLIC_URL = 'https://your-bucket.r2.dev'` and `APP_ORIGIN = 'https://your-app.pages.dev'` under `[vars]` in `wrangler.toml`
4. **App env var**: Add `VITE_R2_PUBLIC_URL=https://your-bucket.r2.dev` to `.env.local`

Without R2 setup, all editor features work except image upload (ImageUploadZone will show an error toast).

## Next Phase Readiness

- useUpdatePrompt version mode ready for Plan 02-03 (version history)
- MarkdownBody component from 02-01 available for diff view in 02-03
- /prompts/:id/versions route stub wired (implemented in 02-03)
- CONT-05/VERS-01 require user R2 setup (documented above) before images and version history are fully functional

---
## Self-Check: PASSED

- All 17 files verified present on disk
- All 3 task commits verified: b409986, d09ba9f, b580a93
- `npm run build` — zero TypeScript errors
- `npx vitest run` — 59 passed, 10 todo, 0 failed

*Phase: 02-read-and-contribute*
*Completed: 2026-03-15*
