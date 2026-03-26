import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAdminLabels, validateLabel } from './useAdminLabels'
import * as mutations from '@/lib/github/mutations'
import * as queries from '@/lib/github/queries'
import * as etag from '@/lib/github/etag'

vi.mock('@/lib/github/mutations', () => ({
  addLabelToIssue: vi.fn().mockResolvedValue(undefined),
  removeLabelFromIssue: vi.fn().mockResolvedValue(undefined),
  deleteIssueGraphQL: vi.fn().mockResolvedValue(undefined),
  postModerationComment: vi.fn().mockResolvedValue(undefined),
  createRepoLabel: vi.fn().mockResolvedValue(undefined),
  updateRepoLabel: vi.fn().mockResolvedValue(undefined),
  deleteRepoLabel: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/github/queries', () => ({
  GET_ADMIN_STATS: '',
  GET_FLAGGED_ISSUES: '',
  getRepoLabels: vi.fn().mockResolvedValue([
    { id: 1, node_id: 'L_1', name: 'category:writing', color: 'abc123', description: 'Writing prompts' },
    { id: 2, node_id: 'L_2', name: 'category:coding', color: 'def456', description: 'Coding prompts' },
    { id: 3, node_id: 'L_3', name: 'status:featured', color: '22c55e', description: 'Featured' },
    { id: 4, node_id: 'L_4', name: 'flag:review', color: 'e11d48', description: 'Flagged for review' },
  ]),
  getIssueComments: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/github/etag', () => ({
  clearEtag: vi.fn(),
  clearUserEtags: vi.fn(),
  getEtag: vi.fn(),
  setEtag: vi.fn(),
  etagFetchWrapper: vi.fn(),
  makeBoundFetch: vi.fn(),
}))

const mockCreateRepoLabel = vi.mocked(mutations.createRepoLabel)
const mockUpdateRepoLabel = vi.mocked(mutations.updateRepoLabel)
const mockDeleteRepoLabel = vi.mocked(mutations.deleteRepoLabel)
const mockClearEtag = vi.mocked(etag.clearEtag)

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminLabels> | undefined

  mount(
    {
      setup() {
        const authStore = useAuthStore()
        authStore.receiveToken('test-token')
        composable = useAdminLabels()
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

describe('useAdminLabels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(queries.getRepoLabels).mockResolvedValue([
      { id: 1, node_id: 'L_1', name: 'category:writing', color: 'abc123', description: 'Writing prompts' },
      { id: 2, node_id: 'L_2', name: 'category:coding', color: 'def456', description: 'Coding prompts' },
      { id: 3, node_id: 'L_3', name: 'status:featured', color: '22c55e', description: 'Featured' },
      { id: 4, node_id: 'L_4', name: 'flag:review', color: 'e11d48', description: 'Flagged for review' },
    ])
  })

  it('fetchLabels returns labels grouped by namespace prefix', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      const groups = composable.groupedLabels.value
      expect(Object.keys(groups)).toContain('category')
      expect(Object.keys(groups)).toContain('status')
      expect(Object.keys(groups)).toContain('flag')
      expect(groups['category'].length).toBe(2)
      expect(groups['category'][0].name).toBe('category:writing')
    })
  })

  it('validateLabel rejects names not matching ^[a-z][a-z0-9-]*:[a-z0-9][a-z0-9-]*$ pattern', () => {
    expect(validateLabel('invalid')).not.toBeNull()
    expect(validateLabel('Invalid:value')).not.toBeNull()
    expect(validateLabel('ns:Value')).not.toBeNull()
    expect(validateLabel('')).not.toBeNull()
    expect(validateLabel('no-colon')).not.toBeNull()
    expect(validateLabel(':value')).not.toBeNull()
    expect(validateLabel('ns:')).not.toBeNull()
  })

  it('validateLabel accepts valid namespace:value labels', () => {
    expect(validateLabel('category:writing')).toBeNull()
    expect(validateLabel('status:featured')).toBeNull()
    expect(validateLabel('flag:review')).toBeNull()
    expect(validateLabel('my-ns:my-value')).toBeNull()
    expect(validateLabel('ns:value123')).toBeNull()
  })

  it('createLabel blocks save and returns inline error if validation fails', async () => {
    const { composable } = setupTest()

    await expect(
      composable.createLabelMutation.mutateAsync({ name: 'invalid', color: 'abc123', description: '' }),
    ).rejects.toThrow()

    expect(mockCreateRepoLabel).not.toHaveBeenCalled()
    expect(composable.labelError.value).not.toBeNull()
  })

  it('updateLabel and deleteLabel call correct REST endpoints', async () => {
    const { composable } = setupTest()

    await composable.updateLabelMutation.mutateAsync({
      oldName: 'category:writing',
      newName: 'category:writing-updated',
      color: 'abc123',
      description: 'Updated',
    })
    expect(mockUpdateRepoLabel).toHaveBeenCalledWith(
      'test-token',
      'category:writing',
      'category:writing-updated',
      'abc123',
      'Updated',
    )

    await composable.deleteLabelMutation.mutateAsync('flag:review')
    expect(mockDeleteRepoLabel).toHaveBeenCalledWith('test-token', 'flag:review')
  })

  it('createLabel onSuccess clears labels ETag', async () => {
    const { composable } = setupTest()

    await composable.createLabelMutation.mutateAsync({
      name: 'category:test',
      color: 'abc123',
      description: 'Test',
    })

    await vi.waitFor(() => {
      expect(mockClearEtag).toHaveBeenCalled()
    })
  })

  it('updateLabel onSuccess clears labels ETag', async () => {
    const { composable } = setupTest()

    await composable.updateLabelMutation.mutateAsync({
      oldName: 'category:writing',
      newName: 'category:writing-updated',
      color: 'abc123',
      description: 'Updated',
    })

    await vi.waitFor(() => {
      expect(mockClearEtag).toHaveBeenCalled()
    })
  })

  it('deleteLabel onSuccess clears labels ETag', async () => {
    const { composable } = setupTest()

    await composable.deleteLabelMutation.mutateAsync('flag:review')

    await vi.waitFor(() => {
      expect(mockClearEtag).toHaveBeenCalled()
    })
  })
})
