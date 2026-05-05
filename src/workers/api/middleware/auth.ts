// JWT verify middleware — Phase 10 implements. Phase 9 is a pass-through stub
// so route modules can import { requireAuth } without breaking the build.
import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index'

export const requireAuth = (): MiddlewareHandler<{ Bindings: Env }> => async (c, next) => {
  // TODO(Phase 10): verify JWT from HttpOnly cookie, attach user to c.set('user', ...)
  await next()
}
