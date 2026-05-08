import { computed } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { getAdminQueue, type FlaggedPrompt } from '@/lib/api/admin'

export interface FlaggedIssue {
  id: string
  title: string
  status: 'flagged'
  author: { login: string; avatar_url: string | null }
  created_at: string
}

export function useAdminQueue() {
  const query = useInfiniteQuery({
    queryKey: ['admin', 'queue'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const response = await getAdminQueue({ cursor: pageParam })
      return {
        items: response.data as FlaggedIssue[],
        next_cursor: response.next_cursor,
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
  })

  return {
    items: computed(() => query.data.value?.pages.flatMap((p) => p.items) ?? []),
    isLoading: query.isLoading,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
