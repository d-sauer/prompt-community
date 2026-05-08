import { watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { postComment, addReaction, removeReaction } from '@/lib/api/mutations'
import type { ReactionContent } from '@/types/index'

const QUEUE_KEY = 'offline_action_queue'

export interface QueuedAction {
  type: 'postComment' | 'toggleReaction'
  promptId: string
  payload: Record<string, unknown> // no token field — never store tokens
}

export function useOfflineQueue() {
  const isOnline = useOnline()

  function getQueue(): QueuedAction[] {
    try {
      return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as QueuedAction[]
    } catch {
      return []
    }
  }

  function enqueue(action: QueuedAction): void {
    // Defensive: strip any token from payload before storing
    const { ...safePayload } = action.payload
    delete (safePayload as Record<string, unknown>).token
    const queue = getQueue()
    queue.push({ ...action, payload: safePayload })
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  }

  async function drainQueue(): Promise<void> {
    // Flush stale v1 items — integer IDs are incompatible with ULID API
    let queue = getQueue()
    const legacyItems = queue.filter((a) => 'issueNumber' in a)
    if (legacyItems.length > 0) {
      queue = queue.filter((a) => !('issueNumber' in a))
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    }
    if (queue.length === 0) return

    let synced = 0
    for (const action of queue) {
      try {
        if (action.type === 'postComment') {
          await postComment(action.promptId, action.payload.body as string)
        } else if (action.type === 'toggleReaction') {
          if (action.payload.isRemoving) {
            await removeReaction(action.promptId, action.payload.content as string)
          } else {
            await addReaction(action.promptId, action.payload.content as string)
          }
        }
        synced++
      } catch {
        toast(`Failed to sync 1 action — cleared`)
      }
    }
    // Clear queue after processing
    localStorage.removeItem(QUEUE_KEY)
    if (synced > 0) {
      toast(`Back online — synced ${synced} queued action(s)`)
    }
  }

  watch(isOnline, (online) => {
    if (!online) {
      toast("You're offline — showing cached content")
    } else {
      void drainQueue()
    }
  })

  return { isOnline, enqueue, getQueue, drainQueue }
}
