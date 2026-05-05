// drizzle.config.ts
// drizzle-kit config for PRODUCTION D1 (Cloudflare-hosted).
// Used by: npm run db:generate -- to produce SQL diffs from schema.ts.
// Production migrations are applied via `wrangler d1 migrations apply` (Phase 15).
// CLOUDFLARE_* env vars come from CI secrets / .env (gitignored).
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './src/workers/api/db/migrations',
  schema: './src/workers/api/db/schema.ts',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId:  process.env.CLOUDFLARE_ACCOUNT_ID  ?? '',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? '',
    token:      process.env.CLOUDFLARE_D1_TOKEN    ?? '',
  },
})
