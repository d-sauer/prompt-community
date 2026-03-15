import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { updateIssue, createVersionComment } from '@/lib/github/mutations'
import { buildFrontmatter } from '@/lib/frontmatter'
import { useAuthStore } from '@/stores/useAuthStore'
import { useDraftStore } from '@/stores/useDraftStore'
import { buildLabels } from '@/composables/queries/useCreatePrompt'
import type { PromptFrontmatter } from '@/lib/frontmatter'

export type UpdateMode = 'edit' | 'version'

export interface UpdatePromptInput {
  mode: UpdateMode
  issueNumber: number
  title: string
  content: string
  metadata: PromptFrontmatter
  tags: string[]
  /** Required when mode === 'version' */
  versionNumber?: number
  /** Required when mode === 'version' */
  changelog?: string
}

/**
 * TanStack mutation for updating an existing prompt.
 * Supports two modes:
 *  - 'edit': PATCH the issue title/body/labels
 *  - 'version': POST a version comment AND PATCH frontmatter to bump version (VERS-01)
 */
export function useUpdatePrompt() {
  const authStore = useAuthStore()
  const draftStore = useDraftStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdatePromptInput): Promise<void> => {
      if (!authStore.token) {
        throw new Error('Not authenticated — cannot update prompt')
      }

      const { mode, issueNumber, title, content, metadata, tags } = input
      const frontmatterMeta: PromptFrontmatter = { ...metadata, tags }
      const body = `${buildFrontmatter(frontmatterMeta)}${content}`
      const labelNames = buildLabels(metadata)

      if (mode === 'edit') {
        // Simple edit — update title, body, labels
        await updateIssue(authStore.token, issueNumber, title, body, labelNames)
      } else if (mode === 'version') {
        const versionNumber = input.versionNumber ?? metadata.version
        const changelog = input.changelog ?? ''

        // Post version comment with ## Version N header (VERS-01)
        await createVersionComment(
          authStore.token,
          issueNumber,
          versionNumber,
          changelog,
          content,
        )

        // Bump version in frontmatter and update issue body
        const updatedMeta: PromptFrontmatter = {
          ...frontmatterMeta,
          version: versionNumber,
          changelog,
        }
        const updatedBody = `${buildFrontmatter(updatedMeta)}${content}`
        await updateIssue(authStore.token, issueNumber, title, updatedBody, labelNames)
      }
    },

    onSuccess: (_: void, input: UpdatePromptInput) => {
      // Refresh prompt detail cache
      queryClient.invalidateQueries({ queryKey: ['prompt', input.issueNumber] })

      // Discard saved draft for this prompt
      draftStore.clear()
    },
  })
}
