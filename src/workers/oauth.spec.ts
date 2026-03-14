import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import worker from './oauth'

const mockEnv = {
  CLIENT_ID: 'test-client-id',
  CLIENT_SECRET: 'test-client-secret',
  APP_ORIGIN: 'https://app.test',
}

describe('OAuth Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /login', () => {
    it('returns 302 redirect to github.com/login/oauth/authorize with client_id and state', async () => {
      const request = new Request('https://worker.example.com/login')
      const response = await worker.fetch(request, mockEnv)

      expect(response.status).toBe(302)
      const location = response.headers.get('Location')
      expect(location).toContain('https://github.com/login/oauth/authorize')
      expect(location).toContain(`client_id=${mockEnv.CLIENT_ID}`)
      expect(location).toContain('state=')
    })

    it('includes scope=public_repo in the redirect URL', async () => {
      const request = new Request('https://worker.example.com/login')
      const response = await worker.fetch(request, mockEnv)

      const location = response.headers.get('Location')
      expect(location).toContain('scope=public_repo')
    })
  })

  describe('GET /callback', () => {
    it('returns 400 when code is missing', async () => {
      const request = new Request('https://worker.example.com/callback?state=abc123')
      const response = await worker.fetch(request, mockEnv)

      expect(response.status).toBe(400)
    })

    it('returns 400 when state is missing', async () => {
      const request = new Request('https://worker.example.com/callback?code=somecode')
      const response = await worker.fetch(request, mockEnv)

      expect(response.status).toBe(400)
    })

    it('exchanges code for token and returns HTML with postMessage script', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'gho_test_token' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = new Request('https://worker.example.com/callback?code=valid-code&state=csrf-state-123')
      const response = await worker.fetch(request, mockEnv)

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('postMessage')
      expect(body).toContain('gho_test_token')
      mockFetch.mockRestore()
    })

    it('postMessage payload includes both token and state (state echoed back)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'gho_abc' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = new Request('https://worker.example.com/callback?code=mycode&state=my-csrf-state')
      const response = await worker.fetch(request, mockEnv)
      const body = await response.text()

      // state should be echoed back in the postMessage payload
      expect(body).toContain('my-csrf-state')
      expect(body).toContain('gho_abc')
    })

    it('response Content-Type is text/html', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'gho_test' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = new Request('https://worker.example.com/callback?code=c&state=s')
      const response = await worker.fetch(request, mockEnv)

      expect(response.headers.get('Content-Type')).toContain('text/html')
    })

    it('CLIENT_SECRET is never exposed in the response body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'gho_token' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = new Request('https://worker.example.com/callback?code=c&state=s')
      const response = await worker.fetch(request, mockEnv)
      const body = await response.text()

      expect(body).not.toContain(mockEnv.CLIENT_SECRET)
    })

    it('uses APP_ORIGIN as the target origin for postMessage', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'gho_token' }), {
          headers: { 'Content-Type': 'application/json' },
        }),
      )

      const request = new Request('https://worker.example.com/callback?code=c&state=s')
      const response = await worker.fetch(request, mockEnv)
      const body = await response.text()

      expect(body).toContain(mockEnv.APP_ORIGIN)
    })
  })

  describe('unknown routes', () => {
    it('returns 404 for unknown paths', async () => {
      const request = new Request('https://worker.example.com/unknown')
      const response = await worker.fetch(request, mockEnv)

      expect(response.status).toBe(404)
    })
  })
})
