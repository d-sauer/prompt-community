import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getPromptDetail } from '@/lib/api/queries'

export function usePromptDetail(id: Ref<string | null | undefined>) {
  return useQuery({
    queryKey: computed(() => ['prompt', id.value]),
    queryFn: async () => {
      return getPromptDetail(id.value!)
    },
    enabled: computed(() => Boolean(id.value)),
    staleTime: 300_000,
  })
}
