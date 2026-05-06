// src/stores/useAuthStore.spec.ts
// Phase 10 rewrite: cookie-based auth flow with poll-on-close popup pattern.
// Previous v1 postMessage/token tests removed; new AUTH-10 tests added.
// New AUTH-10 tests are RED (useAuthStore still has token ref and postMessage pattern).
// Passing tests retained: logout() clearing user and isMaintainer.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

// Stub VITE_API_URL for all tests
vi.stubEnv('VITE_API_URL', 'http://localhost:8787')
vi.mock('vue-sonner', () => ({ toast: { error: vi.fn() } }))

describe('useAuthStore — AUTH-10 (cookie-based auth, poll-on-close)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubEnv('VITE_API_URL', 'http://localhost:8787')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  // AUTH-10: store.token does NOT exist as a public property (or is always null/removed)
  it('AUTH-10: store does not expose token as a public reactive property', () => {
    const store = useAuthStore()
    // After v2.0 rewire: token should not exist or should be undefined
    // In v1 it's a ref that starts null — in v2.0 it must be removed entirely
    expect('token' in store).toBe(false)
  })

  // AUTH-10: store.login() opens a popup to VITE_API_URL/auth/login
  it('AUTH-10: login() opens popup to VITE_API_URL/auth/login (not VITE_CF_WORKER_URL/login)', () => {
    const store = useAuthStore()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      closed: false,
    } as Window)

    store.login()

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('http://localhost:8787/auth/login'),
      expect.any(String),
      expect.any(String),
    )
  })

  // AUTH-10: store.login() uses poll-on-close (not postMessage)
  it('AUTH-10: login() polls popup.closed via setInterval and calls fetchMe() when closed', async () => {
    vi.useFakeTimers()
    const store = useAuthStore()

    // Mock /me fetch
    const fetchSpy = vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser', name: 'Test', avatar_url: 'https://example.com/avatar', role: 'user' }),
    }))

    // Create a fake popup that starts open, then closes after a tick
    const fakePopup = { closed: false } as Window
    vi.spyOn(window, 'open').mockReturnValue(fakePopup)

    store.login()

    // Popup not yet closed — fetchMe should NOT have been called
    expect(fetchSpy).not.toHaveBeenCalled()

    // Simulate popup closing
    fakePopup.closed = true

    // Advance timers past polling interval (200ms typical)
    await vi.advanceTimersByTimeAsync(300)

    // fetchMe should have been called with the /me URL and credentials:include
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      expect.objectContaining({ credentials: 'include' }),
    )

    vi.useRealTimers()
  })

  // AUTH-10: store.fetchMe() calls GET /me with credentials: 'include' (no Authorization header)
  it('AUTH-10: fetchMe() calls GET /me with credentials: "include" and no Authorization header', async () => {
    const store = useAuthStore()

    const fetchSpy = vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser', name: 'Test', avatar_url: 'https://example.com/avatar', role: 'user' }),
    }))

    await store.fetchMe()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/me'),
      expect.objectContaining({ credentials: 'include' }),
    )

    // Must not include Authorization header
    const callArgs = fetchSpy.mock.calls[0][1] as RequestInit
    const headers = callArgs?.headers as Record<string, string> | undefined
    if (headers) {
      expect(headers['Authorization']).toBeUndefined()
      expect(headers['authorization']).toBeUndefined()
    }
  })

  // AUTH-10: fetchMe() on 200 response: sets user.value and isMaintainer from role field
  it('AUTH-10: fetchMe() on 200 response sets user and isMaintainer from role field', async () => {
    const store = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        login: 'testuser',
        name: 'Test User',
        avatar_url: 'https://avatars.example.com/1',
        role: 'maintainer',
      }),
    }))

    await store.fetchMe()

    expect(store.user).not.toBeNull()
    expect(store.user?.login).toBe('testuser')
    expect(store.isMaintainer).toBe(true)
  })

  // AUTH-10: fetchMe() on non-200 response: user remains null, no error thrown
  it('AUTH-10: fetchMe() on non-200 response leaves user null (graceful)', async () => {
    const store = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'unauthorized' }),
    }))

    // Must not throw
    await expect(store.fetchMe()).resolves.not.toThrow()
    expect(store.user).toBeNull()
  })

  // AUTH-10: isAuthenticated is computed from user !== null (not token !== null)
  it('AUTH-10: isAuthenticated is true when user is set (not when token is set)', async () => {
    const store = useAuthStore()

    // Initially not authenticated
    expect(store.isAuthenticated).toBe(false)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser', name: 'Test', avatar_url: 'https://x.com', role: 'user' }),
    }))

    await store.fetchMe()

    // isAuthenticated must be true because user is now set
    expect(store.isAuthenticated).toBe(true)
  })

  // AUTH-10: No postMessage listener registered (window.addEventListener('message', ...) never called)
  it('AUTH-10: login() does not register window message listener (no postMessage pattern)', () => {
    const store = useAuthStore()
    const addListenerSpy = vi.spyOn(window, 'addEventListener')

    vi.spyOn(window, 'open').mockReturnValue({ closed: false } as Window)

    store.login()

    // No 'message' event listener should be registered
    const messageListenerCalls = addListenerSpy.mock.calls.filter(([event]) => event === 'message')
    expect(messageListenerCalls).toHaveLength(0)
  })

  // INFR-07 regression: localStorage.setItem never called with any token/credential
  it('INFR-07 regression: localStorage.setItem never called during fetchMe()', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const store = useAuthStore()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser', name: 'Test', avatar_url: 'https://x.com', role: 'user' }),
    }))

    await store.fetchMe()

    // Nothing credential-like should be written to localStorage
    const credentialWrites = setItemSpy.mock.calls.filter(([, value]) =>
      typeof value === 'string' && (value.includes('token') || value.includes('secret') || value.includes('Bearer')),
    )
    expect(credentialWrites).toHaveLength(0)
  })

  // Retained passing test: logout() clears user and isMaintainer
  it('logout() clears user and isMaintainer', async () => {
    const store = useAuthStore()

    // Set up state first via fetchMe
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ login: 'testuser', name: 'Test', avatar_url: 'https://x.com', role: 'maintainer' }),
    }))
    await store.fetchMe()

    expect(store.user).not.toBeNull()
    expect(store.isMaintainer).toBe(true)

    store.logout()

    expect(store.user).toBeNull()
    expect(store.isMaintainer).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })
})
