import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'

// Mock VueUse before importing the store
const mockBookmarkedIds = ref<number[]>([])

vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useLocalStorage: vi.fn(() => mockBookmarkedIds),
  }
})

describe('useBookmarksStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockBookmarkedIds.value = []
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('bookmarks start empty', async () => {
    const { useBookmarksStore } = await import('./useBookmarksStore')
    const store = useBookmarksStore()
    expect(store.bookmarkedIds).toEqual([])
  })

  it('toggle adds an ID to bookmarkedIds', async () => {
    const { useBookmarksStore } = await import('./useBookmarksStore')
    const store = useBookmarksStore()
    store.toggle(42)
    expect(store.bookmarkedIds).toContain(42)
  })

  it('toggle removes an ID when already present', async () => {
    const { useBookmarksStore } = await import('./useBookmarksStore')
    const store = useBookmarksStore()
    store.toggle(42)
    expect(store.bookmarkedIds).toContain(42)
    store.toggle(42)
    expect(store.bookmarkedIds).not.toContain(42)
  })

  it('isBookmarked returns true when ID is bookmarked', async () => {
    const { useBookmarksStore } = await import('./useBookmarksStore')
    const store = useBookmarksStore()
    store.toggle(7)
    const result = store.isBookmarked(7)
    expect(result.value).toBe(true)
  })

  it('isBookmarked returns false when ID is not bookmarked', async () => {
    const { useBookmarksStore } = await import('./useBookmarksStore')
    const store = useBookmarksStore()
    const result = store.isBookmarked(99)
    expect(result.value).toBe(false)
  })
})
