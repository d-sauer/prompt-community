import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import { createTestingPinia } from '@pinia/testing'
import { useAdminLog } from './useAdminLog'

vi.mock('@/lib/api/admin', () => ({
  getAdminLog: vi.fn().mockResolvedValue({
    data: [
      {
        id: '01HLOG001',
        action: 'approve',
        reason: null,
        actor: { login: 'maintainer' },
        prompt: { id: '01HPROMPT001', title: 'Great Prompt' },
        created_at: '2026-01-16T12:00:00Z',
      },
      {
        id: '01HLOG002',
        action: 'approve',
        reason: 'Looks good',
        actor: { login: 'maintainer' },
        prompt: { id: '01HPROMPT002', title: 'Great Prompt' },
        created_at: '2026-01-15T10:00:00Z',
      },
      {
        id: '01HLOG003',
        action: 'hide',
        reason: 'Spam',
        actor: { login: 'moderator' },
        prompt: { id: '01HPROMPT003', title: 'Another Prompt' },
        created_at: '2026-01-12T09:00:00Z',
      },
    ],
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

  it('returns all log entries from getAdminLog', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.entries.value.length).toBe(3)
    })

    const actions = composable.entries.value.map((e) => e.action)
    expect(actions).toContain('approve')
    expect(actions).toContain('hide')
  })

  it('date range filter: dateFrom and dateTo narrow returned entries', async () => {
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

  it('each log entry exposes structured fields: id, action, reason, actor, prompt, created_at', async () => {
    const { composable } = setupTest()

    await vi.waitFor(() => {
      expect(composable.entries.value.length).toBeGreaterThan(0)
    })

    const entry = composable.entries.value.find((e) => e.action === 'approve')!
    expect(entry.id).toBe('01HLOG001')
    expect(entry.action).toBe('approve')
    expect(entry.actor.login).toBe('maintainer')
    expect(entry.prompt.title).toBe('Great Prompt')
    expect(entry.created_at).toBe('2026-01-16T12:00:00Z')
  })

  it('exposes isLoading while fetching', () => {
    const { composable } = setupTest()
    expect(typeof composable.isLoading.value).toBe('boolean')
  })
})
