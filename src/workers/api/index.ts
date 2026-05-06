// src/workers/api/index.ts
// Hono API worker entry — Phase 9 scaffolding.
// Subsequent phases fill in route handlers; this file only changes when adding new top-level routes.
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { requireAuth } from './middleware/auth'
import auth from './routes/auth'
import prompts from './routes/prompts'
import comments from './routes/comments'
import reactions from './routes/reactions'
import users from './routes/users'
import search from './routes/search'
import admin from './routes/admin'
import notifications from './routes/notifications'

export type UserContext = {
  id: string
  login: string
  name: string | null
  avatar_url: string | null
  role: 'user' | 'maintainer'
}

export type Env = {
  Bindings: {
    DB: D1Database
    ENV: string
    APP_ORIGIN: string
    GITHUB_CLIENT_ID?: string
    GITHUB_CLIENT_SECRET?: string
    JWT_SECRET?: string
  }
  Variables: {
    user: UserContext | null
  }
}

const app = new Hono<Env>()

// CORS — Vite frontend on :5173 talks to API on :8787. credentials:true is required
// for Phase 10's HttpOnly cookie session.
app.use('*', cors({
  origin: (origin) => origin ?? '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

app.get('/health', (c) => c.json({ ok: true }))

app.get('/me', requireAuth(), (c) => {
  const user = c.get('user')!
  return c.json({
    login: user.login,
    name: user.name,
    avatar_url: user.avatar_url,
    role: user.role,
  })
})

app.route('/auth', auth)
app.route('/prompts', prompts)
app.route('/comments', comments)
app.route('/reactions', reactions)
app.route('/users', users)
app.route('/search', search)
app.route('/admin', admin)
app.route('/notifications', notifications)

export default app
