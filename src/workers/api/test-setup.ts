// src/workers/api/test-setup.ts
// Setup file that runs inside the workerd runtime — applies D1 migrations and seed
// data before each test file.
// readD1Migrations runs in Node.js (global-setup) and is injected via vitest's provide/inject.
import { env, applyD1Migrations } from 'cloudflare:test'
import { beforeAll, inject } from 'vitest'
import type { D1Migration } from 'cloudflare:test'

beforeAll(async () => {
  // migrations is provided by vitest.global-setup.ts (Node.js context)
  // Cast through unknown to avoid strict ProvidedContext key constraint
  const injectAny = inject as (key: string) => unknown
  const migrations = injectAny('d1Migrations') as D1Migration[]
  if (migrations?.length) {
    await applyD1Migrations(env.DB, migrations)
  }

  // Apply seed data (INSERT OR IGNORE — idempotent, safe to run each test file)
  const seedSql = injectAny('d1SeedSql') as string | undefined
  if (seedSql) {
    // Remove comment lines, then split on semicolons
    const stripped = seedSql
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('--'))
      .join('\n')

    const statements = stripped
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const stmt of statements) {
      await env.DB.prepare(stmt).run()
    }
  }
})
