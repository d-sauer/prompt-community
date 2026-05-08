import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminActions } from './useAdminActions'

vi.mock('@/lib/api/admin', () => ({
  approvePrompt: vi.fn().mockResolvedValue({ success: true }),
  hidePrompt: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/api/mutations', () => ({
  deletePrompt: vi.fn().mockResolvedValue({}),
}))

import * as adminApi from '@/lib/api/admin'
import * as mutations from '@/lib/api/mutations'

const mockApprovePrompt = vi.mocked(adminApi.approvePrompt)
const mockHidePrompt = vi.mocked(adminApi.hidePrompt)
const mockDeletePrompt = vi.mocked(mutations.deletePrompt)

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminActions> | undefined

  mount(
    {
      setup() {
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

  it('approve: calls approvePrompt with id and optional reason', async () => {
    const { composable } = setupTest()

    await composable.approveMutation.mutateAsync({ id: '01HPROMPT001', reason: 'Looks good' })

    expect(mockApprovePrompt).toHaveBeenCalledWith('01HPROMPT001', 'Looks good')
  })

  it('hide: calls hidePrompt with id and optional reason', async () => {
    const { composable } = setupTest()

    await composable.hideMutation.mutateAsync({ id: '01HPROMPT001', reason: 'Spam' })

    expect(mockHidePrompt).toHaveBeenCalledWith('01HPROMPT001', 'Spam')
  })

  it('delete: calls deletePrompt with id string', async () => {
    const { composable } = setupTest()

    await composable.deleteMutation.mutateAsync('01HPROMPT001')

    expect(mockDeletePrompt).toHaveBeenCalledWith('01HPROMPT001')
  })

  it('feature: throws "feature action not available in v2" (stub)', async () => {
    const { composable } = setupTest()

    await expect(composable.featureMutation.mutateAsync()).rejects.toThrow(
      'feature action not available in v2',
    )
  })

  it('bulk approve: iterates over all selected ids sequentially', async () => {
    const { composable } = setupTest()

    await composable.bulkApproveMutation.mutateAsync([
      { id: '01HPROMPT001' },
      { id: '01HPROMPT002' },
      { id: '01HPROMPT003' },
    ])

    expect(mockApprovePrompt).toHaveBeenCalledTimes(3)
    expect(mockApprovePrompt).toHaveBeenNthCalledWith(1, '01HPROMPT001', undefined)
    expect(mockApprovePrompt).toHaveBeenNthCalledWith(2, '01HPROMPT002', undefined)
    expect(mockApprovePrompt).toHaveBeenNthCalledWith(3, '01HPROMPT003', undefined)
  })

  it('bulk delete: accepts array of ids and deletes each', async () => {
    const { composable } = setupTest()

    await composable.bulkDeleteMutation.mutateAsync(['01HPROMPT001', '01HPROMPT002'])

    expect(mockDeletePrompt).toHaveBeenCalledTimes(2)
    expect(mockDeletePrompt).toHaveBeenNthCalledWith(1, '01HPROMPT001')
    expect(mockDeletePrompt).toHaveBeenNthCalledWith(2, '01HPROMPT002')
  })

  it('each action invalidates admin queue query cache on success', async () => {
    const { queryClient, composable } = setupTest()

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await composable.approveMutation.mutateAsync({ id: '01HPROMPT001' })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'queue'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'stats'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin', 'log'] })
  })
})
