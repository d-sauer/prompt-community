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

describe('router admin guard (ADMN-01)', () => {
  it('non-maintainer navigating to /admin is redirected away', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(false)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('non-maintainer-token')

    await router.push('/browse')
    await router.push('/admin')

    expect(router.currentRoute.value.path).not.toBe('/admin')
    expect(router.currentRoute.value.path).toBe('/browse')
  })

  it('authenticated maintainer navigating to /admin is allowed through', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(true)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('verified-maintainer-token')

    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('authStore.isMaintainer is set to true when verifyMaintainerStatus returns true (ADMN-01)', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(true)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('maintainer-token')

    await router.push('/admin')

    expect(authStore.isMaintainer).toBe(true)
  })

  it('authStore.isMaintainer is set to false when verifyMaintainerStatus returns false (ADMN-01)', async () => {
    const { verifyMaintainerStatus } = await import('@/lib/github/auth')
    const mockVerify = vi.mocked(verifyMaintainerStatus)
    mockVerify.mockResolvedValue(false)

    const { router } = await import('./index')
    const authStore = useAuthStore()
    authStore.receiveToken('non-maintainer-token')
    authStore.isMaintainer = true // start with stale true

    await router.push('/browse')
    await router.push('/admin')

    expect(authStore.isMaintainer).toBe(false)
    expect(router.currentRoute.value.path).toBe('/browse')
  })
})
