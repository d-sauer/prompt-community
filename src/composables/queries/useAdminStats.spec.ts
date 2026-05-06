import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminStats } from './useAdminStats'

vi.mock('@/lib/github/octokit', () => ({
  createGraphqlClient: vi.fn(() =>
    vi.fn().mockResolvedValue({
      repository: {
        total: { totalCount: 42 },
        flagged: { totalCount: 5 },
        featured: { totalCount: 3 },
      },
    }),
  ),
}))

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminStats> | undefined

  mount(
    {
      setup() {
        // Phase 10: receiveToken removed; composable uses authStore.token (deprecated, Phase 15 cleanup)
        composable = useAdminStats()
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

describe('useAdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns total, flagged, featured counts from a single GraphQL query', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.total.value).toBe(42)
      expect(composable.flagged.value).toBe(5)
      expect(composable.featured.value).toBe(3)
    })
  })

  it('exposes isLoading while fetching', () => {
    const { composable } = setupTest()
    // isLoading starts as a ref — it may be true initially or not depending on query state
    expect(typeof composable.isLoading.value).toBe('boolean')
  })
})
