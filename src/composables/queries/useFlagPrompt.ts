import { type Ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { flagPrompt } from '@/lib/github/mutations'

export function useFlagPrompt(issueId: Ref<number>) {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  const flagMutation = useMutation({
    mutationFn: () => flagPrompt(authStore.token!, issueId.value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', issueId.value] })
    },
  })

  return { flagMutation }
}
