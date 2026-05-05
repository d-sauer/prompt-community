// src/workers/api/routes/admin.ts
import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Stub — Phase 14 fills in admin handlers per the route plan.
app.all('*', (c) => c.json({ message: 'Not implemented', resource: 'admin' }, 501))

export default app
