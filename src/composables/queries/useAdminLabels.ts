import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { createLabel, updateLabel, deleteLabel, type AdminLabel } from '@/lib/api/admin'
import { getLabels } from '@/lib/api/queries'

// Re-export AdminLabel as RepoLabel for backward compatibility with consumers
export type RepoLabel = AdminLabel

const LABEL_REGEX = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/

export function validateLabel(name: string): string | null {
  if (!LABEL_REGEX.test(name)) {
    return 'Label name must match namespace:value format (e.g. "category:writing"). Only lowercase letters, numbers, and hyphens allowed.'
  }
  return null
}

export function useAdminLabels() {
  const queryClient = useQueryClient()
  const labelError = ref<string | null>(null)

  const query = useQuery({
    queryKey: ['admin', 'labels'],
    queryFn: () => getLabels(),
    staleTime: 60_000,
  })

  // getLabels() returns a grouped object: { categories, models, difficulties, tags, ... }
  // Flatten all label arrays and group by prefix for the admin UI
  const groupedLabels = computed(() => {
    const grouped = query.data.value ?? {}
    // Collect all labels from all groups and re-group by prefix
    const allLabels: AdminLabel[] = []
    for (const labels of Object.values(grouped)) {
      if (Array.isArray(labels)) {
        for (const label of labels) {
          // getLabels returns { name, color } shape — wrap in AdminLabel-compatible shape
          allLabels.push({
            id: (label as { name: string; color: string }).name,
            prefix: (label as { name: string }).name.split(':')[0] ?? '',
            value: (label as { name: string }).name.split(':')[1] ?? '',
            color: (label as { color: string }).color ?? null,
            description: null,
          })
        }
      }
    }
    // Group by prefix
    return allLabels.reduce(
      (acc, label) => {
        ;(acc[label.prefix] ??= []).push(label)
        return acc
      },
      {} as Record<string, AdminLabel[]>,
    )
  })

  function invalidateLabels() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'labels'] })
  }

  const createLabelMutation = useMutation({
    mutationFn: async ({
      prefix,
      value,
      color,
      description,
    }: {
      prefix: string
      value: string
      color?: string
      description?: string
    }) => {
      const combinedName = `${prefix}:${value}`
      const error = validateLabel(combinedName)
      if (error) {
        labelError.value = error
        throw new Error(error)
      }
      labelError.value = null
      return createLabel({ prefix, value, color, description })
    },
    onSuccess: () => {
      invalidateLabels()
    },
  })

  const updateLabelMutation = useMutation({
    mutationFn: async ({
      id,
      prefix,
      value,
      color,
      description,
    }: {
      id: string
      prefix?: string
      value?: string
      color?: string
      description?: string
    }) => {
      if (prefix !== undefined && value !== undefined) {
        const combinedName = `${prefix}:${value}`
        const error = validateLabel(combinedName)
        if (error) {
          labelError.value = error
          throw new Error(error)
        }
      }
      labelError.value = null
      return updateLabel(id, { prefix, value, color, description })
    },
    onSuccess: () => {
      invalidateLabels()
    },
  })

  const deleteLabelMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteLabel(id)
    },
    onSuccess: () => {
      invalidateLabels()
    },
  })

  return {
    groupedLabels,
    isLoading: query.isLoading,
    validateLabel,
    createLabelMutation,
    updateLabelMutation,
    deleteLabelMutation,
    labelError,
  }
}
