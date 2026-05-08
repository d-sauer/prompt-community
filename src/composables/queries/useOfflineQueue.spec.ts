import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

// Mock vue-sonner
vi.mock('vue-sonner', () => ({
  toast: vi.fn(),
}))

// Mock @vueuse/core
vi.mock('@vueuse/core', () => ({
  useOnline: vi.fn(() => ref(true)),
}))

// Mock @/lib/api/mutations
vi.mock('@/lib/api/mutations', () => ({
  postComment: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
}))

import { toast } from 'vue-sonner'
import { useOnline } from '@vueuse/core'
import * as mutations from '@/lib/api/mutations'
import { useOfflineQueue } from './useOfflineQueue'
import type { QueuedAction } from './useOfflineQueue'

const QUEUE_KEY = 'offline_action_queue'

// Simple in-memory localStorage implementation for tests
function makeLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((k) => delete store[k])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    _store: store,
  }
}

let localStorageMock: ReturnType<typeof makeLocalStorageMock>

describe('useOfflineQueue', () => {
  beforeEach(() => {
    localStorageMock = makeLocalStorageMock()
    vi.stubGlobal('localStorage', localStorageMock)
    vi.clearAllMocks()
    // Reset useOnline to return true by default
    vi.mocked(useOnline).mockReturnValue(ref(true))
  })

  describe('enqueue', () => {
    it('appends action to localStorage under the correct key', () => {
      const { enqueue } = useOfflineQueue()
      const action: QueuedAction = {
        type: 'postComment',
        promptId: '01PROMPT42',
        payload: { body: 'Hello' },
      }
      enqueue(action)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        QUEUE_KEY,
        expect.stringContaining('"postComment"'),
      )
      const stored = JSON.parse(
        localStorageMock._store[QUEUE_KEY] ?? '[]',
      ) as QueuedAction[]
      expect(stored).toHaveLength(1)
      expect(stored[0].type).toBe('postComment')
      expect(stored[0].promptId).toBe('01PROMPT42')
      expect(stored[0].payload.body).toBe('Hello')
    })

    it('appends multiple actions sequentially', () => {
      const { enqueue } = useOfflineQueue()
      enqueue({ type: 'postComment', promptId: '01PROMPT01', payload: { body: 'A' } })
      enqueue({ type: 'postComment', promptId: '01PROMPT02', payload: { body: 'B' } })

      const stored = JSON.parse(
        localStorageMock._store[QUEUE_KEY] ?? '[]',
      ) as QueuedAction[]
      expect(stored).toHaveLength(2)
    })

    it('strips token from payload before storing', () => {
      const { enqueue } = useOfflineQueue()

      enqueue({
        type: 'postComment',
        promptId: '01PROMPT99',
        payload: { body: 'test', token: 'secret-token-abc123' },
      })

      // Verify token is NOT in the serialized queue
      const serialized = localStorageMock._store[QUEUE_KEY] ?? ''
      expect(serialized).not.toContain('secret-token-abc123')
    })
  })

  describe('getQueue', () => {
    it('returns empty array when localStorage is empty', () => {
      const { getQueue } = useOfflineQueue()
      expect(getQueue()).toEqual([])
    })

    it('returns empty array on corrupt JSON', () => {
      localStorageMock._store[QUEUE_KEY] = 'not valid json {{'
      const { getQueue } = useOfflineQueue()
      expect(getQueue()).toEqual([])
    })

    it('returns stored actions', () => {
      const action: QueuedAction = { type: 'postComment', promptId: '01PROMPT05', payload: { body: 'Hi' } }
      localStorageMock._store[QUEUE_KEY] = JSON.stringify([action])

      const { getQueue } = useOfflineQueue()
      const result = getQueue()
      expect(result).toHaveLength(1)
      expect(result[0].promptId).toBe('01PROMPT05')
    })
  })

  describe('drainQueue', () => {
    it('calls postComment for each queued postComment action', async () => {
      vi.mocked(mutations.postComment).mockResolvedValue({
        id: '01CMNT001',
        body: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      })

      const action: QueuedAction = {
        type: 'postComment',
        promptId: '01PROMPT10',
        payload: { body: 'Test comment' },
      }
      localStorageMock._store[QUEUE_KEY] = JSON.stringify([action])

      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      expect(mutations.postComment).toHaveBeenCalledWith('01PROMPT10', 'Test comment')
    })

    it('clears localStorage after draining', async () => {
      vi.mocked(mutations.postComment).mockResolvedValue({
        id: '01CMNT001',
        body: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([
        { type: 'postComment', promptId: '01PROMPT01', payload: { body: 'Hi' } },
      ])

      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(QUEUE_KEY)
    })

    it('shows synced toast after draining', async () => {
      vi.mocked(mutations.postComment).mockResolvedValue({
        id: '01CMNT001',
        body: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([
        { type: 'postComment', promptId: '01PROMPT01', payload: { body: 'Hi' } },
      ])

      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      expect(toast).toHaveBeenCalledWith('Back online — synced 1 queued action(s)')
    })

    it('does nothing when queue is empty', async () => {
      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      expect(mutations.postComment).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })

    it('shows failure toast and continues on individual action error', async () => {
      vi.mocked(mutations.postComment)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValue({ id: '01CMNT002', body: 'ok', createdAt: '2026-01-01T00:00:00Z' })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([
        { type: 'postComment', promptId: '01PROMPT01', payload: { body: 'fail' } },
        { type: 'postComment', promptId: '01PROMPT02', payload: { body: 'success' } },
      ])

      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      expect(toast).toHaveBeenCalledWith('Failed to sync 1 action — cleared')
      expect(toast).toHaveBeenCalledWith('Back online — synced 1 queued action(s)')
    })

    it('flushes legacy v1 items with issueNumber before processing', async () => {
      // Mix of legacy (issueNumber) and new (promptId) items
      const legacyItem = { type: 'postComment', issueNumber: 42, payload: { body: 'legacy' } }
      const newItem: QueuedAction = { type: 'postComment', promptId: '01PROMPT01', payload: { body: 'new' } }

      vi.mocked(mutations.postComment).mockResolvedValue({
        id: '01CMNT001',
        body: 'new',
        createdAt: '2026-01-01T00:00:00Z',
      })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([legacyItem, newItem])

      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      // Only the new item should be processed — legacy item flushed
      expect(mutations.postComment).toHaveBeenCalledTimes(1)
      expect(mutations.postComment).toHaveBeenCalledWith('01PROMPT01', 'new')
    })

    it('does nothing when only legacy items exist', async () => {
      const legacyItem = { type: 'postComment', issueNumber: 42, payload: { body: 'legacy' } }
      localStorageMock._store[QUEUE_KEY] = JSON.stringify([legacyItem])

      const { drainQueue } = useOfflineQueue()
      await drainQueue()

      // All legacy items flushed — nothing to process
      expect(mutations.postComment).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })
  })

  describe('offline toast', () => {
    it('shows offline toast when isOnline transitions to false', async () => {
      const isOnlineRef = ref(true)
      vi.mocked(useOnline).mockReturnValue(isOnlineRef)

      useOfflineQueue()

      // Trigger offline
      isOnlineRef.value = false

      // Let Vue watchers run
      await Promise.resolve()

      expect(toast).toHaveBeenCalledWith("You're offline — showing cached content")
    })
  })
})
