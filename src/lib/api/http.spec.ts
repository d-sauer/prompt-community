import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch } from './http'

const MOCK_BASE_URL = 'http://localhost:8787'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_URL', MOCK_BASE_URL)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('Test 1: includes credentials: include in every request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ data: 'test' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await apiFetch('/test')

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('Test 2: prepends VITE_API_URL (strips trailing slash) to path', async () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:8787/')
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    await apiFetch('/prompts')

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/prompts',
      expect.any(Object),
    )
  })

  it('Test 3: throws Error with message from body.error on 4xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Prompt not found' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(apiFetch('/prompts/missing')).rejects.toThrow('Prompt not found')
  })

  it('Test 4: throws Error with HTTP 500 message when body has no error field on 5xx response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'internal error' }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await expect(apiFetch('/prompts')).rejects.toThrow('HTTP 500')
  })

  it('Test 5: returns {} for 204 No Content responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: () => Promise.reject(new Error('no body')),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await apiFetch('/prompts/123')
    expect(result).toEqual({})
  })

  it('Test 6: returns parsed JSON for 200 responses', async () => {
    const mockData = { id: '01ABC', title: 'Test Prompt' }
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    })
    vi.stubGlobal('fetch', mockFetch)

    const result = await apiFetch('/prompts/01ABC')
    expect(result).toEqual(mockData)
  })
})
