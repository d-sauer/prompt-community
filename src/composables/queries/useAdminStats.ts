import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getAdminStats } from '@/lib/api/admin'

export function useAdminStats() {
  const query = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => getAdminStats(),
    staleTime: 60_000,
  })

  return {
    total: computed(() => query.data.value?.total ?? 0),
    flagged: computed(() => query.data.value?.flagged ?? 0),
    isLoading: query.isLoading,
  }
}
