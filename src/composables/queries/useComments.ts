import { computed, type Ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { postComment } from '@/lib/github/mutations'
import type { CommentNode, Prompt } from '@/types/index'

export function useComments(issueId: Ref<number>) {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  const comments = computed<CommentNode[]>(
    () => queryClient.getQueryData<Prompt>(['prompt', issueId.value])?.comments ?? [],
  )

  const postCommentMutation = useMutation({
    mutationFn: (body: string) => postComment(authStore.token!, issueId.value, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', issueId.value] })
    },
  })

  return { comments, postCommentMutation }
}
