import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useComments } from './useComments'
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

const mockPostComment = vi.mocked(mutations.postComment)

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
    commentCount: 1,
    comments: [
      {
        id: 'comment-1',
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
  const issueId = ref(42)
  const prompt = makePrompt()
  queryClient.setQueryData(['prompt', 42], prompt)

  let composable: ReturnType<typeof useComments> | undefined

  mount(
    {
      setup() {
        // Phase 10: receiveToken removed; composable uses authStore.token (deprecated, Phase 15 cleanup)
        composable = useComments(issueId)
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

describe('useComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('postComment calls REST endpoint with correct issueNumber and body', async () => {
    mockPostComment.mockResolvedValue({
      id: 999,
      body: 'Hello from test',
      createdAt: '2026-01-02T12:00:00Z',
    })

    const { composable } = setupTest()
    await composable.postCommentMutation.mutateAsync('Hello from test')

    // token is undefined in Phase 10 (authStore.token removed); Phase 15 will migrate to cookie-based API
    expect(mockPostComment).toHaveBeenCalledWith(undefined, 42, 'Hello from test')
  })

  it('invalidates query cache on successful postComment', async () => {
    mockPostComment.mockResolvedValue({
      id: 999,
      body: 'Hello from test',
      createdAt: '2026-01-02T12:00:00Z',
    })

    const { queryClient, composable } = setupTest()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await composable.postCommentMutation.mutateAsync('Hello from test')

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['prompt', 42] }),
    )
  })

  it('exposes comments from cache', () => {
    const { composable } = setupTest()

    expect(composable.comments.value).toHaveLength(1)
    expect(composable.comments.value[0].body).toBe('Great prompt!')
  })
})
