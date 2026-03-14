import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests for verifyMaintainerStatus
describe('verifyMaintainerStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns false without calling API when token is null', async () => {
    const { verifyMaintainerStatus } = await import('./auth')
    const result = await verifyMaintainerStatus(null)
    expect(result).toBe(false)
  })

  it('returns false without calling API when token is undefined', async () => {
    const { verifyMaintainerStatus } = await import('./auth')
    // @ts-expect-error testing undefined case
    const result = await verifyMaintainerStatus(undefined)
    expect(result).toBe(false)
  })

  it('returns true when GitHub API returns 204 (member)', async () => {
    // Mock createRestClient at module level
    vi.doMock('./octokit', () => ({
      createRestClient: () => ({
        request: vi.fn()
          .mockResolvedValueOnce({ data: { login: 'testuser' } })  // GET /user
          .mockResolvedValueOnce({ status: 204 }),                   // GET /repos/.../collaborators/...
      }),
    }))

    // Re-import after mock
    const { verifyMaintainerStatus } = await import('./auth')
    const result = await verifyMaintainerStatus('valid-token')
    expect(result).toBe(true)
    vi.doUnmock('./octokit')
  })

  it('returns false when GitHub API returns 404 (not a member)', async () => {
    vi.doMock('./octokit', () => ({
      createRestClient: () => ({
        request: vi.fn()
          .mockResolvedValueOnce({ data: { login: 'outsider' } })   // GET /user
          .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 })),
      }),
    }))

    const { verifyMaintainerStatus } = await import('./auth')
    const result = await verifyMaintainerStatus('valid-token')
    expect(result).toBe(false)
    vi.doUnmock('./octokit')
  })
})
