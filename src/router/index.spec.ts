import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'

// Phase 10: router no longer calls verifyMaintainerStatus — isMaintainer is derived
// from user.role in the JWT cookie (set via fetchMe after popup close).

describe('router guards', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('unauthenticated user is redirected from /prompts/new to /browse', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()
    // user is null => isAuthenticated is false
    expect(authStore.isAuthenticated).toBe(false)

    await router.push('/prompts/new')
    expect(router.currentRoute.value.path).toBe('/browse')
  })

  it('authenticated user with maintainer role can navigate to /admin', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    // Set user as maintainer via fetchMe mock
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'maintainer', name: 'Maintainer', avatar_url: 'https://x.com', role: 'maintainer' }),
    }))
    await authStore.fetchMe()

    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.isMaintainer).toBe(true)

    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('redirects to /browse when user is not maintainer for /admin', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    // Set user as regular user (not maintainer)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'user', name: 'User', avatar_url: 'https://x.com', role: 'user' }),
    }))
    await authStore.fetchMe()

    expect(authStore.isAuthenticated).toBe(true)
    expect(authStore.isMaintainer).toBe(false)

    await router.push('/browse')
    await router.push('/admin')

    expect(router.currentRoute.value.path).toBe('/browse')
  })

  it('allows /admin when user has maintainer role', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'maintainer', name: 'M', avatar_url: 'https://x.com', role: 'maintainer' }),
    }))
    await authStore.fetchMe()

    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/admin')
  })
})

describe('router admin guard (ADMN-01)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('non-maintainer navigating to /admin is redirected away', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'user', name: 'User', avatar_url: 'https://x.com', role: 'user' }),
    }))
    await authStore.fetchMe()

    await router.push('/browse')
    await router.push('/admin')

    expect(router.currentRoute.value.path).not.toBe('/admin')
    expect(router.currentRoute.value.path).toBe('/browse')
  })

  it('authenticated maintainer navigating to /admin is allowed through', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'maintainer', name: 'M', avatar_url: 'https://x.com', role: 'maintainer' }),
    }))
    await authStore.fetchMe()

    await router.push('/admin')
    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('authStore.isMaintainer is true when user has maintainer role (ADMN-01)', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'maintainer', name: 'M', avatar_url: 'https://x.com', role: 'maintainer' }),
    }))
    await authStore.fetchMe()

    await router.push('/admin')
    expect(authStore.isMaintainer).toBe(true)
  })

  it('authStore.isMaintainer is false when user has user role (ADMN-01)', async () => {
    const { router } = await import('./index')
    const authStore = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'user', name: 'U', avatar_url: 'https://x.com', role: 'user' }),
    }))
    await authStore.fetchMe()

    await router.push('/browse')
    await router.push('/admin')

    expect(authStore.isMaintainer).toBe(false)
    expect(router.currentRoute.value.path).toBe('/browse')
  })
})
