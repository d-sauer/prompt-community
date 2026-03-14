# S03 — New Prompt Editor: Requirements

## 1. Overview
- **Screen ID:** S03
- **Route(s):** `/prompts/new` (create mode), `/prompts/:id/edit` (edit mode)
- **Vue Component:** `PromptEditorView.vue`
- **Access Level:** Authenticated contributors only. Non-authenticated users redirected to GitHub OAuth flow.
- **Purpose:** Full-page editor for creating and editing AI prompts with live Markdown preview, auto-save drafts to browser localStorage, image uploads to Cloudflare R2, and keyboard shortcuts. Split layout: 55% editor (metadata + markdown editor) | 45% live preview. On mobile: tab-based (Write | Preview).

## 2. User Stories
1. As a prompt author, I want to write and format my prompt in Markdown so that I can create rich, structured content with code examples and emphasis.
2. As a prompt author, I want to assign metadata (category, model, difficulty, tags) to my prompt so that community members can filter and discover it easily.
3. As a prompt author, I want to see my formatted prompt rendered live in the preview pane so that I can verify appearance before publishing.
4. As a prompt author, I want my draft to auto-save every 30 seconds so that I don't lose work if my browser crashes.
5. As a prompt author, I want to upload images to my prompt via drag-drop so that I can include visual examples or diagrams.
6. As a prompt author, I want keyboard shortcuts (⌘S = Save Draft, ⌘↵ = Publish) so that I can work efficiently without reaching for the mouse.
7. As a prompt author, I want to be warned if I have unsaved changes before navigating away so that I don't accidentally lose work.
8. As a prompt editor, I want to edit an existing prompt and see what version I'm working on so that I understand my edit history.

## 3. Functional Requirements

### FR-01: Route Handling & Mode Detection
When a user navigates to `/prompts/new`, load the editor in "create" mode with empty form. When navigating to `/prompts/:id/edit`, fetch the prompt via `usePromptDetail(id)` hook and load its data into the form. Update page title and header accordingly ("New Prompt" vs. "Edit Prompt").

### FR-02: Authentication Guard
Before rendering the editor, check `useAuthStore.isAuthenticated`. If false, show OAuth login prompt or redirect to the GitHub OAuth callback flow. Only allow authenticated contributors (users with token) to access the editor.

### FR-03: Form State & Synchronization
Maintain form state in `useDraftStore` (title, content, category, model, difficulty, tags). Update the store reactively on every user input. Sync store to `localStorage` key `draft:${promptId || 'new'}` on every change (debounced 300ms).

### FR-04: Auto-save Draft Every 30 Seconds
Implement a `setInterval` (or `useInterval` from VueUse) that fires every 30 seconds. On each interval, save the current `useDraftStore` state to localStorage and update `useDraftStore.lastSaved` with the current timestamp. Display status badge showing "Saved 2 min ago" or "Unsaved changes" in real-time.

### FR-05: Title Input
Render a large text input (28px font, 600 weight) with placeholder "Give your prompt a descriptive title...". Bind to `useDraftStore.title` with v-model. Enforce max length of 120 characters. Emit warning if empty when attempting to publish.

### FR-06: Category Select
Provide a `<Select>` component with options: Coding, Writing, Analysis, Creative, System, Other. Each option displays a color dot prefix. Bind to `useDraftStore.metadata.category`. Store maps to GitHub issue label.

### FR-07: AI Model Select
Provide a `<Select>` component with options: GPT-4, GPT-4o, Claude 3.5, Claude 3, Gemini, Llama 3, Other. Bind to `useDraftStore.metadata.model`. Store maps to GitHub issue label.

### FR-08: Difficulty Select
Provide a `<Select>` component with options: Beginner, Intermediate, Advanced. Bind to `useDraftStore.metadata.difficulty`. Store maps to GitHub issue label.

### FR-09: Tags Chip Input
Render a text input inside a chip container. When user types a tag name and presses Enter, validate (alphanumeric + hyphens, max 20 chars per tag) and push to `useDraftStore.tags` array. Display tags as colored chips with × button to remove. Enforce max 5 tags. Prevent duplicate tags.

### FR-10: Markdown Toolbar
Render 14 icon buttons (H1, H2, H3, Bold, Italic, Strikethrough, Inline Code, Code Block, Quote, Horizontal Rule, Link, Image) in a horizontal toolbar above the editor textarea. On click, wrap selected text in the appropriate Markdown syntax or insert syntax at cursor position. For Bold: wrap selection in **, for Code: wrap in backticks, etc. For Link/Image: open Dialog with URL input.

### FR-11: Markdown Editor Textarea
Render a monospace textarea (Menlo/Monaco, 13px) with line numbers in a left gutter. Min-height 300px, grows with content. Bind to `useDraftStore.content` with v-model. Emit `input` event to trigger live preview updates. Support multi-line paste, tab indentation. Implement syntax awareness (basic: code block detection).

### FR-12: Live Word & Character Count
Display real-time count below the editor: "234 words · 1,247 chars". Calculate from `useDraftStore.content` using a computed property. Update on every keystroke.

### FR-13: Image Upload Area
Render a dashed-border zone with icon + text "Drop image here or click to upload". Support both drag-drop (ondrop) and click-to-browse (file input). Accept PNG, JPG, WebP up to 5MB. On file select/drop, POST to CF Worker endpoint `/api/upload` with multipart form-data. Worker authenticates via CF Worker environment variable. On success, receive JSON `{url: "https://r2-public-url"}`. Insert `![Uploaded image](url)` at current cursor position. Show upload progress spinner during upload. Handle errors gracefully (file too large, unsupported format, network error).

### FR-14: Live Markdown Preview Pane
Render the right-side preview column. Bind to `useDraftStore.content`. Parse via `markdown-it` instance. Syntax-highlight code blocks using `shiki` for language detection. Render as HTML via `v-html` binding. Update on every content change (debounced 300ms to avoid excessive re-renders). Show "Nothing to preview yet" placeholder when content is empty.

### FR-15: Preview Toggle (Rendered | Raw)
Provide two toggle buttons above the preview: "Rendered" and "Raw". When Rendered is active, show parsed HTML preview. When Raw is active, show the raw markdown source code in a `<pre>` block.

### FR-16: Status Badge & Last Saved Indicator
In the top bar, display a dynamic badge showing:
- "Saved 2 min ago" (green, from `useDraftStore.lastSaved`)
- "Saving..." (yellow, while mutation is in flight)
- "Unsaved changes" (orange/red, when `useDraftStore.isDirty = true`)
Update badge every 10 seconds with relative time calculation.

### FR-17: Back Navigation & Unsaved Changes Guard
Render a back link (← symbol) that navigates to `/prompts` or the referrer. If `useDraftStore.isDirty = true`, intercept via `router.beforeEach` and open a `ConfirmDialog` asking "You have unsaved changes. Save before leaving?". Options: Save Draft, Discard, Cancel. If Save is clicked, trigger the auto-save flow before navigation. If Discard is clicked, clear draft state and navigate. If Cancel is clicked, stay on page.

### FR-18: Publish Prompt
Render a primary [Publish] button in the top-right. On click, validate form (title non-empty, content non-empty). If valid, invoke `useCreatePrompt()` hook (or `useUpdatePrompt(id)` if in edit mode). Construct GitHub issue body with YAML frontmatter:
```yaml
---
category: Coding
model: GPT-4o
difficulty: Intermediate
tags: [api-design, testing]
version: 1
changelog: "Initial prompt"
---
```
followed by the markdown content. Post to GitHub API to create (or update) an issue. On success, invalidate the `usePrompts` cache and navigate to `/prompts/:newId`. Show toast notification "Prompt published successfully!". If error, show error toast with error details.

### FR-19: Save Draft Button
Render a secondary [Save Draft] button in the top-right. On click, manually trigger a save to `useDraftStore` + localStorage without publishing. Update `lastSaved` timestamp. Show brief "Draft saved" toast notification. Remains available even if form is incomplete.

### FR-20: Keyboard Shortcuts
Implement global key listeners:
- ⌘S (Ctrl+S on Windows/Linux): Save draft
- ⌘↵ (Ctrl+Enter): Publish prompt
- ⌘K in editor: Open link dialog
- Tab in editor: Insert 2 spaces (or 1 tab, preserve indentation)
Prevent default browser behavior (Ctrl+S) after handling.

### FR-21: Mobile Responsive Behavior
On screens < 768px, switch from side-by-side layout to tab-based interface. Render two tabs above the content: "Write" and "Preview". Clicking a tab shows either the full editor column or full preview column. Hide the live preview initially to avoid layout thrashing. All form fields and toolbar remain accessible in the "Write" tab.

### FR-22: Edit Mode Enhancement
When in `/prompts/:id/edit` mode (detected via route param), fetch the current prompt via `usePromptDetail(id)`. Prepopulate all form fields with the prompt's metadata and content. Display a yellow/orange badge "Editing Version X" (where X is `prompt.version`) near the title. On the preview, optionally show a "Diff hint" link to `/prompts/:id/versions` so the user can see what changed. When publishing edits, increment `version` and auto-generate a changelog entry or allow user to enter one.

### FR-23: Code Block Syntax Highlighting
When rendering the preview, use `shiki` to auto-detect code block language (from markdown info string: ` ```python `) and apply syntax highlighting. Fallback to plaintext if language is unrecognized. Include line numbers in code blocks for visibility.

## 4. Component Inventory
| UI Element | shadcn-vue Component | Reka UI Primitive | Notes |
|---|---|---|---|
| Top bar | Custom div | None | Status, title, buttons |
| Back link | router-link | None | Navigation |
| Status badge | Badge | None | "Saved Xm ago" / "Unsaved" |
| Title input | Input | Input | Large, 28px |
| Category select | Select | SelectRoot/SelectValue/SelectContent | Maps to GitHub labels |
| Model select | Select | SelectRoot/SelectValue/SelectContent | Maps to GitHub labels |
| Difficulty select | Select | SelectRoot/SelectValue/SelectContent | Maps to GitHub labels |
| Tags chip input | Input + Chip custom | Input + custom divs | Max 5 tags |
| Markdown toolbar | Button group | None | 14 icon buttons |
| Editor textarea | Textarea | TextareaRoot | Monospace, grows with content |
| Word count | Span | None | Computed property |
| Upload area | Custom div | DropZone (if available) | Drag-drop + file input |
| Preview container | Div | None | v-html binding |
| Toggle buttons | Button | None | Rendered vs Raw |
| Publish button | Button | None | Primary style |
| Save draft button | Button | None | Secondary style |
| Dialog (link/image) | Dialog | DialogRoot/DialogContent/DialogTrigger | Modal for URL input |
| Confirm dialog | Dialog | DialogRoot/DialogContent/DialogTrigger | Warn unsaved changes |
| Toast | Toast | ToastRoot/ToastAction | Success/error notifications |

## 5. State Management (Pinia)

### Reads from:
- `useAuthStore`: `isAuthenticated`, `user`, `token`, `isMaintainer`
- `useDraftStore`: `title`, `content`, `metadata` (category, model, difficulty), `tags`, `lastSaved`, `isDirty`
- `useUIStore`: `theme` (for styling)

### Writes to:
- `useDraftStore`: Update `title`, `content`, `metadata.category`, `metadata.model`, `metadata.difficulty`, `tags`, `lastSaved`, `isDirty`
- `usePromptsStore`: On publish, optionally update `selectedPromptId` to the newly created prompt

## 6. API & Data (TanStack Vue Query)

| Hook | Type | GitHub API | Cache Key | staleTime |
|---|---|---|---|---|
| `usePromptDetail(id)` | Query | GET /repos/{owner}/{repo}/issues/{issue_number} | `['prompt', id]` | 5 minutes |
| `useCreatePrompt()` | Mutation | POST /repos/{owner}/{repo}/issues | N/A | N/A |
| `useUpdatePrompt(id)` | Mutation | PATCH /repos/{owner}/{repo}/issues/{issue_number} | N/A | N/A |
| `usePrompts()` | Query (background) | GET /repos/{owner}/{repo}/issues | `['prompts']` | 2 minutes |

## 7. Interaction Patterns

| Trigger | Action | Implementation |
|---|---|---|
| User types in title/content/selectors | Update `useDraftStore`, set `isDirty=true` | v-model binding + debounced store update |
| Every 30 seconds | Auto-save to localStorage | `useInterval` from VueUse, persist via `useLocalStorage` |
| User clicks [Save Draft] | Manually flush draft to localStorage | `useDraftStore.save()` method, show toast |
| User clicks [Publish] | Validate form, call `useCreatePrompt()`/`useUpdatePrompt()` | Construct YAML + markdown body, handle success/error |
| User clicks back link with unsaved changes | Show ConfirmDialog | router.beforeEach guard, "Save/Discard/Cancel" dialog |
| User clicks toolbar button | Wrap selection or insert syntax | Get textarea ref, manipulate selection, update v-model |
| User drags image onto upload area | POST to CF Worker, insert markdown link | FormData with file, show progress, insert at cursor |
| User presses ⌘S | Save draft | Global keydown listener, prevent default |
| User presses ⌘↵ | Publish | Global keydown listener, invoke publish flow |
| User presses ⌘K in editor | Open link dialog | Textarea focus detector, show Dialog component |
| Content changes | Update preview | Debounced (300ms) markdown-it parse + shiki highlight |
| Window beforeunload event | Block if isDirty | window.onbeforeunload, return confirmation message |

## 8. Keyboard Shortcuts

| Shortcut | Action | Scope |
|---|---|---|
| ⌘S / Ctrl+S | Save draft to localStorage | Global (prevent browser default) |
| ⌘↵ / Ctrl+Enter | Publish prompt | Global |
| ⌘K / Ctrl+K | Open link dialog | Only when editor textarea has focus |
| Tab | Insert 2 spaces | Only when editor textarea has focus |
| Shift+Tab | Decrease indent | Only when editor textarea has focus |

## 9. Responsive Behavior

### Desktop (≥1024px)
- Full two-column layout: 55% editor | 45% preview (calculated via CSS Grid)
- All controls visible simultaneously
- Toolbar and metadata above editor
- Preview updated in real-time

### Tablet (768px–1023px)
- Narrow two-column layout or tabs (depends on viewport width decision)
- May compress toolbar to icon-only mode
- Preview becomes less prominent or switches to tab

### Mobile (<768px)
- Single-column, tab-based interface
- Tab 1: "Write" — metadata, toolbar, editor textarea
- Tab 2: "Preview" — rendered markdown preview
- Full-height editor/preview on each tab
- Toolbar icons may stack or be scrollable

## 10. Accessibility (a11y)

- **Semantic HTML:** Use `<label>` elements for all form fields (category, model, difficulty, tags). Associate with `for` attribute.
- **ARIA attributes:**
  - Markdown toolbar buttons: `aria-label` (e.g., "Insert heading 1")
  - Status badge: `aria-live="polite"` to announce save status changes
  - Image upload area: `role="button"` with `aria-label="Upload image"`
  - Dialogs: Standard Dialog accessibility patterns (focus trap, close on Escape)
- **Keyboard navigation:** All buttons and inputs must be keyboard-accessible. Tab order follows logical flow (title → category → model → difficulty → tags → toolbar → editor).
- **Color contrast:** Text colors (#e2e8f0 on #08080f) meet WCAG AA standards.
- **Focus indicators:** Visible focus ring on all interactive elements (2px outline, #7c3aed).
- **Screen reader:** Announce unsaved changes badge, validation errors, toast notifications.

## 11. Acceptance Criteria

### AC-01: Create New Prompt
Given a user navigates to `/prompts/new` while authenticated, when they fill in title, select category/model/difficulty, enter markdown content, and click [Publish], then the GitHub API should receive a POST request with YAML frontmatter + markdown body, and the user should be navigated to `/prompts/:newId` with a success toast.

### AC-02: Edit Existing Prompt
Given a user navigates to `/prompts/:id/edit`, when the page loads, then the form should be pre-populated with the prompt's current title, category, model, difficulty, tags, and content. A badge should show "Editing Version X".

### AC-03: Auto-save Draft
Given a user enters text in the title field, when 30 seconds have passed without changes, then the draft should be saved to localStorage under `draft:new` (or `draft:${id}` if editing), and the status badge should update to "Saved Xm ago".

### AC-04: Unsaved Changes Warning
Given a user has made changes (isDirty=true), when they attempt to navigate away via the back link or browser back button, then a ConfirmDialog should appear asking to save changes, with options: Save, Discard, Cancel.

### AC-05: Image Upload
Given a user drags a PNG image (3MB) onto the upload area, when the file is received, then a POST request should be sent to the CF Worker `/api/upload` endpoint, the image should be stored in Cloudflare R2, and a markdown link `![alt text](r2-public-url)` should be inserted at the cursor position in the editor.

### AC-06: Keyboard Shortcut — ⌘S
Given a user is editing the prompt, when they press ⌘S (Ctrl+S on Windows/Linux), then the browser's default save dialog should be suppressed, and the draft should be saved to localStorage immediately.

### AC-07: Keyboard Shortcut — ⌘↵
Given a user has entered a title and content, when they press ⌘↵ (Ctrl+Enter), then the publish flow should be triggered as if they clicked [Publish].

### AC-08: Markdown Toolbar — Bold
Given a user has selected the text "hello world" in the editor, when they click the Bold button, then the text should be wrapped as "**hello world**" and the preview should update immediately.

### AC-09: Live Preview
Given a user types a code block (` ```python `), when the input event fires, then the preview should render the code block with syntax highlighting for Python within 300ms.

### AC-10: Category/Model/Difficulty Labels
Given the user selects "Coding" for category and "GPT-4o" for model, when they publish, then the GitHub issue should be created with labels `category:coding` and `model:gpt-4o` (or similar standardized label format).

### AC-11: Tags Max 5
Given a user has added 5 tags, when they attempt to add a 6th tag, then the input should be disabled (or the add action ignored), and an error message should appear: "Maximum 5 tags allowed".

### AC-12: Title Max 120 Characters
Given a user enters a 150-character title, when the input reaches 120 characters, then further input should be prevented or a warning should appear.

### AC-13: Mobile Tab Interface
Given a user is on a mobile device (<768px), when the page loads, then two tabs should be visible: "Write" and "Preview", and clicking each tab should switch the view.

### AC-14: Word Count Update
Given a user has entered "The quick brown fox", when the word count is calculated, then it should display "4 words · 19 chars".

### AC-15: Draft Recovery
Given a user starts editing a prompt and the browser closes unexpectedly, when they return to `/prompts/new` or `/prompts/:id/edit`, then the draft should be recovered from localStorage and all fields should be pre-populated with the previous state.
