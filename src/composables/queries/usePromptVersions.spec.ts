import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { usePromptVersions } from './usePromptVersions'
import * as apiQueries from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  getPromptVersions: vi.fn(),
  getUserProfile: vi.fn(),
  getUserPrompts: vi.fn(),
  getUserActivity: vi.fn(),
}))

const mockGetPromptVersions = vi.mocked(apiQueries.getPromptVersions)

function setupTest(promptId: string | null) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const promptIdRef = ref<string | null>(promptId)
  let composable: ReturnType<typeof usePromptVersions> | undefined

  mount(
    {
      setup() {
        composable = usePromptVersions(promptIdRef)
        return {}
      },
      template: '<div />',
    },
    {
      global: {
        plugins: [[VueQueryPlugin, { queryClient }]],
      },
    },
  )

  return { queryClient, composable: composable!, promptIdRef }
}

describe('usePromptVersions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns versions from API using string prompt ID', async () => {
    const mockVersions = [
      {
        version: 2,
        date: '2026-02-01T00:00:00Z',
        changelog: 'Updated prompt',
        content: 'v2 content',
        commentId: '01CMNT002',
        author: 'alice',
        authorAvatar: '',
      },
      {
        version: 1,
        date: '2026-01-01T00:00:00Z',
        changelog: 'Initial version',
        content: 'v1 content',
        commentId: '01CMNT001',
        author: 'alice',
        authorAvatar: '',
      },
    ]
    mockGetPromptVersions.mockResolvedValue(mockVersions)

    const { composable } = setupTest('01PROMPT001')

    await vi.waitFor(
      () => {
        if (!composable.data.value) throw new Error('Query not resolved yet')
      },
      { timeout: 3000 },
    )

    expect(mockGetPromptVersions).toHaveBeenCalledWith('01PROMPT001')
    expect(composable.data.value).toHaveLength(2)
    expect(composable.data.value![0].version).toBe(2)
    expect(composable.data.value![1].version).toBe(1)
  })

  it('does not fetch when promptId is null', () => {
    const { composable } = setupTest(null)

    expect(mockGetPromptVersions).not.toHaveBeenCalled()
    expect(composable.data.value).toBeUndefined()
  })
})
