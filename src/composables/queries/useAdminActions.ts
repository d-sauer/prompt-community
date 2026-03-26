import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  addLabelToIssue,
  removeLabelFromIssue,
  deleteIssueGraphQL,
  postModerationComment,
} from '@/lib/github/mutations'

interface ApproveInput {
  issueNumber: number
  nodeId: string
}

interface HideInput {
  issueNumber: number
}

interface FeatureInput {
  issueNumber: number
  currentLabels: { name: string }[]
}

export function useAdminActions() {
  const queryClient = useQueryClient()
  const authStore = useAuthStore()

  function invalidateAdmin() {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'queue'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'log'] })
  }

  const approveMutation = useMutation({
    mutationFn: async ({ issueNumber }: ApproveInput) => {
      await removeLabelFromIssue(authStore.token!, issueNumber, 'flag:review')
      await postModerationComment(authStore.token!, issueNumber, 'Approved', authStore.user!.login)
    },
    onSuccess: invalidateAdmin,
  })

  const hideMutation = useMutation({
    mutationFn: async ({ issueNumber }: HideInput) => {
      await addLabelToIssue(authStore.token!, issueNumber, 'status:hidden')
      await postModerationComment(authStore.token!, issueNumber, 'Hidden', authStore.user!.login)
    },
    onSuccess: invalidateAdmin,
  })

  const deleteMutation = useMutation({
    mutationFn: async (nodeId: string) => {
      await deleteIssueGraphQL(authStore.token!, nodeId)
    },
    onSuccess: invalidateAdmin,
  })

  const featureMutation = useMutation({
    mutationFn: async ({ issueNumber, currentLabels }: FeatureInput) => {
      const isFeatured = currentLabels.some((l) => l.name === 'status:featured')
      if (isFeatured) {
        await removeLabelFromIssue(authStore.token!, issueNumber, 'status:featured')
        await postModerationComment(authStore.token!, issueNumber, 'Unfeatured', authStore.user!.login)
      } else {
        await addLabelToIssue(authStore.token!, issueNumber, 'status:featured')
        await postModerationComment(authStore.token!, issueNumber, 'Featured', authStore.user!.login)
      }
    },
    onSuccess: invalidateAdmin,
  })

  const bulkApproveMutation = useMutation({
    mutationFn: async (items: ApproveInput[]) => {
      for (const item of items) {
        await removeLabelFromIssue(authStore.token!, item.issueNumber, 'flag:review')
        await postModerationComment(authStore.token!, item.issueNumber, 'Approved', authStore.user!.login)
      }
    },
    onSuccess: invalidateAdmin,
  })

  const bulkHideMutation = useMutation({
    mutationFn: async (issueNumbers: number[]) => {
      for (const issueNumber of issueNumbers) {
        await addLabelToIssue(authStore.token!, issueNumber, 'status:hidden')
        await postModerationComment(authStore.token!, issueNumber, 'Hidden', authStore.user!.login)
      }
    },
    onSuccess: invalidateAdmin,
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (nodeIds: string[]) => {
      for (const nodeId of nodeIds) {
        await deleteIssueGraphQL(authStore.token!, nodeId)
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
