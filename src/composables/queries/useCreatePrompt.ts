import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { createIssue } from '@/lib/github/mutations'
import { buildFrontmatter } from '@/lib/frontmatter'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSearchStore } from '@/stores/useSearchStore'
import { useDraftStore } from '@/stores/useDraftStore'
import type { PromptFrontmatter } from '@/lib/frontmatter'

export interface CreatePromptInput {
  title: string
  content: string
  metadata: PromptFrontmatter
  tags: string[]
}

/**
 * TanStack mutation for creating a new prompt.
 * Calls createIssue with YAML frontmatter body, invalidates prompts query on success.
 */
export function useCreatePrompt() {
  const authStore = useAuthStore()
  const searchStore = useSearchStore()
  const draftStore = useDraftStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: CreatePromptInput): Promise<number> => {
      if (!authStore.token) {
        throw new Error('Not authenticated — cannot create prompt')
      }

      const { title, content, metadata, tags } = input

      // Build YAML frontmatter body
      const frontmatterMeta: PromptFrontmatter = {
        ...metadata,
        tags,
      }
      const frontmatterStr = buildFrontmatter(frontmatterMeta)
      const body = `${frontmatterStr}${content}`

      // Build labels from metadata fields (namespace:value pattern)
      const labelNames = buildLabels(metadata)

      return createIssue(authStore.token, title, body, labelNames)
    },

    onSuccess: async (issueNumber: number) => {
      // Reset queries to refetch from page 1 (avoids duplicate prompts)
      await queryClient.resetQueries({ queryKey: ['prompts'] })

      // Rebuild search index with new prompt included
      // Note: search store will rebuild on next prompts query fetch
      // For immediate update, invalidate and let TanStack refetch
      void searchStore

      // Discard saved draft
      draftStore.clear()

      // Navigate to the new prompt detail page
      void router.push(`/prompts/${issueNumber}`)
    },
  })
}

/**
 * Build GitHub label array from frontmatter metadata.
 * Labels follow the namespace:value pattern required by data repo filters.
 */
export function buildLabels(metadata: Partial<PromptFrontmatter>): string[] {
  const labels: string[] = []
  if (metadata.category) labels.push(`category:${metadata.category}`)
  if (metadata.model) labels.push(`model:${metadata.model}`)
  if (metadata.difficulty) labels.push(`difficulty:${metadata.difficulty}`)
  if (metadata.type) labels.push(`type:${metadata.type}`)
  return labels
}
