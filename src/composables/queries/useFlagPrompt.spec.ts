import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useFlagPrompt } from './useFlagPrompt'
import * as mutations from '@/lib/api/mutations'
import type { Prompt } from '@/types/index'

vi.mock('@/lib/api/mutations', () => ({
  postComment: vi.fn(),
  flagPrompt: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
}))

const mockFlagPrompt = vi.mocked(mutations.flagPrompt)

function makePrompt(): Prompt {
  return {
    id: '01PROMPT001',
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
  const promptId = ref('01PROMPT001')
  queryClient.setQueryData(['prompt', '01PROMPT001'], makePrompt())

  let composable: ReturnType<typeof useFlagPrompt> | undefined

  mount(
    {
      setup() {
        composable = useFlagPrompt(promptId)
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

  return { queryClient, composable: composable!, promptId }
}

describe('useFlagPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('flagPrompt calls flag endpoint with prompt id', async () => {
    // flagPrompt is a no-op stub that always rejects (Phase 14 scope)
    // We mock it to resolve for this test
    mockFlagPrompt.mockResolvedValue(undefined as never)

    const { composable } = setupTest()
    await composable.flagMutation.mutateAsync()

    expect(mockFlagPrompt).toHaveBeenCalledWith('01PROMPT001')
  })

  it('invalidates query cache on successful flag', async () => {
    mockFlagPrompt.mockResolvedValue(undefined as never)

    const { queryClient, composable } = setupTest()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await composable.flagMutation.mutateAsync()

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['prompt', '01PROMPT001'] }),
    )
  })
})
