import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUserProfile } from './useUserProfile'

// Mock createGraphqlClient before importing useUserProfile
const mockGraphqlClient = vi.fn()

vi.mock('@/lib/github/octokit', () => ({
  createGraphqlClient: vi.fn(() => mockGraphqlClient),
}))

const fixtureData = {
  search: {
    issueCount: 3,
    nodes: [
      {
        number: 1,
        title: 'Prompt 1',
        createdAt: '2026-01-01T00:00:00Z',
        reactionGroups: [
          { content: 'THUMBS_UP', reactors: { totalCount: 10 } },
          { content: 'HEART', reactors: { totalCount: 5 } },
        ],
        comments: { totalCount: 2 },
        labels: { nodes: [] },
      },
      {
        number: 2,
        title: 'Prompt 2',
        createdAt: '2026-01-02T00:00:00Z',
        reactionGroups: [
          { content: 'THUMBS_UP', reactors: { totalCount: 3 } },
          { content: 'ROCKET', reactors: { totalCount: 7 } },
        ],
        comments: { totalCount: 0 },
        labels: { nodes: [] },
      },
    ],
  },
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
        const authStore = useAuthStore()
        authStore.receiveToken('test-token')
        composable = useUserProfile(loginRef)
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

  return { queryClient, composable: composable!, loginRef }
}

describe('useUserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGraphqlClient.mockResolvedValue(fixtureData)
  })

  it('totalVotes aggregates reactors.totalCount across all reactionGroups on all submissions', async () => {
    const { queryClient } = setupTest('alice')
    // Wait for query to settle in QueryClient cache
    await vi.waitFor(
      () => {
        const data = queryClient.getQueryData<typeof fixtureData>(['user-profile', 'alice'])
        if (!data) throw new Error('Query not resolved yet')
        return data
      },
      { timeout: 3000 },
    )
    const data = queryClient.getQueryData<typeof fixtureData>(['user-profile', 'alice'])!
    const votes = data.search.nodes
      .flatMap((p) => p.reactionGroups)
      .reduce((sum, g) => sum + g.reactors.totalCount, 0)
    // 10 + 5 + 3 + 7 = 25
    expect(votes).toBe(25)
  })

  it('totalSubmissions returns issueCount', async () => {
    const { queryClient } = setupTest('bob')
    // Wait for query to settle in QueryClient cache
    await vi.waitFor(
      () => {
        const data = queryClient.getQueryData<typeof fixtureData>(['user-profile', 'bob'])
        if (!data) throw new Error('Query not resolved yet')
        return data
      },
      { timeout: 3000 },
    )
    const data = queryClient.getQueryData<typeof fixtureData>(['user-profile', 'bob'])!
    expect(data.search.issueCount).toBe(3)
  })
})
