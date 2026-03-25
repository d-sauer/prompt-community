import { watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { postComment } from '@/lib/github/mutations'

const QUEUE_KEY = 'offline_action_queue'

export interface QueuedAction {
  type: 'postComment' | 'toggleReaction'
  issueNumber: number
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

  async function drainQueue(token: string): Promise<void> {
    const queue = getQueue()
    if (queue.length === 0) return
    localStorage.removeItem(QUEUE_KEY)
    let synced = 0
    for (const action of queue) {
      try {
        if (action.type === 'postComment') {
          await postComment(token, action.issueNumber, action.payload.body as string)
        } else if (action.type === 'toggleReaction') {
          // toggleReaction drain: use addReaction or removeReaction based on payload.isRemoving
          const { addReaction, removeReaction } = await import('@/lib/github/mutations')
          if (action.payload.isRemoving) {
            await removeReaction(
              token,
              action.payload.nodeId as string,
              action.payload.content as string,
            )
          } else {
            await addReaction(
              token,
              action.payload.nodeId as string,
              action.payload.content as string,
            )
          }
        }
        synced++
      } catch {
        toast(`Failed to sync 1 action — cleared`)
      }
    }
    if (synced > 0) {
      toast(`Back online — synced ${synced} queued action(s)`)
    }
  }

  watch(isOnline, (online) => {
    if (!online) {
      toast("You're offline — showing cached content")
    }
  })

  return { isOnline, enqueue, getQueue, drainQueue }
}
