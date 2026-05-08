// Maintainer guard middleware — Phase 10 Plan 03 implementation.
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'

export const requireMaintainer = (): MiddlewareHandler<Env> => async (c, next) => {
  const user = c.get('user')
  if (!user || user.role !== 'maintainer') {
    return c.json({ error: 'forbidden', code: 'forbidden' }, 403)
  }
  await next()
}
