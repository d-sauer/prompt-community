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

// Mock @/lib/github/mutations
vi.mock('@/lib/github/mutations', () => ({
  postComment: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
}))

import { toast } from 'vue-sonner'
import { useOnline } from '@vueuse/core'
import * as mutations from '@/lib/github/mutations'
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
        issueNumber: 42,
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
      expect(stored[0].issueNumber).toBe(42)
      expect(stored[0].payload.body).toBe('Hello')
    })

    it('appends multiple actions sequentially', () => {
      const { enqueue } = useOfflineQueue()
      enqueue({ type: 'postComment', issueNumber: 1, payload: { body: 'A' } })
      enqueue({ type: 'postComment', issueNumber: 2, payload: { body: 'B' } })

      const stored = JSON.parse(
        localStorageMock._store[QUEUE_KEY] ?? '[]',
      ) as QueuedAction[]
      expect(stored).toHaveLength(2)
    })

    it('strips token from payload before storing', () => {
      const { enqueue } = useOfflineQueue()

      enqueue({
        type: 'postComment',
        issueNumber: 99,
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
      const action: QueuedAction = { type: 'postComment', issueNumber: 5, payload: { body: 'Hi' } }
      localStorageMock._store[QUEUE_KEY] = JSON.stringify([action])

      const { getQueue } = useOfflineQueue()
      const result = getQueue()
      expect(result).toHaveLength(1)
      expect(result[0].issueNumber).toBe(5)
    })
  })

  describe('drainQueue', () => {
    it('calls postComment for each queued postComment action', async () => {
      vi.mocked(mutations.postComment).mockResolvedValue({
        id: 1,
        body: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      })

      const action: QueuedAction = {
        type: 'postComment',
        issueNumber: 10,
        payload: { body: 'Test comment' },
      }
      localStorageMock._store[QUEUE_KEY] = JSON.stringify([action])

      const { drainQueue } = useOfflineQueue()
      await drainQueue('my-token')

      expect(mutations.postComment).toHaveBeenCalledWith('my-token', 10, 'Test comment')
    })

    it('clears localStorage after draining', async () => {
      vi.mocked(mutations.postComment).mockResolvedValue({
        id: 1,
        body: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([
        { type: 'postComment', issueNumber: 1, payload: { body: 'Hi' } },
      ])

      const { drainQueue } = useOfflineQueue()
      await drainQueue('token')

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(QUEUE_KEY)
    })

    it('shows synced toast after draining', async () => {
      vi.mocked(mutations.postComment).mockResolvedValue({
        id: 1,
        body: 'done',
        createdAt: '2026-01-01T00:00:00Z',
      })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([
        { type: 'postComment', issueNumber: 1, payload: { body: 'Hi' } },
      ])

      const { drainQueue } = useOfflineQueue()
      await drainQueue('token')

      expect(toast).toHaveBeenCalledWith('Back online — synced 1 queued action(s)')
    })

    it('does nothing when queue is empty', async () => {
      const { drainQueue } = useOfflineQueue()
      await drainQueue('token')

      expect(mutations.postComment).not.toHaveBeenCalled()
      expect(toast).not.toHaveBeenCalled()
    })

    it('shows failure toast and continues on individual action error', async () => {
      vi.mocked(mutations.postComment)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValue({ id: 2, body: 'ok', createdAt: '2026-01-01T00:00:00Z' })

      localStorageMock._store[QUEUE_KEY] = JSON.stringify([
        { type: 'postComment', issueNumber: 1, payload: { body: 'fail' } },
        { type: 'postComment', issueNumber: 2, payload: { body: 'success' } },
      ])

      const { drainQueue } = useOfflineQueue()
      await drainQueue('token')

      expect(toast).toHaveBeenCalledWith('Failed to sync 1 action — cleared')
      expect(toast).toHaveBeenCalledWith('Back online — synced 1 queued action(s)')
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
