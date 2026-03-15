import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_USER_SUBMISSIONS } from '@/lib/github/queries'
import { useAuthStore } from '@/stores/useAuthStore'

interface SubmissionNode {
  number: number
  title: string
  createdAt: string
  reactionGroups: Array<{ content: string; reactors: { totalCount: number } }>
  comments: { totalCount: number }
  labels: { nodes: Array<{ name: string; color: string }> }
}

interface UserSubmissionsResponse {
  search: {
    issueCount: number
    nodes: SubmissionNode[]
  }
}

export function useUserProfile(login: Ref<string>) {
  const authStore = useAuthStore()
  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  const query = useQuery({
    queryKey: computed(() => ['user-profile', login.value]),
    queryFn: async (): Promise<UserSubmissionsResponse> => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      const searchQuery = `repo:${owner}/${repo} author:${login.value} is:issue is:open`
      return client<UserSubmissionsResponse>(GET_USER_SUBMISSIONS, { searchQuery, first: 100 })
    },
    enabled: computed(() => Boolean(login.value)),
    staleTime: 300_000,
  })

  const submissions = computed(() => query.data.value?.search.nodes ?? [])

  const totalVotes = computed(() =>
    submissions.value
      .flatMap((p) => p.reactionGroups)
      .reduce((sum, g) => sum + g.reactors.totalCount, 0),
  )

  const totalSubmissions = computed(() => query.data.value?.search.issueCount ?? 0)

  return { ...query, submissions, totalVotes, totalSubmissions }
}
