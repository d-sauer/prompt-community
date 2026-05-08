import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { approvePrompt, hidePrompt } from '@/lib/api/admin'
import { deletePrompt } from '@/lib/api/mutations'

export function useAdminActions() {
  const queryClient = useQueryClient()

  function invalidateAdmin() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'log'] })
  }

  const approveMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      approvePrompt(id, reason),
    onSuccess: invalidateAdmin,
  })

  const hideMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) =>
      hidePrompt(id, reason),
    onSuccess: invalidateAdmin,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => deletePrompt(id),
    onSuccess: invalidateAdmin,
  })

  // featureMutation: stubbed as no-op — no 'featured' status in v2 D1 enum (RESEARCH Pitfall 3)
  // Kept exported so AdminQueueTab.vue does not crash when referencing featureMutation
  const featureMutation = useMutation({
    mutationFn: async () => {
      throw new Error('feature action not available in v2')
    },
    onSuccess: invalidateAdmin,
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async (items: { id: string; reason?: string }[]) => {
      for (const item of items) {
        await approvePrompt(item.id, item.reason)
      }
    },
    onSuccess: invalidateAdmin,
  })

  const bulkHideMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await hidePrompt(id)
      }
    },
    onSuccess: invalidateAdmin,
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await deletePrompt(id)
      }
    },
    onSuccess: invalidateAdmin,
  })

  return {
    approveMutation,
    hideMutation,
    deleteMutation,
    featureMutation,
    bulkApproveMutation,
    bulkHideMutation,
    bulkDeleteMutation,
  }
}
