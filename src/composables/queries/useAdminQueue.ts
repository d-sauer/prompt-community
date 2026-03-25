import { computed } from 'vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_FLAGGED_ISSUES } from '@/lib/github/queries'

export interface FlaggedIssue {
  id: string
  number: number
  title: string
  createdAt: string
  author: { login: string; avatarUrl: string }
  labels: { name: string; color: string }[]
}

interface FlaggedIssuesResponse {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: Array<{
        id: string
        number: number
        title: string
        createdAt: string
        author: { login: string; avatarUrl: string }
        labels: { nodes: Array<{ name: string; color: string }> }
      }>
    }
  }
}

export function useAdminQueue() {
  const authStore = useAuthStore()

  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  const query = useInfiniteQuery({
    queryKey: ['admin', 'queue'],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      const data = await client<FlaggedIssuesResponse>(GET_FLAGGED_ISSUES, {
        owner,
        repo,
        after: pageParam,
      })
      const issues = data.repository.issues
      return {
        items: issues.nodes.map((node) => ({
          id: node.id,
          number: node.number,
          title: node.title,
          createdAt: node.createdAt,
          author: node.author,
          labels: node.labels.nodes,
        })) as FlaggedIssue[],
        pageInfo: issues.pageInfo,
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor ?? undefined : undefined,
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
