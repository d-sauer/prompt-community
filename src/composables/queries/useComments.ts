import { computed, type Ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { postComment } from '@/lib/github/mutations'
import { useOfflineQueue } from '@/composables/queries/useOfflineQueue'
import { toast } from 'vue-sonner'
import type { CommentNode, Prompt } from '@/types/index'

export function useComments(issueId: Ref<number>) {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const { isOnline, enqueue } = useOfflineQueue()

  const comments = computed<CommentNode[]>(
    () => queryClient.getQueryData<Prompt>(['prompt', issueId.value])?.comments ?? [],
  )

  const postCommentMutation = useMutation({
    mutationFn: (body: string) => {
      if (!isOnline.value) {
        enqueue({ type: 'postComment', issueNumber: issueId.value, payload: { body } })
        toast('Comment queued — will send when back online')
        return Promise.resolve({ id: 0, body, createdAt: new Date().toISOString() })
      }
      return postComment(authStore.token!, issueId.value, body)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', issueId.value] })
    },
  })

  return { comments, postCommentMutation }
}
