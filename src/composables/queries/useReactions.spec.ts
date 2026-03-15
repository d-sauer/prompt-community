import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/stores/useAuthStore'
import { useReactions } from './useReactions'
import * as mutations from '@/lib/github/mutations'
import type { Prompt, ReactionGroup } from '@/types/index'

vi.mock('@/lib/github/mutations', () => ({
  addReaction: vi.fn(),
  removeReaction: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn(),
  createVersionComment: vi.fn(),
}))

const mockAddReaction = vi.mocked(mutations.addReaction)
const mockRemoveReaction = vi.mocked(mutations.removeReaction)

function makeReactionGroups(viewerHasReacted: boolean, totalCount = 5): ReactionGroup[] {
  return [
    { content: 'THUMBS_UP', reactors: { totalCount }, viewerHasReacted },
    { content: 'HEART', reactors: { totalCount: 2 }, viewerHasReacted: false },
    { content: 'ROCKET', reactors: { totalCount: 1 }, viewerHasReacted: false },
  ]
}

function makePrompt(viewerHasReacted: boolean): Prompt {
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
    reactionGroups: makeReactionGroups(viewerHasReacted),
    commentCount: 0,
  }
}

function setupTestWithPrompt(viewerHasReacted: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const issueId = ref(42)
  const nodeId = ref('MDU6SXNzdWU0Mg==')
  const prompt = makePrompt(viewerHasReacted)
  queryClient.setQueryData(['prompt', 42], prompt)

  let composable: ReturnType<typeof useReactions> | undefined

  mount(
    {
      setup() {
        const authStore = useAuthStore()
        authStore.receiveToken('test-token')
        composable = useReactions(issueId, nodeId)
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

  return { queryClient, composable: composable!, issueId, nodeId }
}

describe('useReactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('addReaction fires when viewerHasReacted is false', async () => {
    const updatedGroups = makeReactionGroups(true, 6)
    mockAddReaction.mockResolvedValue(updatedGroups)

    const { composable } = setupTestWithPrompt(false)
    // Use toggle() which reads current state before onMutate
    await composable.toggle('THUMBS_UP')

    expect(mockAddReaction).toHaveBeenCalledWith('test-token', 'MDU6SXNzdWU0Mg==', 'THUMBS_UP')
    expect(mockRemoveReaction).not.toHaveBeenCalled()
  })

  it('removeReaction fires when viewerHasReacted is true', async () => {
    const updatedGroups = makeReactionGroups(false, 4)
    mockRemoveReaction.mockResolvedValue(updatedGroups)

    const { composable } = setupTestWithPrompt(true)
    await composable.toggle('THUMBS_UP')

    expect(mockRemoveReaction).toHaveBeenCalledWith('test-token', 'MDU6SXNzdWU0Mg==', 'THUMBS_UP')
    expect(mockAddReaction).not.toHaveBeenCalled()
  })

  it('onMutate increments totalCount optimistically when adding', async () => {
    mockAddReaction.mockResolvedValue(makeReactionGroups(true, 6))

    const { queryClient, composable } = setupTestWithPrompt(false)
    const mutatePromise = composable.toggle('THUMBS_UP')

    // After onMutate runs, the optimistic update should be applied
    await vi.waitFor(() => {
      const cached = queryClient.getQueryData<Prompt>(['prompt', 42])
      const group = cached?.reactionGroups.find((g) => g.content === 'THUMBS_UP')
      return group?.reactors.totalCount === 6
    })

    await mutatePromise
  })

  it('onMutate decrements totalCount optimistically when removing', async () => {
    mockRemoveReaction.mockResolvedValue(makeReactionGroups(false, 4))

    const { queryClient, composable } = setupTestWithPrompt(true)
    const mutatePromise = composable.toggle('THUMBS_UP')

    // After onMutate runs, the optimistic update should decrement
    await vi.waitFor(() => {
      const cached = queryClient.getQueryData<Prompt>(['prompt', 42])
      const group = cached?.reactionGroups.find((g) => g.content === 'THUMBS_UP')
      return group?.reactors.totalCount === 4
    })

    await mutatePromise
  })

  it('onError restores previous state on failure', async () => {
    mockAddReaction.mockRejectedValue(new Error('API error'))

    const { queryClient, composable } = setupTestWithPrompt(false)
    const originalCount = (queryClient.getQueryData<Prompt>(['prompt', 42]) as Prompt)
      .reactionGroups.find((g) => g.content === 'THUMBS_UP')!.reactors.totalCount

    try {
      await composable.toggle('THUMBS_UP')
    } catch {
      // expected error
    }

    await vi.waitFor(() => {
      const cached = queryClient.getQueryData<Prompt>(['prompt', 42])
      const group = cached?.reactionGroups.find((g) => g.content === 'THUMBS_UP')
      return group?.reactors.totalCount === originalCount
    })
  })
})
