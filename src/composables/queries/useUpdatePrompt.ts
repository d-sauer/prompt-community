import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { updatePrompt, createVersion } from '@/lib/api/mutations'
import { useDraftStore } from '@/stores/useDraftStore'

export type UpdateMode = 'edit' | 'version'

export interface UpdatePromptInput {
  mode: UpdateMode
  promptId: string
  title: string
  content: string
  tags: string[]
  /** Required when mode === 'version' */
  changelog?: string
}

/**
 * TanStack mutation for updating an existing prompt.
 * Supports two modes:
 *  - 'edit': PATCH the prompt title/body/tags
 *  - 'version': POST a version record then PATCH the prompt title (VERS-01)
 */
export function useUpdatePrompt() {
  const draftStore = useDraftStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: UpdatePromptInput): Promise<void> => {
      const { mode, promptId, title, content, tags } = input

      if (mode === 'edit') {
        // Simple edit — update title, body, tags
        await updatePrompt(promptId, { title, body: content, tags })
      } else if (mode === 'version') {
        const changelog = input.changelog ?? ''

        // Post version record — API auto-increments version numbers
        await createVersion(promptId, { changelog, body: content })

        // Update title in case it changed
        await updatePrompt(promptId, { title })
      }
    },

    onSuccess: (_: void, input: UpdatePromptInput) => {
      // Refresh prompt detail cache
      void queryClient.invalidateQueries({ queryKey: ['prompt', input.promptId] })
      // Refresh version history cache
      void queryClient.invalidateQueries({ queryKey: ['prompt-versions', input.promptId] })

      // Discard saved draft for this prompt
      draftStore.clear()
    },
  })
}
