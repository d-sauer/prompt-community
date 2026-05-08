import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { useUserProfile } from './useUserProfile'
import * as apiQueries from '@/lib/api/queries'
import type { Prompt } from '@/types/index'

vi.mock('@/lib/api/queries', () => ({
  getUserProfile: vi.fn(),
  getUserPrompts: vi.fn(),
}))

const mockGetUserProfile = vi.mocked(apiQueries.getUserProfile)
const mockGetUserPrompts = vi.mocked(apiQueries.getUserPrompts)

function makePrompt(id: string, title: string, reactions: number[]): Prompt {
  return {
    id,
    title,
    body: '',
    frontmatter: {
      type: 'prompt',
      category: '',
      model: '',
      difficulty: 'beginner',
      tags: [],
      version: 1,
    },
    author: { login: 'alice', avatarUrl: '' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    labels: [],
    reactionGroups: reactions.map((count, i) => ({
      content: ['THUMBS_UP', 'HEART', 'ROCKET'][i] ?? 'THUMBS_UP',
      reactors: { totalCount: count },
      viewerHasReacted: false,
    })),
    commentCount: 0,
    comments: [],
  }
}

function setupTest(login: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const loginRef = ref(login)
  let composable: ReturnType<typeof useUserProfile> | undefined

  mount(
    {
      setup() {
        composable = useUserProfile(loginRef)
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

  return { queryClient, composable: composable!, loginRef }
}

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUserProfile.mockResolvedValue({
      login: 'alice',
      name: 'Alice',
      avatar_url: '',
      role: 'user',
    })
    mockGetUserPrompts.mockResolvedValue({ data: [], next_cursor: null })
  })

  it('totalVotes aggregates reactors.totalCount across all reactionGroups on all submissions', async () => {
    const prompt1 = makePrompt('01PROMPT001', 'Prompt 1', [10, 5])
    const prompt2 = makePrompt('01PROMPT002', 'Prompt 2', [3, 7])

    mockGetUserPrompts.mockResolvedValue({
      data: [prompt1, prompt2],
      next_cursor: null,
    })

    const { composable } = setupTest('alice')

    await vi.waitFor(
      () => {
        if (!composable.data.value) throw new Error('Query not resolved yet')
      },
      { timeout: 3000 },
    )

    // 10 + 5 + 3 + 7 = 25
    expect(composable.totalVotes.value).toBe(25)
  })

  it('totalSubmissions returns count of prompts returned', async () => {
    const prompt1 = makePrompt('01PROMPT001', 'Prompt 1', [])
    const prompt2 = makePrompt('01PROMPT002', 'Prompt 2', [])
    const prompt3 = makePrompt('01PROMPT003', 'Prompt 3', [])

    mockGetUserPrompts.mockResolvedValue({
      data: [prompt1, prompt2, prompt3],
      next_cursor: null,
    })

    const { composable } = setupTest('bob')

    await vi.waitFor(
      () => {
        if (!composable.data.value) throw new Error('Query not resolved yet')
      },
      { timeout: 3000 },
    )

    expect(composable.totalSubmissions.value).toBe(3)
  })
})
