import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_PROMPT_DETAIL } from '@/lib/github/queries'
import { parseFrontmatter } from '@/lib/frontmatter'
import { useAuthStore } from '@/stores/useAuthStore'
import type { Prompt } from '@/types/index'

interface CommentNode {
  id: string
  body: string
  createdAt: string
  author: { login: string; avatarUrl: string }
}

interface PromptDetailResponse {
  repository: {
    issue: {
      number: number
      title: string
      body: string
      createdAt: string
      updatedAt: string
      author: { login: string; avatarUrl: string }
      labels: { nodes: Array<{ name: string; color: string }> }
      reactionGroups: Array<{ content: string; reactors: { totalCount: number } }>
      comments: {
        totalCount: number
        nodes: CommentNode[]
      }
    }
  }
}

export function usePromptDetail(id: Ref<number | null | undefined>) {
  const authStore = useAuthStore()

  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  return useQuery({
    queryKey: computed(() => ['prompt', id.value]),
    queryFn: async (): Promise<Prompt> => {
      const client = createGraphqlClient(authStore.token ?? undefined)

      const data = await client<PromptDetailResponse>(GET_PROMPT_DETAIL, {
        owner,
        repo,
        number: id.value,
      })

      const issue = data.repository.issue
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
    },
    enabled: computed(() => Boolean(id.value)),
    staleTime: 300_000,
  })
}
