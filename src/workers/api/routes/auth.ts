// src/workers/api/routes/auth.ts
import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<Env>()

// Stub — Phase 10 fills in GitHub OAuth + JWT handlers.
app.all('*', (c) => c.json({ message: 'Not implemented', resource: 'auth' }, 501))

export default app
