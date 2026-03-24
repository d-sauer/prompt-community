---
status: complete
phase: 03-community-and-profiles
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md]
started: 2026-03-24T00:00:00Z
updated: 2026-03-24T00:01:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Reaction Bar Visible
expected: Open a prompt detail page. Below the prompt content, a reaction bar shows 3 emoji buttons (👍 ❤️ 🚀) each with a reaction count.
result: pass

### 2. Toggle Reaction (authenticated)
expected: While signed in, click one of the emoji buttons. The count increments immediately (optimistic update) and the button shows an active/highlighted ring. Clicking it again decrements the count and removes the highlight.
result: pass

### 3. Reaction Sign-in CTA (unauthenticated)
expected: While signed out, click one of the emoji buttons. An inline sign-in prompt appears near the button (no page navigation). No reaction is submitted.
result: pass

### 4. View Comments Section
expected: On the prompt detail page, a comments section appears below the reaction bar. Existing comments show with author avatar, username, timestamp, and comment text.
result: pass

### 5. Post a Comment (authenticated)
expected: While signed in, type in the comment input and submit. The new comment appears in the list without a page refresh.
result: pass

### 6. Comment Sign-in CTA (unauthenticated)
expected: While signed out, the comment section shows a sign-in CTA instead of (or alongside) the post form. You cannot submit a comment.
result: pass

### 7. Flag a Prompt
expected: While signed in, a flag button is visible in the comment/action area. Clicking it shows a browser confirmation dialog ("Are you sure?" or similar). Accepting it submits without an error. The prompt gets a flag:review label on GitHub.
result: pass

### 8. Bookmark a Prompt (authenticated)
expected: While signed in, a bookmark icon is visible in the prompt actions area. Clicking it toggles the icon (Bookmark → BookmarkCheck). After a page refresh, the bookmark state is still active (localStorage persistence).
result: pass

### 9. Unauthenticated Bookmark CTA
expected: While signed out, clicking the bookmark icon shows a toast message "Sign in to save prompts" (or similar). No bookmark is saved.
result: pass

### 10. Public User Profile
expected: Navigate to /users/:login (replace :login with a real GitHub username, e.g. the app author's). The page shows the user's GitHub avatar, their submission count, total votes received, and a list of their submitted prompts in the Submitted tab.
result: pass

### 11. Own Profile Redirect
expected: While signed in, navigate to /profile. You are redirected to /users/:your-login (your own profile page) automatically.
result: pass

### 12. Saved Tab Shows Bookmarks
expected: On your own profile (/profile or /users/:login), open the Saved tab. Any prompts you bookmarked in Test 8 appear here.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
