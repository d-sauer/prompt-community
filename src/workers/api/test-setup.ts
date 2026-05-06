// src/workers/api/test-setup.ts
// Setup file that runs inside the workerd runtime — applies D1 migrations before each test file.
// readD1Migrations runs in Node.js (global-setup) and is injected via vitest's provide/inject.
import { env, applyD1Migrations } from 'cloudflare:test'
import { beforeAll, inject } from 'vitest'
import type { D1Migration } from 'cloudflare:test'

beforeAll(async () => {
  // migrations is provided by vitest.global-setup.ts (Node.js context)
  const migrations = inject('d1Migrations') as D1Migration[]
  if (migrations?.length) {
    await applyD1Migrations(env.DB, migrations)
  }
})
