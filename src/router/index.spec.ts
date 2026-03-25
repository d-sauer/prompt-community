import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'

// Mock verifyMaintainerStatus so router's beforeEach uses the mock
vi.mock('@/lib/github/auth', () => ({
  verifyMaintainerStatus: vi.fn(),
}))

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('unauthenticated user is redirected from /prompts/new to /browse', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()
    // token is null => isAuthenticated is false
    expect(authStore.isAuthenticated).toBe(false)

    await router.push('/prompts/new')
    expect(router.currentRoute.value.path).toBe('/browse')
  })

  it('verifyMaintainerStatus is called with the token when navigating to /admin (INFR-08)', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(true)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('test-token-123')
    expect(authStore.isAuthenticated).toBe(true)

    await router.push('/admin')

    // Verify verifyMaintainerStatus was called with the token (not just isMaintainer boolean)
    expect(mockVerify).toHaveBeenCalledWith('test-token-123')
    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('redirects to /browse when verifyMaintainerStatus returns false for /admin', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(false)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('test-token-xyz')

    // Navigate away from /admin first to ensure clean state
    await router.push('/browse')
    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/browse')
  })

  it('allows /admin when verifyMaintainerStatus returns true', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(true)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('maintainer-token')

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/admin')
  })
})

// Wave 0 stubs — will be filled in plan 02 (ADMN-01)
import { describe as _describe, it as _it } from 'vitest'
_describe('router admin guard (ADMN-01)', () => {
  _it.todo('non-maintainer navigating to /admin is redirected away (e.g. to /)')
  _it.todo('authenticated maintainer navigating to /admin is allowed through')
})
