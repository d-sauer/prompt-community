// src/workers/api/routes/prompts.ts
import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Stub — Phase 11 fills in handlers per the route plan.
app.all('*', (c) => c.json({ message: 'Not implemented', resource: 'prompts' }, 501))

export default app
