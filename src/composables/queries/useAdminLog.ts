import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_FLAGGED_ISSUES, getIssueComments } from '@/lib/github/queries'

export interface LogEntry {
  timestamp: string
  action: string
  promptTitle: string
  maintainerLogin: string
  issueNumber: number
}

const MODERATION_COMMENT_REGEX = /^✓ (Approved|Hidden|Deleted|Featured|Unfeatured) by @(\S+)/

interface FlaggedIssuesResponse {
  repository: {
    issues: {
      nodes: Array<{
        number: number
        title: string
      }>
    }
  }
}

export function useAdminLog() {
  const authStore = useAuthStore()
  const dateFrom = ref<string>('')
  const dateTo = ref<string>('')

  const owner = import.meta.env.VITE_GITHUB_OWNER as string
  const repo = import.meta.env.VITE_GITHUB_REPO as string

  const query = useQuery({
    queryKey: ['admin', 'log'],
    queryFn: async () => {
      const client = createGraphqlClient(authStore.token ?? undefined)
      // Fetch all flagged issues (without pagination for log purposes)
      const data = await client<FlaggedIssuesResponse>(GET_FLAGGED_ISSUES, {
        owner,
        repo,
        after: undefined,
      })
      const issues = data.repository.issues.nodes

      // Fetch comments for all issues in parallel (reads, not writes)
      const commentArrays = await Promise.all(
        issues.map((issue) =>
          getIssueComments(authStore.token!, issue.number, authStore.user?.login ?? '').then((comments) =>
            comments.map((c) => ({ ...c, issueNumber: issue.number, issueTitle: issue.title })),
          ),
        ),
      )

      const entries: LogEntry[] = []
      for (const comments of commentArrays) {
        for (const comment of comments) {
          const match = MODERATION_COMMENT_REGEX.exec(comment.body)
          if (!match) continue
          entries.push({
            timestamp: comment.created_at,
            action: match[1],
            promptTitle: comment.issueTitle,
            maintainerLogin: match[2],
            issueNumber: comment.issueNumber,
          })
        }
      }

      // Sort by timestamp descending
      entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      return entries
    },
    staleTime: 60_000,
  })

  const entries = computed<LogEntry[]>(() => {
    const all = query.data.value ?? []
    return all.filter((entry) => {
      if (dateFrom.value && entry.timestamp < dateFrom.value) return false
      if (dateTo.value && entry.timestamp > dateTo.value + 'T23:59:59Z') return false
      return true
    })
  })

  return {
    entries,
    isLoading: query.isLoading,
    dateFrom,
    dateTo,
  }
}
