import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getPromptVersions } from '@/lib/api/queries'

export function usePromptVersions(promptId: Ref<string | null | undefined>) {
  return useQuery({
    queryKey: computed(() => ['prompt-versions', promptId.value]),
    queryFn: async () => {
      return getPromptVersions(promptId.value!)
    },
    enabled: computed(() => Boolean(promptId.value)),
    staleTime: 300_000,
  })
}
