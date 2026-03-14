import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { defineComponent } from 'vue'

// Mock vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock useUIStore
const mockOpenCommandPalette = vi.fn()
const mockToggleSidebar = vi.fn()
vi.mock('@/stores/useUIStore', () => ({
  useUIStore: () => ({
    openCommandPalette: mockOpenCommandPalette,
    toggleSidebar: mockToggleSidebar,
  }),
}))

// Import after mocks
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

const TestComponent = defineComponent({
  setup() {
    useKeyboardShortcuts()
  },
  template: '<div></div>',
})

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  let wrapper: ReturnType<typeof mount> | null = null

  function mountComponent() {
    wrapper = mount(TestComponent, {
      global: {
        plugins: [createTestingPinia()],
      },
    })
    return wrapper
  }

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
      wrapper = null
    }
  })

  it('⌘K sets commandPaletteOpen to true via uiStore.openCommandPalette()', () => {
    mountComponent()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
    expect(mockOpenCommandPalette).toHaveBeenCalledTimes(1)
  })

  it('[ toggles sidebar via uiStore.toggleSidebar()', () => {
    mountComponent()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '[', bubbles: true }))
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
  })

  it('G+B navigates to /browse', () => {
    mountComponent()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }))
    expect(mockPush).toHaveBeenCalledWith('/browse')
  })

  it('G+N navigates to /prompts/new', () => {
    mountComponent()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }))
    expect(mockPush).toHaveBeenCalledWith('/prompts/new')
  })

  it('shortcuts suppressed when input is focused (G+B does NOT navigate)', () => {
    mountComponent()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }))
    expect(mockPush).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('chord timeout: G pressed, >500ms passes, B pressed — does NOT navigate', () => {
    mountComponent()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))
    // Advance timer past chord timeout
    vi.advanceTimersByTime(600)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', bubbles: true }))
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('e.preventDefault() called on ⌘K to suppress browser find-in-page', () => {
    mountComponent()
    const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})
