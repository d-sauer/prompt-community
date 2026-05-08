import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useComments } from './useComments'
import * as mutations from '@/lib/api/mutations'
import type { Prompt } from '@/types/index'

vi.mock('@/lib/api/mutations', () => ({
  postComment: vi.fn(),
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  flagPrompt: vi.fn(),
}))

// Mock vue-sonner used by the composable
vi.mock('vue-sonner', () => ({ toast: vi.fn() }))
// Mock useOfflineQueue
vi.mock('@/composables/queries/useOfflineQueue', () => ({
  useOfflineQueue: vi.fn(() => ({
    isOnline: ref(true),
    enqueue: vi.fn(),
    getQueue: vi.fn(() => []),
    drainQueue: vi.fn(),
  })),
}))

const mockPostComment = vi.mocked(mutations.postComment)

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
    commentCount: 1,
    comments: [
      {
        id: '01CMNT001',
        body: 'Great prompt!',
        createdAt: '2026-01-02T00:00:00Z',
        author: { login: 'bob', avatarUrl: '' },
      },
    ],
  }
}

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const promptId = ref('01PROMPT001')
  const prompt = makePrompt()
  queryClient.setQueryData(['prompt', '01PROMPT001'], prompt)

  let composable: ReturnType<typeof useComments> | undefined

  mount(
    {
      setup() {
        composable = useComments(promptId)
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

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('postComment calls API endpoint with correct promptId and body', async () => {
    mockPostComment.mockResolvedValue({
      id: '01CMNT002',
      body: 'Hello from test',
      createdAt: '2026-01-02T12:00:00Z',
    })

    const { composable } = setupTest()
    await composable.postCommentMutation.mutateAsync('Hello from test')

    expect(mockPostComment).toHaveBeenCalledWith('01PROMPT001', 'Hello from test')
  })

  it('invalidates query cache on successful postComment', async () => {
    mockPostComment.mockResolvedValue({
      id: '01CMNT002',
      body: 'Hello from test',
      createdAt: '2026-01-02T12:00:00Z',
    })

    const { queryClient, composable } = setupTest()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await composable.postCommentMutation.mutateAsync('Hello from test')

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['prompt', '01PROMPT001'] }),
    )
  })

  it('exposes comments from cache', () => {
    const { composable } = setupTest()

    expect(composable.comments.value).toHaveLength(1)
    expect(composable.comments.value[0].body).toBe('Great prompt!')
  })
})
