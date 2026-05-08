import { type Ref } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { flagPrompt } from '@/lib/api/mutations'

export function useFlagPrompt(promptId: Ref<string>) {
  const queryClient = useQueryClient()

  const flagMutation = useMutation({
    mutationFn: () => flagPrompt(promptId.value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prompt', promptId.value] })
    },
  })

  return { flagMutation }
}
