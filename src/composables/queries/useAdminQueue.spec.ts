import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminQueue } from './useAdminQueue'

const mockFlaggedNode = {
  id: 'I_kwDOAbc123',
  number: 7,
  title: 'Suspicious Prompt',
  createdAt: '2026-01-15T10:00:00Z',
  author: { login: 'spammer', avatarUrl: 'https://avatars.github.com/u/1' },
  labels: { nodes: [{ name: 'flag:review', color: 'e11d48' }] },
}

vi.mock('@/lib/github/octokit', () => ({
  createGraphqlClient: vi.fn(() =>
    vi.fn().mockResolvedValue({
      repository: {
        issues: {
          pageInfo: { hasNextPage: true, endCursor: 'cursor-abc' },
          nodes: Array(20).fill(mockFlaggedNode),
        },
      },
    }),
  ),
}))

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminQueue> | undefined

  mount(
    {
      setup() {
        // Phase 10: receiveToken removed; composable uses authStore.token (deprecated, Phase 15 cleanup)
        composable = useAdminQueue()
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

describe('useAdminQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches issues with flag:review label, 20 per page', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.items.value.length).toBe(20)
      expect(composable.items.value[0].title).toBe('Suspicious Prompt')
    })
  })

  it('exposes pagination state (hasNextPage, fetchNextPage)', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.items.value.length).toBeGreaterThan(0)
    })

    expect(composable.hasNextPage.value).toBe(true)
    expect(typeof composable.fetchNextPage).toBe('function')
  })

  it('each item includes GraphQL node id for delete mutation', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.items.value.length).toBeGreaterThan(0)
    })

    const item = composable.items.value[0]
    expect(item.id).toBe('I_kwDOAbc123')
    expect(typeof item.id).toBe('string')
    // id must be a string (GraphQL base64 node ID), not a number
    expect(item.id).not.toBe(item.number)
  })
})
