import { describe, it, expect, vi } from 'vitest'
import { handleUpload } from './upload'
import type { Env } from './upload'

function makeEnv(overrides?: Partial<Env>): Env {
  return {
    R2_BUCKET: {
      put: vi.fn().mockResolvedValue(undefined),
    } as Env['R2_BUCKET'],
    R2_PUBLIC_URL: 'https://pub.r2.dev',
    APP_ORIGIN: 'http://localhost:5173',
    ...overrides,
  }
}

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

/**
 * Create a mock Request whose formData() resolves to a FormData with the given file (or none).
 * This avoids the jsdom formData parsing issue with multipart requests.
 */
function makeMockRequest(opts: {
  authHeader?: string | null
  file?: File | null
  method?: string
}): Request {
  const { authHeader, file, method = 'POST' } = opts

  const headers = new Headers()
  if (authHeader !== null && authHeader !== undefined) {
    headers.set('Authorization', authHeader)
  }

  const formData = new FormData()
  if (file !== null && file !== undefined) {
    formData.append('file', file)
  }

  // Create a request with mocked formData() to avoid jsdom multipart parsing timeout
  const req = {
    method,
    headers,
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request

  return req
}

describe('upload CF Worker (handleUpload)', () => {
  it('rejects request without Authorization header (401)', async () => {
    const req = makeMockRequest({ authHeader: null, file: makeFile('test.png', 'image/png', 100) })
    const env = makeEnv()
    const res = await handleUpload(req, env)
    expect(res.status).toBe(401)
  })

  it('rejects unsupported file type (400)', async () => {
    const file = makeFile('malware.exe', 'application/octet-stream', 100)
    const req = makeMockRequest({ authHeader: 'token abc123', file })
    const env = makeEnv()
    const res = await handleUpload(req, env)
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toMatch(/unsupported file type/i)
  })

  it('rejects file over 10MB (413)', async () => {
    const overLimit = 10 * 1024 * 1024 + 1
    const file = makeFile('big.png', 'image/png', overLimit)
    const req = makeMockRequest({ authHeader: 'token abc123', file })
    const env = makeEnv()
    const res = await handleUpload(req, env)
    expect(res.status).toBe(413)
  })

  it('accepts valid PNG and returns R2 URL', async () => {
    const file = makeFile('photo.png', 'image/png', 1024)
    const req = makeMockRequest({ authHeader: 'token abc123', file })
    const env = makeEnv()
    const res = await handleUpload(req, env)
    expect(res.status).toBe(200)
    const body = await res.json() as { url: string }
    expect(body.url).toMatch(/^https:\/\/pub\.r2\.dev\/uploads\//)
    expect(env.R2_BUCKET.put).toHaveBeenCalled()
  })
})
