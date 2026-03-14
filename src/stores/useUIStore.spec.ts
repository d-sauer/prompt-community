import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from './useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('sidebarCollapsed defaults to false', () => {
    const store = useUIStore()
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('notificationCount defaults to 0', () => {
    const store = useUIStore()
    expect(store.notificationCount).toBe(0)
  })

  it('toggleSidebar flips sidebarCollapsed from false to true', () => {
    const store = useUIStore()
    expect(store.sidebarCollapsed).toBe(false)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(true)
  })

  it('toggleSidebar flips sidebarCollapsed back to false', () => {
    const store = useUIStore()
    store.toggleSidebar()
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('commandPaletteOpen defaults to false', () => {
    const store = useUIStore()
    expect(store.commandPaletteOpen).toBe(false)
  })

  it('openCommandPalette sets commandPaletteOpen to true', () => {
    const store = useUIStore()
    store.openCommandPalette()
    expect(store.commandPaletteOpen).toBe(true)
  })

  it('closeCommandPalette sets commandPaletteOpen to false', () => {
    const store = useUIStore()
    store.openCommandPalette()
    store.closeCommandPalette()
    expect(store.commandPaletteOpen).toBe(false)
  })
})
