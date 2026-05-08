import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import { addReaction, removeReaction } from '@/lib/api/mutations'
import { useOfflineQueue } from '@/composables/queries/useOfflineQueue'
import { toast } from 'vue-sonner'
import type { Prompt, ReactionContent, ReactionGroup } from '@/types/index'

interface ToggleInput {
  content: ReactionContent
  /** Snapshot of viewerHasReacted taken before onMutate modifies the cache */
  isRemoving: boolean
}

/** Map ReactionContent enum to lowercase emoji string expected by the API */
const toApiEmoji = (c: ReactionContent): string => c.toLowerCase()

export function useReactions(promptId: Ref<string>) {
  const queryClient = useQueryClient()
  const { isOnline, enqueue } = useOfflineQueue()

  const mutation = useMutation({
    mutationFn: async ({ content, isRemoving }: ToggleInput) => {
      if (!isOnline.value) {
        enqueue({
          type: 'toggleReaction',
          promptId: promptId.value,
          payload: { content, isRemoving },
        })
        toast('Reaction queued — will sync when back online')
        return []
      }
      if (isRemoving) {
        return removeReaction(promptId.value, toApiEmoji(content))
      }
      return addReaction(promptId.value, toApiEmoji(content))
    },
    onMutate: async ({ content }: ToggleInput) => {
      await queryClient.cancelQueries({ queryKey: ['prompt', promptId.value] })
      const previous = queryClient.getQueryData<Prompt>(['prompt', promptId.value])
      queryClient.setQueryData<Prompt>(['prompt', promptId.value], (old) => {
        if (!old) return old
        return {
          ...old,
          reactionGroups: old.reactionGroups.map((g): ReactionGroup => {
            if (g.content !== content) return g
            const removing = g.viewerHasReacted
            return {
              ...g,
              reactors: { totalCount: removing ? g.reactors.totalCount - 1 : g.reactors.totalCount + 1 },
              viewerHasReacted: !removing,
            }
          }),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['prompt', promptId.value], context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', promptId.value] })
    },
  })

  /**
   * Toggle a reaction on the current prompt.
   * Reads viewerHasReacted BEFORE the optimistic update so the add/remove
   * decision is not affected by the onMutate cache modification.
   */
  function toggle(content: ReactionContent) {
    const current = queryClient.getQueryData<Prompt>(['prompt', promptId.value])
    const group = current?.reactionGroups.find((g) => g.content === content)
    const isRemoving = group?.viewerHasReacted ?? false
    return mutation.mutateAsync({ content, isRemoving })
  }

  return { toggleReaction: mutation, toggle }
}
