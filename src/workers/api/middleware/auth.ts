// JWT verify middleware — Phase 10 Plan 03 implementation.
import type { MiddlewareHandler } from 'hono'
import { verify } from 'hono/jwt'
import { getCookie } from 'hono/cookie'
import { JwtTokenExpired } from 'hono/utils/jwt/types'
import type { Env, UserContext } from '../index'

export const requireAuth = (): MiddlewareHandler<Env> => async (c, next) => {
  if (!c.env.JWT_SECRET) throw new Error('JWT_SECRET not configured')
  const token = getCookie(c, 'pc_session')
  if (!token) {
    return c.json({ error: 'unauthorized', code: 'token_missing' }, 401)
  }
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', {
      id: payload.sub as string,
      role: payload.role as 'user' | 'maintainer',
      login: payload.login as string,
      name: (payload.name ?? null) as string | null,
      avatar_url: (payload.avatar_url ?? null) as string | null,
    })
    await next()
  } catch (e) {
    const code = e instanceof JwtTokenExpired ? 'token_expired' : 'token_missing'
    return c.json({ error: 'unauthorized', code }, 401)
  }
}

export const optionalAuth = (): MiddlewareHandler<Env> => async (c, next) => {
  if (!c.env.JWT_SECRET) { c.set('user', null); await next(); return }
  const token = getCookie(c, 'pc_session')
  if (!token) { c.set('user', null); await next(); return }
  try {
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256')
    c.set('user', {
      id: payload.sub as string,
      role: payload.role as 'user' | 'maintainer',
      login: payload.login as string,
      name: (payload.name ?? null) as string | null,
      avatar_url: (payload.avatar_url ?? null) as string | null,
    } as UserContext)
  } catch {
    c.set('user', null)
  }
  await next()
}
