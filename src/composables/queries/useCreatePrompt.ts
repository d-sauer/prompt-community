import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { createPrompt } from '@/lib/api/mutations'
import { useDraftStore } from '@/stores/useDraftStore'
import type { Prompt } from '@/types/index'

export interface CreatePromptInput {
  title: string
  content: string
  tags: string[]
  category: string
  model: string
  difficulty: string
}

/**
 * TanStack mutation for creating a new prompt.
 * Calls createPrompt with structured fields, invalidates prompts query on success.
 */
export function useCreatePrompt() {
  const draftStore = useDraftStore()
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (input: CreatePromptInput): Promise<Prompt> => {
      const { title, content, tags, category, model, difficulty } = input
      return createPrompt({ title, body: content, tags, category, model, difficulty })
    },

    onSuccess: async (prompt: Prompt) => {
      // Reset queries to refetch from page 1 (avoids duplicate prompts)
      await queryClient.resetQueries({ queryKey: ['prompts'] })

      // Discard saved draft
      draftStore.clear()

      // Navigate to the new prompt detail page
      void router.push(`/prompts/${prompt.id}`)
    },
  })
}
