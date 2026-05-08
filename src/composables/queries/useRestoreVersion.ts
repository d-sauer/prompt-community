import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { restoreVersion } from '@/lib/api/mutations'
import type { VersionObject } from '@/types/index'

interface RestoreVariables {
  promptId: string
  targetVersion: VersionObject
}

/**
 * Non-destructive restore: creates a new version from the target version's content.
 * API auto-increments version numbers — no frontend version number tracking needed.
 */
export function useRestoreVersion() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ promptId, targetVersion }: RestoreVariables) => {
      return restoreVersion(promptId, targetVersion.version)
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['prompt-versions', variables.promptId] })
      void queryClient.invalidateQueries({ queryKey: ['prompt', variables.promptId] })
    },
  })
}
