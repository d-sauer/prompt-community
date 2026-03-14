# prompt-community

## What This Is

prompt-community is an internal web application — the company's shared AI knowledge base. It enables all employees to discover, share, and build on AI prompts, skill files, and multi-step instruction sets submitted by colleagues. Anonymous read access removes friction for consumers; GitHub OAuth gates contribution, maintaining identity and accountability without a separate auth system.

## Core Value

Any employee can find a proven AI prompt and use it immediately — no login, no friction, zero time between discovery and value.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Any user can browse, filter, search, and copy prompts without authenticating
- [ ] Authenticated users can submit prompts, skill files, and grouped skill sets via a structured editor
- [ ] Community signals (votes, comments, forks) surface quality content without editorial overhead
- [ ] Version history with diff view and non-destructive restore
- [ ] GitHub OAuth popup flow (no page redirect) for contribution and engagement
- [ ] User profiles showing submissions, saves, and activity
- [ ] Admin/curator panel for moderation queue, label management, and featured prompts
- [ ] PWA with offline browsing of cached prompts and background sync for writes
- [ ] Zero infrastructure cost — entire stack runs on Cloudflare free tiers

### Out of Scope

- Team collections (squad-level curated sets) — deferred to Phase 2 after adoption is validated
- Slack/Teams integration hooks — deferred until adoption is proven
- AI-assisted discovery — Phase 3, only if usage data supports the investment
- Mobile app — web-first, mobile later
- Real-time chat — high complexity, not core to community value
- Video posts — storage/bandwidth costs

## Context

**Architecture:** Vue 3 SPA deployed to Cloudflare Pages. No SSR — entire backend is the GitHub API (GraphQL for reads, REST for writes) accessed client-side via Octokit. Two-repo architecture: `app repo` (SPA + CI/CD) and `data repo` (GitHub Issues as data store).

**Infrastructure:** Cloudflare Pages (hosting) + Workers (OAuth proxy, image upload ~40 lines each) + R2 (image storage). Entire stack runs on free tiers at 50–400 users.

**Data model:** Every prompt/skill file is a GitHub Issue with YAML frontmatter. Categories/tags are GitHub Labels. Reactions map to Issue reactions. Version history lives in Issue comments (`## Version N — YYYY-MM-DD`). Diff computed client-side (jsdiff).

**Caching strategy:** ETag conditional requests (304 responses consume zero rate limit points) + TanStack Vue Query 5 stale-while-revalidate + MiniSearch client-side index (eliminates GitHub Search API dependency, 30 req/min cap).

**Auth tiers:** Anonymous / Authenticated (GitHub OAuth) / Maintainer (verified via GitHub collaborators API on login). Auth tokens held in Pinia memory only — never localStorage or cookies.

**Stack:** Vue 3 + TypeScript strict mode, Vite 8, shadcn-vue (Tailwind 4 + Reka UI), Pinia 3, TanStack Vue Query 5, Vue Router 5, VueUse, Octokit, markdown-it 14 + Shiki 4, MiniSearch, vite-plugin-pwa.

**Research available:** `design/research/` — vue-github-issues-platform research, wireframe specs for all 6 screens (S01–S06).

## Constraints

- **Tech Stack**: Vue 3 + Cloudflare — defined in architecture doc, not negotiable
- **Data Store**: GitHub Issues only — no traditional backend, no database
- **Cost**: Must stay within Cloudflare and GitHub free tiers at 50–400 users
- **Auth**: GitHub OAuth App (not GitHub App) — `public_repo` scope, tokens expire only on revocation
- **Browser Support**: Chrome/Firefox/Safari/Edge 120+/17+ only — internal tool

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|------------|
| GitHub Issues as data store | Zero infrastructure cost; GitHub provides audit trail, version history, access control natively | — Pending |
| Vue 3 SPA over Nuxt 3 | SSR overhead not needed; static CDN deployment; no benefit from Nitro server layer | — Pending |
| shadcn-vue (copy-in model) | Full customization without library lock-in; Reka UI gives WCAG AA primitives | — Pending |
| MiniSearch over GitHub Search API | GitHub Search API capped at 30 req/min; MiniSearch is instant (<50ms) and free | — Pending |
| GitHub OAuth App over GitHub App | Simpler setup for trusted internal users; upgrade path to GitHub App documented | — Pending |
| Two-repo architecture | Separates app deployment from data — migration path exists if GitHub Issues prove insufficient | — Pending |
| Dark mode as default | Single designed mode simplifies visual QA; system preference detection via VueUse | — Pending |

---
*Last updated: 2026-03-14 after initialization from design/planning-artifacts PRD*
