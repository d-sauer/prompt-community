// src/workers/api/routes/reactions.ts
import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<Env>()

// Stub — Phase 12 fills in handlers per the route plan.
app.all('*', (c) => c.json({ message: 'Not implemented', resource: 'reactions' }, 501))

export default app
