import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick, ref } from 'vue'

// Mock VueUse before importing the store
const mockPersistedDraft = ref<Record<string, unknown>>({})

// Track the interval callback for manual triggering
let capturedIntervalCallback: (() => void) | null = null

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useLocalStorage: vi.fn(() => mockPersistedDraft),
    useInterval: vi.fn((fn: () => void, _interval: number) => {
      capturedIntervalCallback = fn
    }),
  }
})

describe('useDraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockPersistedDraft.value = {}
    capturedIntervalCallback = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('auto-save fires after 30s interval (fake timers)', async () => {
    const { useDraftStore } = await import('./useDraftStore')
    const store = useDraftStore()

    // Trigger the interval callback directly (simulating 30s elapsed)
    expect(capturedIntervalCallback).not.toBeNull()
    capturedIntervalCallback!()

    // After save() via interval, lastSaved should be set
    expect(store.lastSaved).not.toBeNull()
    expect(store.isDirty).toBe(false)
  })

  it('isDirty becomes true when title changes', async () => {
    const { useDraftStore } = await import('./useDraftStore')
    const store = useDraftStore()
    expect(store.isDirty).toBe(false)
    // In Pinia setup stores, refs are auto-unwrapped — use direct assignment
    store.title = 'New title'
    await nextTick()
    expect(store.isDirty).toBe(true)
  })

  it('isDirty becomes false after save()', async () => {
    const { useDraftStore } = await import('./useDraftStore')
    const store = useDraftStore()
    store.title = 'Some title'
    await nextTick()
    expect(store.isDirty).toBe(true)
    store.save()
    expect(store.isDirty).toBe(false)
  })

  it('recover() restores from localStorage', async () => {
    const { useDraftStore } = await import('./useDraftStore')
    // Pre-populate the mock persisted draft before creating the store
    mockPersistedDraft.value = {
      title: 'Recovered Title',
      content: 'Recovered content',
      metadata: {},
      tags: ['vue'],
    }
    const store = useDraftStore()
    store.recover()
    // recover() sets isDirty=false via nextTick (after watch fires)
    await nextTick()
    await nextTick()
    expect(store.title).toBe('Recovered Title')
    expect(store.content).toBe('Recovered content')
    expect(store.tags).toContain('vue')
    expect(store.isDirty).toBe(false)
  })

  it('clear() empties draft and resets isDirty', async () => {
    const { useDraftStore } = await import('./useDraftStore')
    const store = useDraftStore()
    store.title = 'Something'
    store.content = 'Body'
    await nextTick()
    expect(store.isDirty).toBe(true)
    store.clear()
    expect(store.title).toBe('')
    expect(store.content).toBe('')
    expect(store.isDirty).toBe(false)
    expect(store.lastSaved).toBeNull()
  })
})
