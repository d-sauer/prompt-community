// Maintainer guard middleware — Phase 10 implements role check using c.get('user').role.
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'

export const requireMaintainer = (): MiddlewareHandler<{ Bindings: Env }> => async (c, next) => {
  // TODO(Phase 10): if (c.get('user')?.role !== 'maintainer') return c.json({ error: 'forbidden' }, 403)
  await next()
}
