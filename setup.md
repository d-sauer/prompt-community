# Setup Guide

This guide explains how to deploy your own instance of Prompt Community on **GitHub Pages** and configure it to use your own GitHub repository for storing prompts.

## How it works

Prompt Community has no custom backend. All data lives in a **GitHub repository as Issues** — each prompt is one issue, categories are labels, and version history is stored as comments. The app reads that data via the GitHub API and writes back through a lightweight **Cloudflare Worker** that handles the OAuth token exchange (keeping your client secret out of the browser).

---

## Prerequisites

- A GitHub account or organization
- Node.js 20+ and npm
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up) (for the OAuth Worker)
- Wrangler CLI: `npm install -g wrangler`

---

## Step 1 — Create the data repository

This repo stores all prompts as GitHub Issues.

1. Create a new **public** GitHub repository (e.g. `prompt-community-data`).
   - It must be **public** — anonymous browsing relies on unauthenticated GitHub API reads.
   - No special file structure is needed; the app only uses Issues and Labels.

2. Seed the required labels. In the repository, go to **Issues → Labels** and create labels using these naming conventions:

   | Prefix | Example values |
   |--------|----------------|
   | `category:` | `category:coding`, `category:writing`, `category:analysis` |
   | `model:` | `model:claude`, `model:gpt-4`, `model:gemini` |
   | `difficulty:` | `difficulty:beginner`, `difficulty:intermediate`, `difficulty:advanced` |
   | `type:` | `type:prompt`, `type:skill`, `type:chain` |

   These labels become the filters in the sidebar. Add or remove values to match your team's needs.

3. Note down the **owner** (org name or username) and **repo name** — you will need them as environment variables.

---

## Step 2 — Create a GitHub OAuth App

The app uses GitHub OAuth so users can sign in and contribute prompts.

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name**: Prompt Community (or any name)
   - **Homepage URL**: your GitHub Pages URL, e.g. `https://<org>.github.io/prompt-community/`
   - **Authorization callback URL**: `https://<worker-subdomain>.workers.dev/callback`
     (You will get the Worker URL in Step 3 — come back and update this field after deploying the Worker.)
3. Click **Register application**.
4. On the app page, copy the **Client ID** — this goes in `VITE_GITHUB_CLIENT_ID`.
5. Click **Generate a new client secret** and copy it — this goes into the Worker as a secret (never in the frontend).

---

## Step 3 — Deploy the OAuth Worker

The Cloudflare Worker (`src/workers/oauth.ts`) handles the `/login` redirect and `/callback` token exchange. It keeps the client secret server-side.

```bash
# Log in to Cloudflare
wrangler login

# Deploy the worker
npm run deploy:worker
```

After deploy, Wrangler prints the Worker URL (e.g. `https://prompt-community-auth.<subdomain>.workers.dev`). Note this down as `VITE_CF_WORKER_URL`.

Now set the three Worker secrets (you will be prompted to enter each value):

```bash
wrangler secret put CLIENT_ID       # GitHub OAuth App client ID
wrangler secret put CLIENT_SECRET   # GitHub OAuth App client secret
```

Then update `APP_ORIGIN` in `wrangler.toml` to your GitHub Pages URL:

```toml
[vars]
APP_ORIGIN = "https://<org>.github.io/prompt-community"
```

Re-deploy after changing `wrangler.toml`:

```bash
npm run deploy:worker
```

Finally, go back to your GitHub OAuth App and set the **Authorization callback URL** to:
```
https://prompt-community-auth.<subdomain>.workers.dev/callback
```

---

## Step 4 — Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Where to find it |
|---|---|---|
| `VITE_GITHUB_OWNER` | GitHub org or username that owns the data repo | Your GitHub org/username |
| `VITE_GITHUB_REPO` | Data repo name (stores prompts as Issues) | The repo created in Step 1 |
| `VITE_GITHUB_CLIENT_ID` | GitHub OAuth App client ID | GitHub → OAuth App page |
| `VITE_CF_WORKER_URL` | Deployed Cloudflare Worker base URL | Wrangler output from Step 3 |
| `VITE_R2_PUBLIC_URL` | Public URL for image uploads *(optional)* | Cloudflare R2 bucket settings |
| `VITE_GITHUB_APP_INSTALLATION_ID` | GitHub App installation ID for anonymous token *(optional)* | GitHub App → Installations |

For GitHub Pages deployment, do **not** commit `.env` — set these as **GitHub Actions Secrets** instead (see Step 5).

---

## Step 5 — Deploy to GitHub Pages

### 5a — Set the base URL

If your site will be served from a subpath (e.g. `https://org.github.io/prompt-community/`), open `vite.config.ts` and add a `base` option:

```ts
export default defineConfig({
  base: '/prompt-community/',   // must match your repo name
  plugins: [ ... ],
})
```

If you are deploying to a custom domain at the root (e.g. `https://prompts.example.com/`), leave `base` unset or set it to `'/'`.

### 5b — Add GitHub Actions Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add each `VITE_*` variable from Step 4.

### 5c — Create the deploy workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      - name: Build
        env:
          VITE_GITHUB_OWNER: ${{ secrets.VITE_GITHUB_OWNER }}
          VITE_GITHUB_REPO: ${{ secrets.VITE_GITHUB_REPO }}
          VITE_GITHUB_CLIENT_ID: ${{ secrets.VITE_GITHUB_CLIENT_ID }}
          VITE_CF_WORKER_URL: ${{ secrets.VITE_CF_WORKER_URL }}
          VITE_R2_PUBLIC_URL: ${{ secrets.VITE_R2_PUBLIC_URL }}
          VITE_GITHUB_APP_INSTALLATION_ID: ${{ secrets.VITE_GITHUB_APP_INSTALLATION_ID }}
        run: npm run build

      - name: Fix SPA routing (copy index.html → 404.html)
        run: cp dist/index.html dist/404.html

      - uses: actions/configure-pages@v5

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

      - id: deployment
        uses: actions/deploy-pages@v4
```

The `cp dist/index.html dist/404.html` step is the SPA routing fix: GitHub Pages serves `404.html` for any unknown path, which reloads the Vue app and lets Vue Router handle the route client-side.

### 5d — Enable GitHub Pages

In your repository go to **Settings → Pages** and set:
- **Source**: GitHub Actions

Push to `main` — the workflow will build and deploy. Your app will be live at `https://<org>.github.io/<repo>/`.

---

## Step 6 — Grant maintainer access

Maintainers get full admin access in the app (approve prompts, edit any entry). Access is determined by the **collaborators** list of the data repository.

Go to your data repository → **Settings → Collaborators → Add people** and add the GitHub usernames of your maintainers. Any collaborator with at minimum `write` permission is treated as a maintainer.

---

## Verify the setup

1. Open the deployed URL — you should see the prompt list (empty at first).
2. Click **Sign in with GitHub** — the OAuth popup should open, authenticate, and close automatically.
3. After signing in, the **New Prompt** button should appear.
4. A collaborator signing in should see the **Admin** panel.
5. Create a test prompt — verify it appears as a new Issue in the data repository.
