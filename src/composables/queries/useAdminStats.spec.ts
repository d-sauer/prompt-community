import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminStats } from './useAdminStats'

vi.mock('@/lib/api/admin', () => ({
  getAdminStats: vi.fn().mockResolvedValue({ total: 42, flagged: 3 }),
}))

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminStats> | undefined

  mount(
    {
      setup() {
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

  it('returns total and flagged counts from getAdminStats', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.total.value).toBe(42)
      expect(composable.flagged.value).toBe(3)
    })
  })

  it('exposes isLoading while fetching', () => {
    const { composable } = setupTest()
    expect(typeof composable.isLoading.value).toBe('boolean')
  })

  it('has no "featured" field — removed in v2 (no featured status in D1 enum)', () => {
    const { composable } = setupTest()
    // @ts-expect-error — featured was removed in v2
    expect(composable.featured).toBeUndefined()
  })
})
