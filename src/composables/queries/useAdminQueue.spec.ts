import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminQueue } from './useAdminQueue'

vi.mock('@/lib/api/admin', () => ({
  getAdminQueue: vi.fn().mockResolvedValue({
    data: Array(20).fill({
      id: '01HPROMPT001FLAGGED0001',
      title: 'Suspicious Prompt',
      status: 'flagged',
      author: { login: 'spammer', avatar_url: 'https://avatars.github.com/u/1' },
      created_at: '2026-01-15T10:00:00Z',
    }),
    next_cursor: 'cursor-abc',
  }),
}))

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminQueue> | undefined

  mount(
    {
      setup() {
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

  it('fetches flagged prompts, 20 per page', async () => {
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

  it('each item includes ULID id string for mutations', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.items.value.length).toBeGreaterThan(0)
    })

    const item = composable.items.value[0]
    expect(item.id).toBe('01HPROMPT001FLAGGED0001')
    expect(typeof item.id).toBe('string')
  })
})
