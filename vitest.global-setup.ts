// vitest.global-setup.ts
// Global setup runs in Node.js — reads D1 migrations from disk and provides them
// to worker test contexts via vitest's provide/inject mechanism.
// Also reads scripts/seed.sql and provides it for test-setup to execute.
import { readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { resolve } from 'node:path'
import { readFileSync } from 'node:fs'

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
  const migrationsDir = resolve('./src/workers/api/db/migrations')
  const migrations = await readD1Migrations(migrationsDir)
  provide('d1Migrations', migrations)

  // Provide seed SQL for test environments that need seeded data
  const seedSql = readFileSync(resolve('./scripts/seed.sql'), 'utf-8')
  provide('d1SeedSql', seedSql)
}
