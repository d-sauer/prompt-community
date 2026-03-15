import { useInfiniteQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_PROMPTS } from '@/lib/github/queries'
import { parseFrontmatter } from '@/lib/frontmatter'
import { useAuthStore } from '@/stores/useAuthStore'
import type { FilterState, Prompt } from '@/types/index'

interface PromptsQueryVars {
  owner: string
  repo: string
  labels?: string[]
  after?: string
  [key: string]: unknown
}

interface IssueNode {
  number: number
  title: string
  body: string
  createdAt: string
  updatedAt: string
  author: { login: string; avatarUrl: string }
  labels: { nodes: Array<{ name: string; color: string }> }
  reactionGroups: Array<{ content: string; reactors: { totalCount: number } }>
  comments: { totalCount: number }
}

interface PromptsQueryResponse {
  repository: {
    issues: {
      pageInfo: { hasNextPage: boolean; endCursor: string | null }
      nodes: IssueNode[]
    }
  }
}

function mapIssueToPrompt(issue: IssueNode): Prompt {
  const { frontmatter, content } = parseFrontmatter(issue.body ?? '')
  return {
    id: issue.number,
    title: issue.title,
    body: content,
    frontmatter: frontmatter ?? {
      type: 'prompt',
      category: '',
      model: '',
      difficulty: 'beginner',
      tags: [],
      version: 1,
    },
    author: issue.author ?? { login: 'unknown', avatarUrl: '' },
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    labels: issue.labels?.nodes ?? [],
    reactionGroups: issue.reactionGroups ?? [],
    commentCount: issue.comments?.totalCount ?? 0,
  }
}

export function usePromptsQuery(filters: Ref<FilterState>) {
  const authStore = useAuthStore()

  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  return useInfiniteQuery({
    queryKey: computed(() => ['prompts', filters.value]),
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      const client = createGraphqlClient(authStore.token ?? undefined)

      const labelFilters: string[] = []
      if (filters.value.category) labelFilters.push(`category:${filters.value.category}`)
      if (filters.value.model) labelFilters.push(`model:${filters.value.model}`)

      const vars: PromptsQueryVars = {
        owner,
        repo,
        labels: labelFilters.length > 0 ? labelFilters : undefined,
        after: pageParam,
      }

      const data = await client<PromptsQueryResponse>(GET_PROMPTS, vars)
      const issues = data.repository.issues

      return {
        prompts: issues.nodes.map(mapIssueToPrompt),
        pageInfo: issues.pageInfo,
      }
    },
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.endCursor ?? undefined : undefined,
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
  })
}
