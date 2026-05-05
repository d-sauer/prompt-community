// src/workers/api/index.spec.ts
// Boot test for the Hono API worker — covers BACK-01, BACK-02, BACK-06.
// Wave 0 ships the it.todo placeholders. Wave 1 (Plan 02) creates ../index.ts
// and turns the todos into real assertions.
import { describe, it } from 'vitest'

describe('API worker boot', () => {
  it.todo('GET /health returns 200 with { ok: true }')
  it.todo(
    'every route prefix (/auth, /prompts, /comments, /reactions, /users, /search, /admin) returns a response (501 stubs are acceptable)',
  )
  it.todo('env.DB is defined (D1 binding wired)')
})
