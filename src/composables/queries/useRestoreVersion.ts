import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { createVersionComment } from '@/lib/github/mutations'
import { useAuthStore } from '@/stores/useAuthStore'
import type { VersionObject } from '@/types/index'

interface RestoreVariables {
  issueNumber: number
  targetVersion: VersionObject
  newVersionNumber: number
}

/**
 * Non-destructive restore: posts a new version comment with the old content.
 * Does NOT delete or modify the original version comment.
 */
export function useRestoreVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ issueNumber, targetVersion, newVersionNumber }: RestoreVariables) => {
      const authStore = useAuthStore()
      const token = authStore.token
      if (!token) throw new Error('Authentication required to restore a version')

      const changelog = `Restored from Version ${targetVersion.version}`
      return createVersionComment(token, issueNumber, newVersionNumber, changelog, targetVersion.content)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['prompt-versions', variables.issueNumber] })
      void queryClient.invalidateQueries({ queryKey: ['prompt', variables.issueNumber] })
    },
  })
}
