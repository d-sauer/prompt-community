# Prompt Community

> The internal knowledge base for sharing AI prompts across your team.

![Version](https://img.shields.io/badge/version-1.0-blue) ![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883) ![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages%20%2B%20Workers-F38020)

---

## What is this?

Prompt Community is an internal web application — your team's shared AI knowledge base. It lets anyone discover, copy, and build on the AI prompts, skill files, and instruction sets that colleagues have found effective.

**The problem it solves:** Engineers develop effective prompts in isolation and they never propagate. What works stays siloed in someone's notes or chat history. Prompt Community makes that knowledge visible, searchable, and improvable through community signals.

**How it works:** No custom backend. All prompt data lives in a separate GitHub repository as Issues — each prompt is an issue with YAML frontmatter, categories are labels, votes are reactions, and version history is stored as structured comments. The SPA reads this data via the GitHub API directly from the browser, and a small Cloudflare Worker handles the OAuth token exchange.

**Access model:** Anonymous read-only browsing (zero friction for consumers), GitHub OAuth for contributions, and a maintainer tier for moderation — all without a separate auth system.

---

## Features

### Browse & Discover (no login required)
- Browse and filter prompts by category, AI model, and difficulty
- Sort by most voted, newest, or most commented
- Instant client-side search (<50ms, no API call) powered by MiniSearch
- View rendered markdown with syntax-highlighted code blocks
- Copy prompt content to clipboard with one click
- Share direct permalinks to any prompt

### Contribute (GitHub login)
- Create, edit, and fork prompts with a split-pane markdown editor
- Live preview while composing; auto-save draft every 30 seconds
- Upload images via drag-and-drop
- React to prompts (👍 ❤️ 🚀), post comments, bookmark prompts
- Publish versioned updates with optional changelog messages
- View full version history and compare any two versions side-by-side

### Moderate (maintainers only)
- Admin panel with moderation queue for flagged prompts
- Approve, hide, or delete prompts; bulk actions across multiple items
- Manage GitHub labels with namespace prefix conventions
- Mark prompts as featured; view full moderation log

---

## Architecture

### Two-repo model

| Repo | Purpose |
|------|---------|
| This repo | Vue SPA source, Cloudflare Worker source, CI/CD |
| `prompt-community-data` (separate) | GitHub Issues only — all prompt data lives here |

### GitHub as the backend

| Platform concept | GitHub primitive |
|-----------------|-----------------|
| Prompt / skill file | Issue (title + body with YAML frontmatter) |
| Category / tag | Label (`category:coding`, `model:claude`, …) |
| Vote / reaction | Issue reaction (👍 ❤️ 🚀) |
| Discussion | Issue comment |
| Version history | Structured comment (`## Version N — YYYY-MM-DD`) |
| Content status | Label (`state:featured`, `state:hidden`) |

### Three-layer caching

Staying within GitHub's API rate limits at scale requires layered caching:

1. **ETag conditional requests** — `If-None-Match` on every GitHub API call; a 304 response costs zero rate limit points
2. **TanStack Vue Query** — stale-while-revalidate in memory (60s for lists, 300s for profiles)
3. **MiniSearch IndexedDB index** — issues pre-fetched and indexed on first load; subsequent loads only fetch changed issues via `since` + ETags

---

## Tech Stack

**Frontend**
- [Vue 3.5](https://vuejs.org/) (Composition API, `<script setup>`)
- [TypeScript](https://www.typescriptlang.org/) strict mode
- [Vite 8](https://vitejs.dev/)

**UI**
- [shadcn-vue](https://www.shadcn-vue.com/) — components owned by the project (copy-in model, not a dependency)
- [Reka UI](https://reka-ui.com/) — WAI-ARIA compliant headless primitives
- [Tailwind CSS 4](https://tailwindcss.com/)

**State & Data**
- [Pinia 3](https://pinia.vuejs.org/) — client state (auth, UI, filters)
- [TanStack Vue Query 5](https://tanstack.com/query) — server state with stale-while-revalidate
- [VueUse 14](https://vueuse.org/) — composables (localStorage, dark mode, …)
- [Octokit](https://github.com/octokit/octokit.js) — GraphQL for reads, REST for writes
- [MiniSearch](https://lucaong.github.io/minisearch/) — client-side full-text search index
- [markdown-it](https://github.com/markdown-it/markdown-it) + [Shiki](https://shiki.style/) — markdown rendering with syntax highlighting
- [Vue Router 5](https://router.vuejs.org/)

**Infrastructure**
- [Cloudflare Pages](https://pages.cloudflare.com/) — static SPA hosting
- [Cloudflare Workers](https://workers.cloudflare.com/) — OAuth proxy + image upload proxy
- [Cloudflare R2](https://developers.cloudflare.com/r2/) — image storage (10 GB free, zero egress)

**Testing**
- [Vitest 4](https://vitest.dev/) + [@vue/test-utils](https://test-utils.vuejs.org/)

---

## Getting Started (Development)

```bash
git clone <this-repo>
cd prompt-community

# Copy and fill in environment variables
cp .env.example .env

# Install dependencies
npm install

# Start the dev server
npm run dev
```

See [setup.md](./setup.md) for the full deployment guide: creating the data repository, configuring the GitHub OAuth App, deploying the Cloudflare Worker, and setting up GitHub Pages or Cloudflare Pages.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run deploy:worker` | Deploy the Cloudflare OAuth Worker |

---

## Project Structure

```
src/
  components/
    ui/           # shadcn-vue components (owned by this project)
    layout/       # AppLayout, Navbar, Sidebar
    prompts/      # PromptCard, PromptDetail, PromptList
    editor/       # MarkdownEditor, MetadataForm
    admin/        # ModerationQueue, LabelManager
  views/          # 6 main screens (Browse, Detail, Editor, Profile, Admin, Auth)
  stores/         # Pinia stores: auth, prompts, UI, search, draft
  composables/    # TanStack Query hooks + general composables
  lib/
    github/       # Octokit client, GraphQL queries, REST mutations, ETag cache
    frontmatter/  # YAML frontmatter parsing
    diff/         # Version comparison utilities
    search/       # MiniSearch index management
  workers/        # Cloudflare Worker source (oauth.ts, upload.ts)
  router/         # Vue Router config + navigation guards
  types/          # TypeScript interfaces (Prompt, Comment, User, Version)
```

---

## Deployment

The app runs entirely on free tiers: Cloudflare Pages for hosting, two Cloudflare Workers (OAuth proxy + image upload), and Cloudflare R2 for image storage. The GitHub API provides all data reads and writes. Total infrastructure cost at 50–400 users: **$0**.

See [setup.md](./setup.md) for step-by-step deployment instructions.

---

## Roadmap

| Version | Focus |
|---------|-------|
| **v1.0** ✅ | Core prompt lifecycle — browse, create, version, react, comment, admin moderation, PWA offline |
| **v1.1** | Team collections — curated prompt sets per squad or domain |
| **v2.0** | Slack / Teams integration — notify channels on new or featured prompts |
| **v3.0** | AI-assisted discovery — surface prompts based on role or past behavior |

---

## Contributing

1. Prompts are stored in a separate data repository — submit new prompts via the app itself (GitHub OAuth required).
2. App bugs and feature requests: open an issue in this repo.
3. To contribute code: fork, branch, and open a pull request. The dev server (`npm run dev`) requires a filled `.env` pointing at a data repository with seeded labels.
