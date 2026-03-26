# prompt-community

## What This Is

prompt-community is an internal web application — the company's shared AI knowledge base. It enables all employees to discover, share, and build on AI prompts, skill files, and multi-step instruction sets submitted by colleagues. Anonymous read access removes friction for consumers; GitHub OAuth gates contribution, maintaining identity and accountability without a separate auth system.

The v1.0 MVP shipped a complete feature set: full prompt lifecycle (browse → create → version → react → comment), admin moderation panel, PWA offline support, and ETag-based rate-limit-efficient GitHub API caching.

## Core Value

Any employee can find a proven AI prompt and use it immediately — no login, no friction, zero time between discovery and value.

## Requirements

### Validated

- ✓ Any user can browse, filter (category/model), sort (votes/newest/comments), and search prompts without authenticating — v1.0
- ✓ Client-side MiniSearch index — results in <50ms, no API call, no GitHub Search API dependency — v1.0
- ✓ Authenticated users can create, edit, fork prompts with split-pane markdown editor, image upload, and auto-save — v1.0
- ✓ Version history with full diff view (side-by-side/unified) and non-destructive restore — v1.0
- ✓ GitHub OAuth popup flow — no page redirect; token held in Pinia memory only — v1.0
- ✓ Community signals — reactions (👍❤️🚀 with optimistic UI), comments, bookmarks, flags — v1.0
- ✓ User profiles showing submissions, saves, and aggregate stats — v1.0
- ✓ Admin/curator panel — moderation queue, label management, featured prompts, action log — v1.0
- ✓ PWA — offline browsing of cached prompts, queued write sync on reconnect — v1.0
- ✓ ETag conditional requests — 304 responses = zero rate-limit cost; localStorage LRU cache per user — v1.0
- ✓ Zero infrastructure cost — entire stack on Cloudflare and GitHub free tiers — v1.0

### Active

- [ ] Team collections — curated prompt sets per squad or domain (GROW-01)
- [ ] Slack/Teams integration hooks for new/featured prompts (GROW-02)
- [ ] AI-assisted discovery — surface prompts based on role or browsing behaviour (GROW-03)
- [ ] Activity tab — user activity history (currently "coming soon" placeholder)
- [ ] Human end-to-end verification of admin panel, PWA, and OAuth flows in live browser

### Out of Scope

- Real-time chat — high complexity, not core to community value
- Video posts — storage/bandwidth costs, defer to v2+
- Mobile app — web-first; PWA covers mobile use case adequately
- SSR / Nuxt 3 — no benefit when backend is GitHub API; static CDN is the right deployment model
- GitHub App (vs OAuth App) — simpler setup for trusted internal users; upgrade path documented but deferred
- Separate backend/database — zero-cost constraint; GitHub Issues + Cloudflare free tiers is the entire stack

## Context

**Shipped v1.0 with 12,271 LOC TypeScript/Vue.**
**Tech stack:** Vue 3.5 + TypeScript strict, Vite 8, shadcn-vue (Tailwind 4 + Reka UI), Pinia 3, TanStack Vue Query 5, Vue Router 5, VueUse, Octokit, markdown-it 14 + Shiki 4, MiniSearch, vite-plugin-pwa.

**Architecture:** Vue 3 SPA deployed to Cloudflare Pages. No SSR — entire backend is the GitHub API (GraphQL for reads, REST for writes) accessed client-side via Octokit. Two-repo architecture: `app repo` (SPA + CI/CD) and `data repo` (GitHub Issues as data store).

**Infrastructure:** Cloudflare Pages (hosting) + Workers (OAuth proxy, image upload ~40 lines each) + R2 (image storage). Entire stack runs on free tiers at 50–400 users.

**Data model:** Every prompt/skill file is a GitHub Issue with YAML frontmatter. Categories/tags are GitHub Labels. Reactions map to Issue reactions. Version history lives in Issue comments. Diff computed client-side (jsdiff).

**Caching strategy:** ETag conditional requests (304 responses consume zero rate limit points) + TanStack Vue Query 5 stale-while-revalidate + MiniSearch client-side index (eliminates GitHub Search API dependency).

**Auth tiers:** Anonymous / Authenticated (GitHub OAuth) / Maintainer (verified via GitHub collaborators API on login). Auth tokens held in Pinia memory only — never localStorage or cookies.

**Known issues / tech debt from v1.0:**
- Human verification pending for: admin panel E2E with live GitHub data, PWA service worker lifecycle, OAuth live-session flows (unit tests pass; browser-level confirmation not done)
- Dead computed `avatarUrl` in `UserProfileView.vue:20` — `avatarSrc` is the real computed
- Activity tab placeholder "Activity coming soon." — intentional v2 deferred
- VALIDATION.md nyquist frontmatter never updated across all 7 phases (wave 0 tests ran; metadata not written back)
- `mutations.ts` 11 call sites use `createRestClient(token)` without `userLogin` — `''` ETag bucket for mutation REST (writes, not cacheable reads; semantically correct but inconsistent with ETag design)

## Constraints

- **Tech Stack**: Vue 3 + Cloudflare — defined in architecture doc, not negotiable
- **Data Store**: GitHub Issues only — no traditional backend, no database
- **Cost**: Must stay within Cloudflare and GitHub free tiers at 50–400 users
- **Auth**: GitHub OAuth App (not GitHub App) — `public_repo` scope, tokens expire only on revocation
- **Browser Support**: Chrome/Firefox/Safari/Edge 120+/17+ only — internal tool

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|------------|
| GitHub Issues as data store | Zero infrastructure cost; GitHub provides audit trail, version history, access control natively | ✓ Good — works well at v1.0 scale |
| Vue 3 SPA over Nuxt 3 | SSR overhead not needed; static CDN deployment; no benefit from Nitro server layer | ✓ Good — fast deploys, simple CF Pages config |
| shadcn-vue (copy-in model) | Full customization without library lock-in; Reka UI gives WCAG AA primitives | ✓ Good — no upgrade friction |
| MiniSearch over GitHub Search API | GitHub Search API capped at 30 req/min; MiniSearch is instant (<50ms) and free | ✓ Good — INFR-03 met, eliminates rate limit risk |
| GitHub OAuth App over GitHub App | Simpler setup for trusted internal users; upgrade path to GitHub App documented | ✓ Good — no issues at v1.0 |
| Two-repo architecture | Separates app deployment from data — migration path exists if GitHub Issues prove insufficient | ✓ Good — clean separation |
| Dark mode as default | Single designed mode simplifies visual QA; system preference detection via VueUse | ✓ Good — no visual QA drift |
| ETag localStorage LRU (not in-memory Map) | Persistence across page reloads; per-user scoping avoids ETag collision between accounts | ✓ Good — INFR-05 fully operational |
| CSRF state in Worker closure (not sessionStorage) | sessionStorage not shared between opener and OAuth popup | ✓ Good — secure and practical |
| Octokit makeBoundFetch adapter for ETag | Hooks into Octokit's fetch layer without modifying query callsites | ✓ Good — 0 callsite changes needed |
| ProfileRedirectView watch() + setTimeout pattern | Async fetchCurrentUser must resolve before redirect fires; synchronous router.replace races | ✓ Good — no race condition |
| invalidateAdmin() centralizes all 3 cache keys | queue + stats + log invalidated together; all 7 mutations benefit automatically | ✓ Good — log freshness fixed |

---
*Last updated: 2026-03-26 after v1.0 milestone*
