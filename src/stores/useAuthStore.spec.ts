import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

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
    store.logout()
    expect(store.token).toBeNull()
    expect(store.user).toBeNull()
    expect(store.isMaintainer).toBe(false)
  })

  it('INFR-07: localStorage.setItem is never called after receiveToken', () => {
    // Spy on localStorage.setItem within this test to track calls
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const store = useAuthStore()
    store.receiveToken('tok')
    // Verify token was never written to localStorage — INFR-07
    expect(setItemSpy).not.toHaveBeenCalledWith('token', expect.anything())
  })
})
