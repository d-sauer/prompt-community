import { useInfiniteQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getUserActivity, type ActivityItem } from '@/lib/api/queries'

export { type ActivityItem }

export function useUserActivity(login: Ref<string>) {
  const query = useInfiniteQuery({
    queryKey: computed(() => ['user-activity', login.value]),
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      getUserActivity(login.value, pageParam),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: computed(() => Boolean(login.value)),
    staleTime: 60_000,
  })

  const activityItems = computed<ActivityItem[]>(() =>
    query.data.value?.pages.flatMap((p) => p.data) ?? [],
  )

  return { ...query, activityItems }
}
