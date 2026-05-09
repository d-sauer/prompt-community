# Installation Guide

Deploy your own instance of Prompt Community on **Cloudflare** (Workers + D1 + Pages).

## Architecture

```
Browser → Cloudflare Pages (Vue SPA)
              ↓
         Cloudflare Worker (Hono API)
              ↓
         Cloudflare D1 (SQLite database)
```

Authentication is handled by the API worker via GitHub OAuth. All data lives in D1 — no GitHub repository needed as a backend.

---

## Prerequisites

- Node.js 20+ and npm
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Wrangler CLI: `npm install -g wrangler`
- A GitHub account (for OAuth)

---

## Step 1 — Create a GitHub OAuth App

The API worker uses GitHub OAuth so users can sign in.

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name**: Prompt Community (or any name)
   - **Homepage URL**: your Cloudflare Pages URL (you can update this later)
   - **Authorization callback URL**: `https://<your-worker-subdomain>.workers.dev/auth/callback`
     (You get the worker URL in Step 3 — come back and update this field after deploying.)
3. Click **Register application**.
4. Copy the **Client ID** — needed in Step 3.
5. Click **Generate a new client secret** and copy it — also needed in Step 3.

---

## Step 2 — Install dependencies and log in to Cloudflare

```bash
npm install
wrangler login
```

---

## Step 3 — Provision the D1 database

```bash
npx wrangler d1 create prompt-community-db --config src/workers/api/wrangler.toml
```

Wrangler prints a `database_id` UUID. Open `src/workers/api/wrangler.toml` and replace `PLACEHOLDER_RUN_WRANGLER_D1_CREATE` with that UUID:

```toml
[[env.production.d1_databases]]
binding = "DB"
database_name = "prompt-community-db"
database_id = "paste-your-uuid-here"   # ← replace this
migrations_dir = "db/migrations"
```

Apply the migrations to production D1:

```bash
npx wrangler d1 migrations apply prompt-community-db \
  --config src/workers/api/wrangler.toml \
  --remote \
  --env production
```

---

## Step 4 — Set production secrets

Each command prompts you to enter the secret value:

```bash
# Generate a random JWT signing secret
openssl rand -base64 32

npx wrangler secret put JWT_SECRET          --config src/workers/api/wrangler.toml --env production
npx wrangler secret put GITHUB_CLIENT_ID    --config src/workers/api/wrangler.toml --env production
npx wrangler secret put GITHUB_CLIENT_SECRET --config src/workers/api/wrangler.toml --env production
```

---

## Step 5 — Deploy the API worker

```bash
npx wrangler deploy --config src/workers/api/wrangler.toml --env production
```

Wrangler prints the deployed URL, e.g. `https://prompt-community-api.<subdomain>.workers.dev`. Note this down as your **API URL**.

Now update `APP_ORIGIN` in `src/workers/api/wrangler.toml` to your Cloudflare Pages URL (even a placeholder for now — update again after Step 6):

```toml
[env.production.vars]
ENV = "production"
APP_ORIGIN = "https://your-project.pages.dev"   # ← your Pages URL
```

Redeploy after the change:

```bash
npx wrangler deploy --config src/workers/api/wrangler.toml --env production
```

Go back to your GitHub OAuth App and set the **Authorization callback URL** to:
```
https://prompt-community-api.<subdomain>.workers.dev/auth/callback
```

---

## Step 6 — Deploy the frontend to Cloudflare Pages

### 6a — Configure the frontend environment

Copy `.env.example` to `.env.local` and set the API URL:

```bash
cp .env.example .env.local
```

| Variable | Value |
|---|---|
| `VITE_API_URL` | Your deployed worker URL from Step 5 |
| `VITE_CF_WORKER_URL` | URL of your R2 upload proxy worker *(optional — for image uploads)* |
| `VITE_R2_PUBLIC_URL` | Public URL of your R2 bucket *(optional — for image uploads)* |

### 6b — Build the frontend

```bash
npm run build
```

### 6c — Deploy to Cloudflare Pages

**Option A — Wrangler CLI (one-off):**

```bash
npx wrangler pages deploy dist --project-name prompt-community
```

**Option B — Git-connected CI (recommended):**

1. Push the repo to GitHub.
2. In the Cloudflare dashboard go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Select your repository and configure:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add the `VITE_*` environment variables under **Settings → Environment variables**.
5. Trigger a deploy — every push to `main` will redeploy automatically.

After the Pages deploy completes, note the Pages URL (e.g. `https://prompt-community.pages.dev`).

Update `APP_ORIGIN` in `src/workers/api/wrangler.toml` to the real Pages URL and redeploy the worker one more time:

```bash
npx wrangler deploy --config src/workers/api/wrangler.toml --env production
```

---

## Step 7 — Grant maintainer access

Maintainer role gives full admin access in the app (approve prompts, edit any entry, manage users).

Sign in to the app, then promote a user via the D1 console or wrangler:

```bash
npx wrangler d1 execute prompt-community-db \
  --command "UPDATE users SET role = 'maintainer' WHERE github_login = 'your-github-username'" \
  --remote \
  --env production \
  --config src/workers/api/wrangler.toml
```

---

## Verify the setup

1. Open the Pages URL — you should see the prompt list (empty at first).
2. Click **Sign in with GitHub** — OAuth should complete and return you to the app.
3. After signing in, the **New Prompt** button should appear.
4. Create a test prompt — verify it appears in the list.
5. Promote yourself to maintainer (Step 7) and verify the **Admin** panel is visible.

---

## Useful commands

```bash
# Run API worker locally
npm run dev:api

# Run frontend locally (connects to local worker)
npm run dev

# Run all tests
npm test

# Verify production secrets are set
npx wrangler secret list --config src/workers/api/wrangler.toml --env production

# Verify D1 schema
npx wrangler d1 execute prompt-community-db \
  --command "SELECT name FROM sqlite_master WHERE type='table'" \
  --remote --env production \
  --config src/workers/api/wrangler.toml
```
