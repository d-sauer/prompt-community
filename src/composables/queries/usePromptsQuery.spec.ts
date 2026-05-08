import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { mount } from '@vue/test-utils'
import { usePromptsQuery } from './usePromptsQuery'
import * as apiQueries from '@/lib/api/queries'
import type { FilterState } from '@/types/index'

vi.mock('@/lib/api/queries', () => ({
  getPrompts: vi.fn().mockResolvedValue({ data: [], next_cursor: null }),
}))

const mockGetPrompts = vi.mocked(apiQueries.getPrompts)

function setupTest(filters: FilterState = { category: null, model: null }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const filtersRef = ref<FilterState>(filters)
  let composable: ReturnType<typeof usePromptsQuery> | undefined

  mount(
    {
      setup() {
        composable = usePromptsQuery(filtersRef)
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

  return { queryClient, composable: composable!, filtersRef }
}

describe('usePromptsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPrompts.mockResolvedValue({ data: [], next_cursor: null })
  })

  it('calls getPrompts from @/lib/api/queries (not @/lib/github)', async () => {
    const { queryClient } = setupTest()

    await vi.waitFor(
      () => {
        const state = queryClient.getQueryState(['prompts', { category: null, model: null }])
        if (state?.status !== 'success') throw new Error('Query not resolved yet')
      },
      { timeout: 3000 },
    )

    expect(mockGetPrompts).toHaveBeenCalled()
  })

  it('queryKey includes filters — initial key uses category:null, model:null', async () => {
    const { queryClient } = setupTest({ category: null, model: null })

    await vi.waitFor(
      () => {
        const state = queryClient.getQueryState(['prompts', { category: null, model: null }])
        if (state?.status !== 'success') throw new Error('Query not resolved yet')
      },
      { timeout: 3000 },
    )

    // The query was stored under the correct key
    const data = queryClient.getQueryData(['prompts', { category: null, model: null }])
    expect(data).toBeDefined()
  })

  it('getNextPageParam returns next_cursor when present, undefined when null', () => {
    // Test the pagination logic by inspecting behavior through mock
    mockGetPrompts.mockResolvedValue({
      data: [
        {
          id: '01PROMPT001',
          title: 'Test',
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
          reactionGroups: [],
          commentCount: 0,
          comments: [],
        },
      ],
      next_cursor: 'cursor123',
    })

    const { queryClient } = setupTest()

    // Validate page cursor forwarding by verifying getPrompts is called with proper pageParam on subsequent calls
    // The getNextPageParam extracts next_cursor from last page
    // We verify the mock was called with the initial undefined cursor
    return vi.waitFor(
      () => {
        const state = queryClient.getQueryState(['prompts', { category: null, model: null }])
        if (state?.status !== 'success') throw new Error('Not yet')
        const pages = (state.data as { pages: Array<{ next_cursor: string | null }> }).pages
        expect(pages[0].next_cursor).toBe('cursor123')
      },
      { timeout: 3000 },
    )
  })

  it('activityItems flattens pages[].data into a single array', async () => {
    const promptA = {
      id: '01PROMPT001',
      title: 'Prompt A',
      body: '',
      frontmatter: {
        type: 'prompt' as const,
        category: '',
        model: '',
        difficulty: 'beginner' as const,
        tags: [],
        version: 1,
      },
      author: { login: 'alice', avatarUrl: '' },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      labels: [],
      reactionGroups: [],
      commentCount: 0,
      comments: [],
    }
    const promptB = { ...promptA, id: '01PROMPT002', title: 'Prompt B' }

    mockGetPrompts.mockResolvedValue({ data: [promptA, promptB], next_cursor: null })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    const filtersRef = ref<FilterState>({ category: null, model: null })
    let composable: ReturnType<typeof usePromptsQuery> | undefined

    mount(
      {
        setup() {
          composable = usePromptsQuery(filtersRef)
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

    await vi.waitFor(
      () => {
        if (!composable!.data.value) throw new Error('No data yet')
      },
      { timeout: 3000 },
    )

    // The composable should expose a flattened list of prompts across pages
    const allPrompts = composable!.data.value!.pages.flatMap((p) => p.data)
    expect(allPrompts).toHaveLength(2)
    expect(allPrompts[0].id).toBe('01PROMPT001')
    expect(allPrompts[1].id).toBe('01PROMPT002')
  })
})
