import { useMutation, useQueryClient } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { addReaction, removeReaction } from '@/lib/github/mutations'
import type { Prompt, ReactionContent, ReactionGroup } from '@/types/index'

interface ToggleInput {
  content: ReactionContent
  /** Snapshot of viewerHasReacted taken before onMutate modifies the cache */
  isRemoving: boolean
}

export function useReactions(issueId: Ref<number>, nodeId: Ref<string>) {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  const mutation = useMutation({
    mutationFn: async ({ content, isRemoving }: ToggleInput) => {
      if (isRemoving) {
        return removeReaction(authStore.token!, nodeId.value, content)
      }
      return addReaction(authStore.token!, nodeId.value, content)
    },
    onMutate: async ({ content }: ToggleInput) => {
      await queryClient.cancelQueries({ queryKey: ['prompt', issueId.value] })
      const previous = queryClient.getQueryData<Prompt>(['prompt', issueId.value])
      queryClient.setQueryData<Prompt>(['prompt', issueId.value], (old) => {
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
        queryClient.setQueryData(['prompt', issueId.value], context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', issueId.value] })
    },
  })

  /**
   * Toggle a reaction on the current prompt.
   * Reads viewerHasReacted BEFORE the optimistic update so the add/remove
   * decision is not affected by the onMutate cache modification.
   */
  function toggle(content: ReactionContent) {
    const current = queryClient.getQueryData<Prompt>(['prompt', issueId.value])
    const group = current?.reactionGroups.find((g) => g.content === content)
    const isRemoving = group?.viewerHasReacted ?? false
    return mutation.mutateAsync({ content, isRemoving })
  }

  return { toggleReaction: mutation, toggle }
}
