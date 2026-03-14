import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the octokit module at the top level
vi.mock('./octokit', () => ({
  createRestClient: vi.fn(),
}))

describe('verifyMaintainerStatus', () => {
  beforeEach(async () => {
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
    const { createRestClient } = await import('./octokit')
    const mockRequest = vi.fn()
      .mockResolvedValueOnce({ data: { login: 'testuser' } })  // GET /user
      .mockResolvedValueOnce({ status: 204 })                   // GET /repos/.../collaborators/...
    vi.mocked(createRestClient).mockReturnValue({ request: mockRequest } as never)

    const { verifyMaintainerStatus } = await import('./auth')
    const result = await verifyMaintainerStatus('valid-token')
    expect(result).toBe(true)
  })

  it('returns false when GitHub API returns 404 (not a member)', async () => {
    const { createRestClient } = await import('./octokit')
    const mockRequest = vi.fn()
      .mockResolvedValueOnce({ data: { login: 'outsider' } })   // GET /user
      .mockRejectedValueOnce(Object.assign(new Error('Not Found'), { status: 404 }))
    vi.mocked(createRestClient).mockReturnValue({ request: mockRequest } as never)

    const { verifyMaintainerStatus } = await import('./auth')
    const result = await verifyMaintainerStatus('valid-token')
    expect(result).toBe(false)
  })

  it('returns false when token is present but API throws an unexpected error', async () => {
    const { createRestClient } = await import('./octokit')
    const mockRequest = vi.fn().mockRejectedValue(new Error('Network error'))
    vi.mocked(createRestClient).mockReturnValue({ request: mockRequest } as never)

    const { verifyMaintainerStatus } = await import('./auth')
    const result = await verifyMaintainerStatus('some-token')
    expect(result).toBe(false)
  })
})
