import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { getAdminLog, type LogEntry as ApiLogEntry } from '@/lib/api/admin'

export interface LogEntry {
  id: string
  action: string
  reason: string | null
  actor: { login: string }
  prompt: { id: string; title: string }
  created_at: string
}

export function useAdminLog() {
  const dateFrom = ref<string>('')
  const dateTo = ref<string>('')

  const query = useQuery({
    queryKey: ['admin', 'log'],
    queryFn: async (): Promise<LogEntry[]> => {
      const response = await getAdminLog()
      return response.data as LogEntry[]
    },
    staleTime: 60_000,
  })

  const entries = computed<LogEntry[]>(() => {
    const all = query.data.value ?? []
    return all.filter((entry) => {
      if (dateFrom.value && entry.created_at < dateFrom.value) return false
      if (dateTo.value && entry.created_at > dateTo.value + 'T23:59:59Z') return false
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

// Re-export ApiLogEntry type for external consumers if needed
export type { ApiLogEntry }
