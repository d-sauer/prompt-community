// drizzle.config.local.ts
// drizzle-kit config for LOCAL development.
// Reads/writes the SQLite file that wrangler creates under .wrangler/state/v3/d1/.
// Bootstrap once before first push:
//   npm run db:bootstrap   # registered by Plan 09-01
// Then:
//   npm run db:push        # registered by Plan 09-01
import { defineConfig } from 'drizzle-kit'
import { readdirSync } from 'node:fs'
import path from 'node:path'

function findLocalD1(): string {
  const d1Dir = 'src/workers/api/.wrangler/state/v3/d1/miniflare-D1DatabaseObject'
  let files: string[] = []
  try {
    files = readdirSync(d1Dir).filter((f) => f.endsWith('.sqlite'))
  } catch {
    throw new Error(
      `Local D1 directory not found at ${d1Dir}. ` +
      `Bootstrap first: npm run db:bootstrap`
    )
  }
  if (files.length === 0) {
    throw new Error(
      `No .sqlite file found in ${d1Dir}. Bootstrap first: npm run db:bootstrap`
    )
  }
  return path.join(d1Dir, files[0])
}

export default defineConfig({
  out: './src/workers/api/db/migrations',
  schema: './src/workers/api/db/schema.ts',
  dialect: 'sqlite',
  dbCredentials: { url: findLocalD1() },
  // Exclude FTS5 virtual tables and drizzle-kit internal tables from push/introspect.
  // FTS5 tables (prompts_fts and its internal shadow tables) are managed by
  // 0002_fts5.sql, not drizzle-kit (RESEARCH.md Pitfall 1).
  // _cf_METADATA is a Cloudflare D1 internal table that must not be touched.
  tablesFilter: ['!prompts_fts', '!prompts_fts_*', '!_cf_METADATA'],
})
