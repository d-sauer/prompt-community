import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { createGraphqlClient } from '@/lib/github/octokit'
import { useAuthStore } from '@/stores/useAuthStore'
import type { VersionObject } from '@/types/index'

// em dash (U+2014) — matches version comment convention
const VERSION_HEADER_RE = /^## Version (\d+) \u2014 (\d{4}-\d{2}-\d{2})/

const GET_VERSIONS = `
  query GetVersions($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        comments(first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
          nodes {
            id
            body
            createdAt
            author {
              login
              avatarUrl
            }
          }
        }
      }
    }
  }
`

interface CommentNode {
  id: string
  body: string
  createdAt: string
  author: { login: string; avatarUrl: string } | null
}

interface VersionsResponse {
  repository: {
    issue: {
      comments: {
        nodes: CommentNode[]
      }
    }
  }
}

/**
 * Parse a single issue comment into a VersionObject.
 * Returns null if the comment does not match the ## Version N pattern (silently filtered).
 */
export function parseVersionComment(comment: CommentNode): VersionObject | null {
  const firstLine = comment.body.split('\n')[0] ?? ''
  const match = VERSION_HEADER_RE.exec(firstLine)
  if (!match) return null

  const versionNumber = parseInt(match[1], 10)
  const dateStr = match[2]

  // Content is everything after the matched header line
  const restAfterHeader = comment.body.replace(firstLine, '').trim()

  // Separate changelog (first non-empty paragraph) from content
  // The format is: header\nchangelog\n\ncontent
  // Split by double newline
  const parts = restAfterHeader.split(/\n\n+/)
  const changelog = parts.length > 1 ? parts[0].trim() : ''
  const content = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : restAfterHeader

  return {
    version: versionNumber,
    date: new Date(dateStr),
    changelog,
    content,
    commentId: comment.id,
    author: comment.author?.login ?? 'unknown',
    authorAvatar: comment.author?.avatarUrl ?? '',
  }
}

export function usePromptVersions(issueNumber: Ref<number | null | undefined>) {
  const authStore = useAuthStore()
  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  return useQuery({
    queryKey: computed(() => ['prompt-versions', issueNumber.value]),
    queryFn: async (): Promise<VersionObject[]> => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      const data = await client<VersionsResponse>(GET_VERSIONS, {
        owner,
        repo,
        number: issueNumber.value,
      })

      const nodes = data.repository.issue?.comments?.nodes ?? []
      return nodes
        .map((comment) => parseVersionComment(comment))
        .filter((v): v is VersionObject => v !== null)
    },
    enabled: computed(() => Boolean(issueNumber.value)),
    staleTime: 300_000,
  })
}
