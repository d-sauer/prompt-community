import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAdminActions } from './useAdminActions'
import * as mutations from '@/lib/github/mutations'

vi.mock('@/lib/github/mutations', () => ({
  addLabelToIssue: vi.fn().mockResolvedValue(undefined),
  removeLabelFromIssue: vi.fn().mockResolvedValue(undefined),
  deleteIssueGraphQL: vi.fn().mockResolvedValue(undefined),
  postModerationComment: vi.fn().mockResolvedValue(undefined),
  createRepoLabel: vi.fn().mockResolvedValue(undefined),
  updateRepoLabel: vi.fn().mockResolvedValue(undefined),
  deleteRepoLabel: vi.fn().mockResolvedValue(undefined),
}))

const mockRemoveLabelFromIssue = vi.mocked(mutations.removeLabelFromIssue)
const mockAddLabelToIssue = vi.mocked(mutations.addLabelToIssue)
const mockDeleteIssueGraphQL = vi.mocked(mutations.deleteIssueGraphQL)
const mockPostModerationComment = vi.mocked(mutations.postModerationComment)

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminActions> | undefined

  mount(
    {
      setup() {
        const authStore = useAuthStore()
        authStore.receiveToken('test-token')
        authStore.$patch({ user: { login: 'maintainer', avatarUrl: '' } })
        composable = useAdminActions()
        return {}
      },
      template: '<div />',
    },
    {
      global: {
        plugins: [
          [VueQueryPlugin, { queryClient }],
          createTestingPinia({ createSpy: vi.fn, stubActions: false }),
        ],
      },
    },
  )

  return { queryClient, composable: composable! }
}

describe('useAdminActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('approve: calls removeLabelFromIssue(flag:review) then postModerationComment(Approved)', async () => {
    const { composable } = setupTest()

    await composable.approveMutation.mutateAsync({ issueNumber: 42, nodeId: 'I_kwDO123' })

    expect(mockRemoveLabelFromIssue).toHaveBeenCalledWith('test-token', 42, 'flag:review')
    expect(mockPostModerationComment).toHaveBeenCalledWith('test-token', 42, 'Approved', 'maintainer')
  })

  it('hide: calls addLabelToIssue(status:hidden) then postModerationComment(Hidden)', async () => {
    const { composable } = setupTest()

    await composable.hideMutation.mutateAsync({ issueNumber: 42 })

    expect(mockAddLabelToIssue).toHaveBeenCalledWith('test-token', 42, 'status:hidden')
    expect(mockPostModerationComment).toHaveBeenCalledWith('test-token', 42, 'Hidden', 'maintainer')
  })

  it('delete: calls deleteIssueGraphQL with nodeId (not issue number)', async () => {
    const { composable } = setupTest()

    await composable.deleteMutation.mutateAsync('I_kwDOAbc123')

    expect(mockDeleteIssueGraphQL).toHaveBeenCalledWith('test-token', 'I_kwDOAbc123')
    // Must NOT be called with a number
    expect(mockDeleteIssueGraphQL).not.toHaveBeenCalledWith('test-token', 42)
  })

  it('feature: calls addLabelToIssue(status:featured); unfeature removes it', async () => {
    const { composable } = setupTest()

    // Feature an issue that doesn't have status:featured
    await composable.featureMutation.mutateAsync({
      issueNumber: 42,
      currentLabels: [{ name: 'flag:review' }],
    })
    expect(mockAddLabelToIssue).toHaveBeenCalledWith('test-token', 42, 'status:featured')

    vi.clearAllMocks()

    // Unfeature an issue that already has status:featured
    await composable.featureMutation.mutateAsync({
      issueNumber: 42,
      currentLabels: [{ name: 'status:featured' }],
    })
    expect(mockRemoveLabelFromIssue).toHaveBeenCalledWith('test-token', 42, 'status:featured')
  })

  it('bulk approve: iterates over all selected issue numbers sequentially', async () => {
    const { composable } = setupTest()

    await composable.bulkApproveMutation.mutateAsync([
      { issueNumber: 1, nodeId: 'I_1' },
      { issueNumber: 2, nodeId: 'I_2' },
      { issueNumber: 3, nodeId: 'I_3' },
    ])

    expect(mockRemoveLabelFromIssue).toHaveBeenCalledTimes(3)
    expect(mockPostModerationComment).toHaveBeenCalledTimes(3)
    expect(mockRemoveLabelFromIssue).toHaveBeenNthCalledWith(1, 'test-token', 1, 'flag:review')
    expect(mockRemoveLabelFromIssue).toHaveBeenNthCalledWith(2, 'test-token', 2, 'flag:review')
    expect(mockRemoveLabelFromIssue).toHaveBeenNthCalledWith(3, 'test-token', 3, 'flag:review')
  })

  it('bulk delete: accepts array of nodeIds and deletes each', async () => {
    const { composable } = setupTest()

    await composable.bulkDeleteMutation.mutateAsync(['I_kwDO1', 'I_kwDO2'])

    expect(mockDeleteIssueGraphQL).toHaveBeenCalledTimes(2)
    expect(mockDeleteIssueGraphQL).toHaveBeenNthCalledWith(1, 'test-token', 'I_kwDO1')
    expect(mockDeleteIssueGraphQL).toHaveBeenNthCalledWith(2, 'test-token', 'I_kwDO2')
  })

  it('each action invalidates admin queue query cache on success', async () => {
    const { queryClient, composable } = setupTest()

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await composable.approveMutation.mutateAsync({ issueNumber: 42, nodeId: 'I_kwDO123' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'queue'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'stats'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'log'] })
  })
})
