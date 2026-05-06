import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useFlagPrompt } from './useFlagPrompt'
import * as mutations from '@/lib/github/mutations'
import type { Prompt } from '@/types/index'

vi.mock('@/lib/github/mutations', () => ({
  postComment: vi.fn(),
  flagPrompt: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  createVersionComment: vi.fn(),
}))

const mockFlagPrompt = vi.mocked(mutations.flagPrompt)

function makePrompt(): Prompt {
  return {
    id: 42,
    nodeId: 'MDU6SXNzdWU0Mg==',
    title: 'Test Prompt',
    body: 'body',
    frontmatter: {
      type: 'prompt',
      category: 'test',
      model: 'gpt-4',
      difficulty: 'beginner',
      tags: [],
      version: 1,
    },
    author: { login: 'alice', avatarUrl: '' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    labels: [],
    reactionGroups: [],
    commentCount: 0,
    comments: [],
  }
}

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const issueId = ref(42)
  queryClient.setQueryData(['prompt', 42], makePrompt())

  let composable: ReturnType<typeof useFlagPrompt> | undefined

  mount(
    {
      setup() {
        // Phase 10: receiveToken removed; composable uses authStore.token (deprecated, Phase 15 cleanup)
        composable = useFlagPrompt(issueId)
        return {}
      },
      template: '<div />',
    },
    {
      global: {
        plugins: [
          [VueQueryPlugin, { queryClient }],
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
          }),
        ],
      },
    },
  )

  return { queryClient, composable: composable!, issueId }
}

describe('useFlagPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('flagPrompt calls label endpoint with flag:review', async () => {
    mockFlagPrompt.mockResolvedValue(undefined)

    const { composable } = setupTest()
    await composable.flagMutation.mutateAsync()

    // token is undefined in Phase 10 (authStore.token removed); Phase 15 will migrate to cookie-based API
    expect(mockFlagPrompt).toHaveBeenCalledWith(undefined, 42)
  })

  it('invalidates query cache on successful flag', async () => {
    mockFlagPrompt.mockResolvedValue(undefined)

    const { queryClient, composable } = setupTest()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await composable.flagMutation.mutateAsync()

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['prompt', 42] }),
    )
  })
})
