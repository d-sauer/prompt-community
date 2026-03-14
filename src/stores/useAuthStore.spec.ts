import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Set the worker URL env var for login tests
    vi.stubEnv('VITE_CF_WORKER_URL', 'https://worker.test')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  // --- Existing tests from Plan 01-01 ---

  it('token is null by default', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
  })

  it('isAuthenticated is false by default', () => {
    const store = useAuthStore()
    expect(store.isAuthenticated).toBe(false)
  })

  it('receiveToken sets token and isAuthenticated becomes true', () => {
    const store = useAuthStore()
    store.receiveToken('tok')
    expect(store.token).toBe('tok')
    expect(store.isAuthenticated).toBe(true)
  })

  it('logout clears token, user, and isMaintainer', () => {
    const store = useAuthStore()
    store.receiveToken('tok')
    store.isMaintainer = true
    store.logout()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isMaintainer).toBe(false)
  })

  it('INFR-07: localStorage.setItem is never called after receiveToken', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const store = useAuthStore()
    store.receiveToken('tok')
    expect(setItemSpy).not.toHaveBeenCalledWith('token', expect.anything())
  })

  // --- New tests for Plan 01-02 (full login flow) ---

  it('Test 6: login() calls window.open with VITE_CF_WORKER_URL/login URL', () => {
    const store = useAuthStore()
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window)

    store.login()

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('https://worker.test/login'),
      'github-oauth',
      expect.any(String),
    )
    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('state='),
      expect.any(String),
      expect.any(String),
    )
  })

  it('Test 7: after postMessage with matching token and state, isAuthenticated becomes true', async () => {
    const store = useAuthStore()
    vi.spyOn(window, 'open').mockReturnValue({} as Window)

    // Capture the state that login() generates
    let capturedState: string | null = null
    const originalOpen = window.open
    vi.spyOn(window, 'open').mockImplementation((url, ...args) => {
      const urlStr = url?.toString() ?? ''
      const match = urlStr.match(/state=([^&]+)/)
      if (match) capturedState = match[1]
      return {} as Window
    })

    store.login()

    expect(capturedState).not.toBeNull()

    // Simulate the postMessage from the worker
    const messageEvent = new MessageEvent('message', {
      data: { token: 'test-token-abc', state: capturedState },
      origin: 'https://worker.test',
    })
    window.dispatchEvent(messageEvent)

    // Allow microtasks to process
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(store.isAuthenticated).toBe(true)
    expect(store.token).toBe('test-token-abc')
  })

  it('Test 8: postMessage from wrong origin is rejected (isAuthenticated stays false)', async () => {
    const store = useAuthStore()

    let capturedState: string | null = null
    vi.spyOn(window, 'open').mockImplementation((url, ...args) => {
      const urlStr = url?.toString() ?? ''
      const match = urlStr.match(/state=([^&]+)/)
      if (match) capturedState = match[1]
      return {} as Window
    })

    store.login()

    // Send from wrong origin
    const messageEvent = new MessageEvent('message', {
      data: { token: 'evil-token', state: capturedState },
      origin: 'https://evil.site',
    })
    window.dispatchEvent(messageEvent)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(store.isAuthenticated).toBe(false)
  })

  it('Test 9: postMessage with mismatched state is rejected (isAuthenticated stays false)', async () => {
    const store = useAuthStore()
    vi.spyOn(window, 'open').mockReturnValue({} as Window)

    store.login()

    // Send with wrong state
    const messageEvent = new MessageEvent('message', {
      data: { token: 'test-token', state: 'wrong-state-value' },
      origin: 'https://worker.test',
    })
    window.dispatchEvent(messageEvent)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(store.isAuthenticated).toBe(false)
  })

  it('Test 10: logout() clears token, user, and isMaintainer', () => {
    const store = useAuthStore()
    store.receiveToken('tok')
    store.isMaintainer = true
    store.logout()

    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isMaintainer).toBe(false)
    expect(store.isAuthenticated).toBe(false)
  })

  it('Test 11: INFR-07 regression — localStorage.setItem never called with token value after postMessage', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const store = useAuthStore()

    let capturedState: string | null = null
    vi.spyOn(window, 'open').mockImplementation((url) => {
      const urlStr = url?.toString() ?? ''
      const match = urlStr.match(/state=([^&]+)/)
      if (match) capturedState = match[1]
      return {} as Window
    })

    store.login()

    const messageEvent = new MessageEvent('message', {
      data: { token: 'secret-token-value', state: capturedState },
      origin: 'https://worker.test',
    })
    window.dispatchEvent(messageEvent)

    await new Promise((resolve) => setTimeout(resolve, 0))

    // Token must be in store (proves the postMessage worked)
    expect(store.token).toBe('secret-token-value')
    // But never written to localStorage
    const tokenWritten = setItemSpy.mock.calls.some(
      ([, value]) => typeof value === 'string' && value.includes('secret-token-value'),
    )
    expect(tokenWritten).toBe(false)
  })
})
