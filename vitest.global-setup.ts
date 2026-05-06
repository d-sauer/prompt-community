// vitest.global-setup.ts
// Global setup runs in Node.js — reads D1 migrations from disk and provides them
// to worker test contexts via vitest's provide/inject mechanism.
import { readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { resolve } from 'node:path'

export async function setup({ provide }: { provide: (key: string, value: unknown) => void }) {
  const migrationsDir = resolve('./src/workers/api/db/migrations')
  const migrations = await readD1Migrations(migrationsDir)
  provide('d1Migrations', migrations)
}
