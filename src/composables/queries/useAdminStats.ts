import { computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_ADMIN_STATS } from '@/lib/github/queries'

interface AdminStatsResponse {
  repository: {
    total: { totalCount: number }
    flagged: { totalCount: number }
    featured: { totalCount: number }
  }
}

export function useAdminStats() {
  const authStore = useAuthStore()

  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  const query = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      const data = await client<AdminStatsResponse>(GET_ADMIN_STATS, { owner, repo })
      return {
        total: data.repository.total.totalCount,
        flagged: data.repository.flagged.totalCount,
        featured: data.repository.featured.totalCount,
      }
    },
    staleTime: 60_000,
  })

  return {
    total: computed(() => query.data.value?.total ?? 0),
    flagged: computed(() => query.data.value?.flagged ?? 0),
    featured: computed(() => query.data.value?.featured ?? 0),
    isLoading: query.isLoading,
  }
}
