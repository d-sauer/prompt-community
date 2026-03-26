import { ref, computed } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { getRepoLabels } from '@/lib/github/queries'
import { createRepoLabel, updateRepoLabel, deleteRepoLabel } from '@/lib/github/mutations'
import { clearEtag } from '@/lib/github/etag'

export interface RepoLabel {
  id: number
  node_id: string
  name: string
  color: string
  description: string | null
}

const LABEL_REGEX = /^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$/

export function validateLabel(name: string): string | null {
  if (!LABEL_REGEX.test(name)) {
    return 'Label name must match namespace:value format (e.g. "category:writing"). Only lowercase letters, numbers, and hyphens allowed.'
  }
  return null
}

export function useAdminLabels() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()
  const labelError = ref<string | null>(null)

  const labelsEtagKey = `${authStore.user?.login ?? ''}:/repos/${import.meta.env.VITE_GITHUB_OWNER}/${import.meta.env.VITE_GITHUB_REPO}/labels`

  const query = useQuery({
    queryKey: ['admin', 'labels'],
    queryFn: () => getRepoLabels(authStore.token!, authStore.user?.login ?? ''),
    staleTime: 60_000,
  })

  const groupedLabels = computed(() => {
    const labels = query.data.value ?? []
    return labels.reduce(
      (acc, label) => {
        const [ns] = label.name.split(':')
        ;(acc[ns] ??= []).push(label)
        return acc
      },
      {} as Record<string, RepoLabel[]>,
    )
  })

  function invalidateLabels() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'labels'] })
  }

  const createLabelMutation = useMutation({
    mutationFn: async ({
      name,
      color,
      description,
    }: {
      name: string
      color: string
      description: string
    }) => {
      const error = validateLabel(name)
      if (error) {
        labelError.value = error
        throw new Error(error)
      }
      labelError.value = null
      await createRepoLabel(authStore.token!, name, color, description)
    },
    onSuccess: () => {
      clearEtag(authStore.user?.login ?? '', labelsEtagKey)
      invalidateLabels()
    },
  })

  const updateLabelMutation = useMutation({
    mutationFn: async ({
      oldName,
      newName,
      color,
      description,
    }: {
      oldName: string
      newName: string
      color: string
      description: string
    }) => {
      const error = validateLabel(newName)
      if (error) {
        labelError.value = error
        throw new Error(error)
      }
      labelError.value = null
      await updateRepoLabel(authStore.token!, oldName, newName, color, description)
    },
    onSuccess: () => {
      clearEtag(authStore.user?.login ?? '', labelsEtagKey)
      invalidateLabels()
    },
  })

  const deleteLabelMutation = useMutation({
    mutationFn: async (name: string) => {
      await deleteRepoLabel(authStore.token!, name)
    },
    onSuccess: () => {
      clearEtag(authStore.user?.login ?? '', labelsEtagKey)
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
