import { useInfiniteQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getPrompts } from '@/lib/api/queries'
import type { FilterState } from '@/types/index'

export function usePromptsQuery(filters: Ref<FilterState>) {
  return useInfiniteQuery({
    queryKey: computed(() => ['prompts', filters.value]),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      return getPrompts({ ...filters.value, cursor: pageParam })
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
  })
}
