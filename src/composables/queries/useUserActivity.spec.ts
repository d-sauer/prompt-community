import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useUserActivity } from './useUserActivity'
import * as apiQueries from '@/lib/api/queries'
import type { ActivityItem } from '@/lib/api/queries'

vi.mock('@/lib/api/queries', () => ({
  getUserActivity: vi.fn(),
}))

const mockGetUserActivity = vi.mocked(apiQueries.getUserActivity)

function makeActivityItem(id: string, title: string): ActivityItem {
  return {
    type: 'prompt_created',
    prompt: { id, title, created_at: '2026-01-01T00:00:00Z' },
  }
}

function setupTest(login: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const loginRef = ref(login)
  let composable: ReturnType<typeof useUserActivity> | undefined

  mount(
    {
      setup() {
        composable = useUserActivity(loginRef)
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

describe('useUserActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    mockGetUserActivity.mockResolvedValue({ data: [], next_cursor: null })
  })

  it('calls getUserActivity with the login and no cursor on first load', async () => {
    const { queryClient } = setupTest('alice')

    await vi.waitFor(
      () => {
        const state = queryClient.getQueryState(['user-activity', 'alice'])
        if (state?.status !== 'success') throw new Error('Query not resolved yet')
      },
      { timeout: 3000 },
    )

    expect(mockGetUserActivity).toHaveBeenCalledWith('alice', undefined)
  })

  it('fetches next page with cursor from next_cursor on fetchNextPage call', async () => {
    mockGetUserActivity
      .mockResolvedValueOnce({
        data: [makeActivityItem('01PROMPT001', 'First Prompt')],
        next_cursor: 'cursor_abc',
      })
      .mockResolvedValueOnce({
        data: [makeActivityItem('01PROMPT002', 'Second Prompt')],
        next_cursor: null,
      })

    const { composable, queryClient } = setupTest('bob')

    await vi.waitFor(
      () => {
        const state = queryClient.getQueryState(['user-activity', 'bob'])
        if (state?.status !== 'success') throw new Error('First page not loaded')
      },
      { timeout: 3000 },
    )

    await composable.fetchNextPage()

    await vi.waitFor(
      () => {
        expect(mockGetUserActivity).toHaveBeenCalledWith('bob', 'cursor_abc')
      },
      { timeout: 3000 },
    )
  })

  it('is disabled when login is empty string', async () => {
    setupTest('')

    // Wait a moment to ensure query does NOT fire
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(mockGetUserActivity).not.toHaveBeenCalled()
  })

  it('activityItems flattens pages into a single array of ActivityItem', async () => {
    const item1 = makeActivityItem('01PROMPT001', 'Prompt A')
    const item2 = makeActivityItem('01PROMPT002', 'Prompt B')

    mockGetUserActivity.mockResolvedValue({
      data: [item1, item2],
      next_cursor: null,
    })

    const { composable } = setupTest('carol')

    await vi.waitFor(
      () => {
        if (composable.activityItems.value.length === 0) throw new Error('No items yet')
      },
      { timeout: 3000 },
    )

    expect(composable.activityItems.value).toHaveLength(2)
    expect(composable.activityItems.value[0].prompt.id).toBe('01PROMPT001')
    expect(composable.activityItems.value[1].prompt.id).toBe('01PROMPT002')
  })
})
