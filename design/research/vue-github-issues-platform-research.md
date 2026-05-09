> **HISTORICAL DOCUMENT — SUPERSEDED**
> This research describes the v1 GitHub-Issues-as-database architecture,
> which was replaced by the v2 Cloudflare Workers + D1 + Hono backend
> (completed 2026-05-09). See `design/change-request-v2.md` for the v2 PRD
> and `design/planning-artifacts/architecture.md` for the current architecture.

# Building a Community Platform on Vue.js and GitHub Issues
## Updated Technology Research — All Dependencies Verified Active (March 2026)

**Use GitHub Issues as your database, Cloudflare as your infrastructure, and Vue 3 as your frontend — the entire stack runs at zero cost for 50–400 users.** The architecture maps each AI prompt to a GitHub Issue, reactions to votes, comments to discussion threads, and labels to categories. This approach is battle-tested by projects like utterances (~9.5k stars) and giscus (~9k stars) and works within GitHub's API limits when you combine GraphQL reads, per-user authentication via a GitHub App, aggressive ETag-based caching, and client-side search indexing with MiniSearch. Below is the complete technology stack, architectural blueprint, and implementation strategy.

Every library in this stack has been verified as **actively maintained** with at least one npm release within the past 12 months. One originally recommended package (`front-matter`) was found unmaintained and has been replaced.

---

## Maintenance audit summary

| Package | Latest Version | Last Published | Status |
|---|---|---|---|
| `vue` | 3.5.x | Active | ✅ Core framework, monthly releases |
| `vite` | 8.0.x | Active (weekly patches) | ✅ Major release cycle, very active |
| `vue-router` | 5.0.3 | Active | ✅ Part of official Vue ecosystem |
| `pinia` | 3.0.4 | ~4 months ago | ✅ Official Vue state management |
| `@tanstack/vue-query` | 5.92.9 | ~2 months ago | ✅ v6 devtools already shipping |
| `shadcn-vue` | 2.4.3 | ~3 months ago | ✅ Nov 2025 changelog updates, MCP server launched Feb 2026 |
| `reka-ui` | 2.9.0 | Active | ✅ Underpins shadcn-vue, actively maintained |
| `tailwindcss` | 4.x | Active | ✅ v4 released, frequent updates |
| `@vueuse/core` | 14.2.1 | ~1 month ago | ✅ 200+ composables, very active |
| `markdown-it` | 14.1.1 | ~3 weeks ago | ✅ New release Feb 2026, org active |
| `shiki` | 4.0.1 | ~2 days ago | ✅ Major v4 just released |
| `@octokit/graphql` | 9.0.3 | ~1 month ago | ✅ Official GitHub SDK, very active |
| `@octokit/core` | 7.0.6 | ~2 months ago | ✅ |
| `minisearch` | 7.2.0 | ~6 months ago | ✅ Snyk rates "Sustainable", 285k weekly downloads |
| `yaml` | 2.8.2 | ~3 months ago | ✅ 85M weekly downloads, replaces `front-matter` |
| `vitest` | 4.1.0 | ~1 day ago | ✅ Very active, major v4 release |
| `vite-plugin-pwa` | 1.2.0 | ~3 months ago | ✅ Zero-config PWA for Vite |
| ~~`front-matter`~~ | ~~4.0.2~~ | ~~6 years ago~~ | ❌ **REPLACED** — see section below |
| ~~`gray-matter`~~ | ~~4.0.3~~ | ~~5 years ago~~ | ❌ **NOT RECOMMENDED** — also unmaintained |

---

## The recommended technology stack

The core principle: **keep the frontend purely static and push all server-side logic into lightweight edge functions**. Plain Vue 3 + Vite beats Nuxt 3 for this use case — Nuxt's SSR layer, Nitro server runtime, and file-based conventions add unnecessary complexity when your entire backend is the GitHub API and your deployment target is a static CDN.

| Layer | Technology | Package / Version | Last Activity |
|---|---|---|---|
| Framework | Vue 3 | `vue` 3.5.x | Active |
| Build tool | Vite | `vite` 8.0 | Weekly patches |
| Routing | Vue Router | `vue-router` 5.0.3 | Active |
| Client state | Pinia | `pinia` 3.0.4 | Nov 2025 |
| Server state / caching | TanStack Vue Query | `@tanstack/vue-query` 5.x | Jan 2026 |
| UI components | shadcn-vue + Reka UI | `shadcn-vue` 2.4.3 / `reka-ui` 2.9.0 | Nov 2025 |
| CSS | Tailwind CSS | `tailwindcss` 4.x | Active |
| Composable utilities | VueUse | `@vueuse/core` 14.2.1 | Feb 2026 |
| Markdown rendering | markdown-it + Shiki | `markdown-it` 14.1.1 / `shiki` 4.0.1 | Mar 2026 |
| GitHub API client | Octokit | `@octokit/graphql` 9.x / `@octokit/core` 7.x | Feb 2026 |
| YAML frontmatter parsing | yaml (custom wrapper) | `yaml` 2.8.2 | Nov 2025 |
| Client-side search | MiniSearch | `minisearch` 7.2.0 | Sep 2025 |
| Testing | Vitest | `vitest` 4.1.0 | Mar 2026 |
| PWA | vite-plugin-pwa | `vite-plugin-pwa` 1.2.0 | Dec 2025 |
| Hosting | Cloudflare Pages | — | — |
| OAuth proxy / image upload | Cloudflare Workers | — | — |
| Image storage | Cloudflare R2 | — | — |

**shadcn-vue** deserves special emphasis. Unlike traditional component libraries, it copies component source code directly into your project via CLI (`npx shadcn-vue add button`), giving you full ownership without library lock-in. Built on Reka UI's WAI-ARIA primitives, it produces accessible, Tailwind-styled components with excellent dark mode support. A dedicated MCP server was launched in February 2026 enabling AI-assisted component generation directly in your IDE.

**TanStack Vue Query** is the linchpin for managing GitHub API data. It implements stale-while-revalidate by default — cached data renders instantly while fresh data loads in the background. Configure `staleTime: 300000` (5 minutes) for issue lists and longer for individual issues. Its `useInfiniteQuery` handles cursor-based pagination natively, and `useMutation` with cache invalidation keeps the UI consistent after writes. This single library eliminates roughly **60% of the caching and rate-limit concerns** that would otherwise require manual implementation.

---

## Replaced dependency: `front-matter` → custom `yaml` wrapper

The original recommendation used the `front-matter` npm package for parsing YAML frontmatter from issue bodies. However, this package has not been updated in **6 years** (last publish: 2019). The similar `gray-matter` package is also 5 years stale. Neither should be used in a new project.

**Replacement: Use the `yaml` npm package directly** (v2.8.2, 85 million weekly downloads, published November 2025) with a lightweight custom wrapper. The entire frontmatter parser is ~15 lines:

```typescript
// src/utils/frontmatter.ts
import YAML from 'yaml'

interface FrontmatterResult<T = Record<string, unknown>> {
  data: T
  content: string
}

export function parseFrontmatter<T = Record<string, unknown>>(
  input: string
): FrontmatterResult<T> {
  const match = input.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    return { data: {} as T, content: input.trim() }
  }
  const data = YAML.parse(match[1]) as T
  const content = match[2].trim()
  return { data, content }
}
```

This gives you identical functionality to `front-matter` with a fully maintained, typed YAML parser underneath, plus you control the implementation entirely.

---

## GitHub Issues API as your database layer

The data model maps cleanly: each AI prompt is a GitHub Issue, categories are labels, votes are reactions, and discussion happens via comments. **Use GraphQL for reads and REST for writes** — this is the optimal split because GraphQL fetches issues with their labels, reactions, comments, and author data in a single query (saving 3–5 REST calls), while REST write endpoints are simpler and more predictable.

### Data model mapping

| Platform concept | GitHub feature | Implementation detail |
|---|---|---|
| AI prompt | Issue | Title = prompt name, body = prompt content with YAML frontmatter |
| Category / tag | Label | Namespaced: `category:coding`, `model:gpt-4`, `difficulty:beginner` |
| Upvote / favorite | Reaction | `+1` for upvotes, `heart` for favorites, `rocket` for "useful" |
| Discussion | Issue comment | Full GitHub Flavored Markdown support |
| Prompt status | Issue state + labels | Open/closed + `state:featured`, `state:draft` |
| User identity | GitHub user | Avatar, username, bio via OAuth |

Store structured metadata in the issue body using YAML frontmatter parsed by the custom `yaml` wrapper described above. This lets the SPA extract model type, version number, and tags programmatically while keeping the content human-readable on GitHub itself.

### The GraphQL advantage

A single GraphQL query replaces five REST calls. The `reactionGroups` field returns pre-aggregated vote counts without listing individual reactors, and `pageInfo` with cursors enables reliable infinite scroll that won't skip or duplicate items when new prompts are added mid-pagination.

```graphql
query GetPrompts($cursor: String) {
  repository(owner: "org", name: "prompts-data") {
    issues(first: 20, after: $cursor, states: OPEN, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      pageInfo { hasNextPage endCursor }
      nodes {
        number title body bodyHTML createdAt
        author { login avatarUrl }
        labels(first: 10) { nodes { name color } }
        reactionGroups { content reactors { totalCount } }
        comments { totalCount }
      }
    }
  }
}
```

### Rate limits are manageable but require strategy

Authenticated users get **5,000 requests/hour** for REST and **5,000 points/hour** for GraphQL. The critical bottleneck is the Search API at just **30 requests/minute** — this is why client-side search indexing is essential rather than hitting GitHub's search endpoint on every keystroke.

The single most impactful optimization is **conditional requests using ETags**. Every GitHub API response includes an `ETag` header. Send `If-None-Match` on subsequent requests, and if the resource hasn't changed, GitHub returns `304 Not Modified` which **does not count against your rate limit**. With TanStack Query handling refetch intervals, most repeat requests become free.

---

## Authentication: GitHub OAuth App (simplest path)

A server-side proxy is **mandatory** for GitHub OAuth in any SPA. GitHub's token exchange endpoint (`github.com/login/oauth/access_token`) does not support CORS, and the `client_secret` must never appear in frontend code.

### Why OAuth App over GitHub App

A **GitHub App** offers tighter, granular permissions (e.g. only `issues:write`) but requires you to create the app, install it on your data repository, and manage token expiration/refresh. An **OAuth App** is simpler: you register it in 2 minutes at `github.com/settings/applications/new`, there is no installation step, and the tokens don't expire — which means less code to maintain.

The trade-off is that the minimum useful scope for an OAuth App is `public_repo`, which grants read/write access to all the user's public repositories. In practice, your app only ever calls the Issues API on your specific data repo, so this extra access is never exercised — but users will see the broad permission on the consent screen. For a community of 50–400 trusted GitHub users, this is an acceptable trade-off. You can always migrate to a GitHub App later if needed.

### Setup: Register your OAuth App

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**
2. Fill in:
   - **Application name**: Your app name (e.g. "AI Prompt Hub")
   - **Homepage URL**: Your Cloudflare Pages URL
   - **Authorization callback URL**: Your Cloudflare Worker URL (e.g. `https://auth.your-domain.workers.dev/callback`)
3. Note your **Client ID** and generate a **Client Secret**
4. Store the Client Secret as an environment variable in your Cloudflare Worker — never in frontend code

### The Cloudflare Worker OAuth proxy

The recommended flow uses a **popup window** pattern — the same approach used by utterances in production:

1. User clicks "Sign in with GitHub" → SPA opens a popup to your Cloudflare Worker's `/login` endpoint
2. Worker generates a cryptographic `state` parameter, stores it in an HttpOnly cookie, and redirects to `github.com/login/oauth/authorize?client_id=XXX&scope=public_repo&state=YYY`
3. User sees the GitHub consent screen and authorizes → GitHub redirects back to the Worker's `/callback` with a temporary `code`
4. Worker validates the `state` cookie (CSRF protection), then exchanges `code` + `client_id` + `client_secret` for an access token via `POST github.com/login/oauth/access_token`
5. Worker returns a minimal HTML page that calls `window.opener.postMessage({ token })` and closes the popup
6. SPA receives the token via `message` event listener, stores it in `localStorage`, and begins making authenticated API calls directly to `api.github.com`

OAuth App tokens **do not expire**, so you don't need refresh token logic — one successful login and the user stays authenticated until they manually revoke access or clear their browser storage. This simplifies your frontend auth code significantly.

**The entire proxy is ~40 lines of code** and runs on Cloudflare Workers' free tier (100,000 requests/day). Here's a minimal skeleton:

```typescript
// worker.ts (Cloudflare Worker)
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      const state = crypto.randomUUID()
      const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${env.CLIENT_ID}&scope=public_repo&state=${state}`
      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl,
          'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Max-Age=300`
        }
      })
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')
      // Validate state against cookie...

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
          code
        })
      })
      const { access_token } = await tokenRes.json()

      return new Response(`<script>
        window.opener.postMessage({ token: "${access_token}" }, "${env.APP_ORIGIN}");
        window.close();
      </script>`, { headers: { 'Content-Type': 'text/html' } })
    }

    return new Response('Not found', { status: 404 })
  }
}
```

Netlify Functions and Vercel Serverless Functions are viable alternatives, but Cloudflare Workers offer zero cold starts and seamless integration with Pages and R2.

**Note on `prose/gatekeeper`:** This popular OAuth proxy micro-service is often referenced in tutorials but should be avoided — it was last updated years ago. Build your own Cloudflare Worker instead; it's simpler and more secure.

### Future upgrade path to GitHub App

If you later want tighter permissions, migrating to a GitHub App involves: creating the app in GitHub settings, installing it on your data repo, updating the Worker to handle token expiration/refresh, and changing the OAuth flow to use the GitHub App's client ID. The frontend code barely changes — users still see a "Sign in with GitHub" button.

---

## Image attachments require a workaround

There is **no public API endpoint** for uploading images to GitHub Issues. The drag-and-drop upload in GitHub's web UI uses an internal asset pipeline that is deliberately not exposed. This is the biggest gap in the "GitHub Issues as backend" architecture.

Three viable approaches exist, ranked by recommendation:

**Cloudflare R2 (recommended)** provides S3-compatible object storage with **10 GB free, zero egress fees**, and native integration with Workers. Build a small upload Worker that verifies the user's GitHub token, uploads the image to R2, and returns a public URL to embed in the issue body. The entire image pipeline stays on Cloudflare's infrastructure at zero cost for moderate usage.

**GitHub Contents API** lets you commit images to a dedicated repository branch, producing `raw.githubusercontent.com` URLs you can embed in issues. Each upload creates a git commit, which bloats repository history — acceptable for dozens of images but problematic at scale.

**Cloudinary's free tier** offers 25 credits/month covering roughly 25 GB bandwidth and 5,000 images with transformations. Its upload API has no rate limit, and it provides automatic image optimization. However, the credits system is confusing and a moderately active community can exhaust the free tier quickly.

For 50–400 users posting prompts with occasional images, **Cloudflare R2 behind a Worker proxy** is the clear winner — zero egress costs mean you'll never face surprise bills regardless of how many times images are viewed.

---

## Voting with reactions and sorting by popularity

GitHub Reactions serve as a surprisingly effective voting system. The API enforces **one reaction per type per user** server-side — duplicate prevention is built in with no additional logic needed. The `+1` reaction maps naturally to upvotes, `heart` to favorites, and `rocket` to a "this is useful" signal.

The key limitation is **sorting**. The REST API supports `sort:reactions-+1-desc` in search queries, but there's no native way to sort by a composite score across reaction types. For a weighted scoring formula like `score = (thumbs_up × 2) + heart + rocket - thumbs_down`, you must fetch reaction counts via GraphQL's `reactionGroups` and sort client-side.

**Content-generating requests** (adding reactions, creating issues/comments) are subject to a secondary rate limit of **80 per minute, 500 per hour**. For a community of 50–400 users, this is unlikely to be a bottleneck, but implement optimistic UI updates — show the vote change immediately and reconcile with the API response asynchronously.

---

## Search, filtering, and the client-side index strategy

Do **not** rely on GitHub's Search API for user-facing search. Its 30-requests-per-minute limit and 1,000-result cap make it unsuitable as a real-time search backend. Instead, build a **local search index** that syncs periodically with the API.

The recommended approach uses **MiniSearch** (~6 KB gzipped, v7.2.0, rated "Sustainable" by Snyk with 285k weekly downloads) to index issue titles, bodies, and labels client-side. Unlike Fuse.js (which scans all items linearly), MiniSearch builds an inverted index supporting prefix search, fuzzy matching, and field boosting. It also allows dynamic updates — when a user creates a new prompt, add it to the index immediately without rebuilding.

For filtering by category, use GitHub's label system with a `key:value` naming convention. The REST API supports `labels=category:coding,model:gpt-4` as query parameters (AND logic), which narrows the server-side result set before client-side refinement. **Pre-fetch all open issues on app load** (paginating through all pages with `per_page=100`), build the MiniSearch index, and cache everything in IndexedDB via `idb-keyval`. Subsequent visits load from cache instantly, with background sync fetching only changed issues using the `since` parameter and ETags.

This architecture means the GitHub API is hit primarily on first visit and during periodic refreshes — **reads become almost entirely local** after the initial sync.

---

## Deployment on Cloudflare's unified platform

**Cloudflare Pages** is the optimal hosting choice for three reasons: **unlimited free bandwidth** (Netlify and Vercel cap at 100 GB/month), native Workers integration for the OAuth proxy, and native R2 bindings for image storage. The entire stack — SPA hosting, authentication, and image storage — runs on a single platform at zero cost.

Configure the deployment with a GitHub Actions workflow that builds the Vue app and deploys via Wrangler. Use `createWebHashHistory()` for Vue Router if deploying to GitHub Pages (which lacks SPA fallback routing), but Cloudflare Pages supports `_redirects` files for proper history-mode routing.

**Separate your app code and data into two repositories.** The app repo contains the Vue SPA, CI/CD configuration, and deployment settings. The data repo contains only GitHub Issues (the prompts), labels (categories), and Issue Forms (submission templates). This separation provides different permission models — anyone can create issues in the data repo while only maintainers modify the app — and prevents prompt-related issues from cluttering the app's issue tracker.

---

## Features that elevate the platform

**Markdown rendering** uses `markdown-it` (v14.1.1, released February 2026) for parsing with `@shikijs/markdown-it` for syntax highlighting. Shiki v4 (released March 2026) uses the same TextMate grammars as VS Code, producing the highest-fidelity code highlighting available. Load language grammars on demand to minimize bundle size.

**Dark mode** comes nearly free with shadcn-vue and Tailwind CSS. Toggle a `.dark` class on the `<html>` element and all components adapt. Use VueUse's `useDark()` composable (v14.2.1) to detect system preference and persist user choice.

**PWA support** via `vite-plugin-pwa` (v1.2.0) enables offline browsing of cached prompts, background sync for queued writes, and app-like installation on mobile. Configure Workbox with `StaleWhileRevalidate` for API responses and `CacheFirst` for GitHub CDN images.

**Analytics** should use a privacy-respecting service. Plausible Analytics (~1 KB script, GDPR-compliant, $9/month cloud or self-hosted) or Umami (free, self-hosted, open source) both support SPA navigation tracking without cookies.

**SEO** is the main trade-off of a pure SPA. For a community platform with user-generated content, consider `vite-plugin-prerender` to pre-render key pages (homepage, category pages) at build time. Use `@unhead/vue` for dynamic meta tags. If SEO becomes critical, migrating to Nuxt 3 with SSR is the upgrade path — but for a GitHub-authenticated community, most users arrive via direct links rather than search engines.

**Prompt versioning** works best by treating each issue comment as a version. Post updated prompt text as a new comment with structured metadata (`## Version 2 — 2026-03-13`). This gives each version its own reactions and discussion thread, and GitHub's edit history on the original issue body provides an additional audit trail.

---

## Additional requirements worth considering

- **Moderation tools**: Use GitHub's lock/close mechanisms. Label prompts as `state:flagged` to hide them from the default view. A GitHub Action can auto-close issues that violate community guidelines based on keyword patterns.
- **RSS feeds**: Generate an RSS feed from the issues API using a Cloudflare Worker on a cron schedule — this enables external consumption of new prompts without polling.
- **Webhooks for notifications**: Configure GitHub webhooks to trigger a Worker that sends notifications (email, Discord, Slack) when new prompts are posted or highly-voted prompts are updated.
- **Prompt templates via Issue Forms**: GitHub Issue Forms (YAML-defined templates) give users a structured submission experience with dropdowns for category, model type, and difficulty — enforcing data quality at submission time.
- **Leaderboard / user profiles**: Aggregate reactions across a user's submissions using the GraphQL API's `author` filter. Cache leaderboard data in Cloudflare KV (free tier: 100k reads/day, 1k writes/day).
- **Export / import**: Allow users to export prompts as JSON or Markdown files. Since each prompt is a GitHub Issue, the entire dataset is always exportable via the API.
- **Accessibility (a11y)**: shadcn-vue's Reka UI foundation provides WAI-ARIA compliance out of the box. Add `aria-live` regions for real-time vote count updates and ensure keyboard navigation through the prompt list.
- **Internationalization (i18n)**: `vue-i18n` integrates cleanly with the Vue 3 Composition API if multi-language support becomes necessary.

---

## Conclusion

This architecture produces a **zero-cost, globally distributed community platform** that scales to 400 users with no infrastructure management. The key insight is treating GitHub's API not as a limitation but as a feature: you inherit its authentication, permissions, CDN, markdown rendering, and reaction system without building any of it. The three decisions that matter most are starting with a **GitHub OAuth App** for the simplest auth setup (with a clear upgrade path to a GitHub App later), using **GraphQL with ETag caching** to stay well within rate limits, and building a **client-side search index** rather than depending on GitHub's throttled Search API. Cloudflare's unified platform (Pages + Workers + R2) eliminates the complexity of coordinating multiple services, and the entire stack — from OAuth to image hosting — runs within free tiers indefinitely at the target scale.

**Every dependency in this stack has been verified as actively maintained as of March 2026.** The one originally recommended package that failed the maintenance check (`front-matter`) has been replaced with a custom 15-line wrapper around the `yaml` package, which is one of the most actively maintained packages in the entire npm ecosystem.
