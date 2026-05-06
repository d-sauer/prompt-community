import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAuthStore } from '@/stores/useAuthStore'
import { useAdminLog } from './useAdminLog'
import * as queries from '@/lib/github/queries'

// Phase 10: useAdminLog uses authStore.token (deprecated GitHub API pattern).
// token is now undefined (removed from store in Phase 10). Phase 15 will rewrite
// these composables to use the cookie-based backend API.

vi.mock('@/lib/github/octokit', () => ({
  createGraphqlClient: vi.fn(() =>
    vi.fn().mockResolvedValue({
      repository: {
        issues: {
          pageInfo: { hasNextPage: false, endCursor: null },
          nodes: [
            { number: 10, title: 'Great Prompt' },
            { number: 11, title: 'Another Prompt' },
          ],
        },
      },
    }),
  ),
}))

vi.mock('@/lib/github/queries', () => ({
  GET_FLAGGED_ISSUES: '',
  GET_ADMIN_STATS: '',
  getRepoLabels: vi.fn().mockResolvedValue([]),
  getIssueComments: vi.fn((_token: string, issueNumber: number) => {
    if (issueNumber === 10) {
      return Promise.resolve([
        {
          id: 1,
          body: '✓ Approved by @maintainer on 2026-01-15',
          created_at: '2026-01-15T10:00:00Z',
          user: { login: 'maintainer' },
        },
        {
          id: 2,
          body: '## Version 2 — 2026-01-10\nchangelog\n\nbody',
          created_at: '2026-01-10T10:00:00Z',
          user: { login: 'author' },
        },
        {
          id: 3,
          body: '✓ Featured by @admin on 2026-01-16',
          created_at: '2026-01-16T12:00:00Z',
          user: { login: 'admin' },
        },
      ])
    }
    if (issueNumber === 11) {
      return Promise.resolve([
        {
          id: 4,
          body: '✓ Hidden by @moderator on 2026-01-12',
          created_at: '2026-01-12T09:00:00Z',
          user: { login: 'moderator' },
        },
        {
          id: 5,
          body: 'Just a regular comment',
          created_at: '2026-01-11T08:00:00Z',
          user: { login: 'user' },
        },
      ])
    }
    return Promise.resolve([])
  }),
}))

function setupTest() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  let composable: ReturnType<typeof useAdminLog> | undefined

  mount(
    {
      setup() {
        // Phase 10: receiveToken removed; composable uses authStore.token (deprecated, Phase 15 cleanup)
        composable = useAdminLog()
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

describe('useAdminLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters issue comments to only those matching /^✓ (Approved|Hidden|Deleted|Featured|Unfeatured) by @/', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      // Should have 3 moderation entries: Approved, Featured, Hidden
      // NOT the version comment or regular comment
      expect(composable.entries.value.length).toBe(3)
    })

    const actions = composable.entries.value.map((e) => e.action)
    expect(actions).toContain('Approved')
    expect(actions).toContain('Featured')
    expect(actions).toContain('Hidden')
  })

  it('excludes version comments starting with "## Version"', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.entries.value.length).toBeGreaterThan(0)
    })

    // Verify the comment with body "## Version..." is excluded
    const allEntries = composable.entries.value
    expect(allEntries.every((e) => !e.action.includes('##'))).toBe(true)
  })

  it('date range filter: fromDate and toDate props narrow returned entries', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.entries.value.length).toBe(3)
    })

    // Apply a date filter that narrows to only January 15-16
    composable.dateFrom.value = '2026-01-15'
    composable.dateTo.value = '2026-01-16'

    await vi.waitFor(() => {
      // Should only have entries on 2026-01-15 and 2026-01-16
      expect(composable.entries.value.length).toBe(2)
    })

    // Reset
    composable.dateFrom.value = ''
    composable.dateTo.value = ''
  })

  it('each log entry exposes: timestamp, action, promptTitle, maintainerLogin', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.entries.value.length).toBeGreaterThan(0)
    })

    const entry = composable.entries.value.find((e) => e.action === 'Approved')!
    expect(entry.timestamp).toBe('2026-01-15T10:00:00Z')
    expect(entry.action).toBe('Approved')
    expect(entry.promptTitle).toBe('Great Prompt')
    expect(entry.maintainerLogin).toBe('maintainer')
    expect(typeof entry.issueNumber).toBe('number')
  })

  it('passes userLogin as third argument to getIssueComments for per-user ETag scoping', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })

    let composable: ReturnType<typeof useAdminLog> | undefined

    mount(
      {
        setup() {
          const authStore = useAuthStore()
          // Phase 10: set user via new ApiUser shape (token is removed; Phase 15 cleanup)
          authStore.$patch({ user: { login: 'maintainer', name: null, avatar_url: '', role: 'maintainer' } })
          composable = useAdminLog()
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

    await vi.waitFor(() => expect(composable!.entries.value.length).toBeGreaterThan(0))

    // token is undefined in Phase 10 (authStore.token removed); Phase 15 will migrate to cookie-based API
    expect(vi.mocked(queries.getIssueComments)).toHaveBeenCalledWith(
      undefined,
      expect.any(Number),
      'maintainer',
    )
  })
})
