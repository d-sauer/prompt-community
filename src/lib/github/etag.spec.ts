import { describe, it, expect, vi, beforeEach } from 'vitest'

// STORAGE_KEY format used by the new etag.ts implementation
const STORAGE_KEY = (login: string) => `etag-cache:${login}`

// In-memory localStorage substitute (setup.ts spies on Storage.prototype break direct localStorage use)
function makeStoreMock() {
  const store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string): string | null => store[key] ?? null),
    setItem: vi.fn((key: string, value: string): void => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string): void => {
      delete store[key]
    }),
    clear: vi.fn((): void => {
      Object.keys(store).forEach((k) => delete store[k])
    }),
    get length(): number {
      return Object.keys(store).length
    },
    key: vi.fn((index: number): string | null => Object.keys(store)[index] ?? null),
    _store: store,
  }
}

let storageMock: ReturnType<typeof makeStoreMock>

describe('etag localStorage store', () => {
  beforeEach(async () => {
    storageMock = makeStoreMock()
    vi.stubGlobal('localStorage', storageMock)
    vi.clearAllMocks()
    // Reset mock implementations (clearAllMocks clears them)
    storageMock.getItem.mockImplementation((key: string) => storageMock._store[key] ?? null)
    storageMock.setItem.mockImplementation((key: string, value: string) => {
      storageMock._store[key] = value
    })
    storageMock.removeItem.mockImplementation((key: string) => {
      delete storageMock._store[key]
    })
    // Re-import with fresh module (no state leak between tests)
    vi.resetModules()
  })

  it('getEtag returns undefined when no entry exists for (login, key)', async () => {
    const { getEtag } = await import('./etag')
    expect(getEtag('alice', '/repos/owner/repo/labels')).toBeUndefined()
  })

  it('setEtag stores a value; getEtag retrieves it by (login, key)', async () => {
    const { setEtag, getEtag } = await import('./etag')
    setEtag('alice', '/repos/owner/repo/labels', '"abc123"')
    expect(getEtag('alice', '/repos/owner/repo/labels')).toBe('"abc123"')
  })

  it('setEtag scopes entries per login — alice entry not visible to bob', async () => {
    const { setEtag, getEtag } = await import('./etag')
    setEtag('alice', '/repos/owner/repo/labels', '"alice-etag"')
    expect(getEtag('bob', '/repos/owner/repo/labels')).toBeUndefined()
  })

  it('setEtag at 50 entries evicts the oldest before inserting the 51st (FIFO/LRU cap)', async () => {
    const { setEtag, getEtag } = await import('./etag')
    // Fill exactly 50 entries
    for (let i = 0; i < 50; i++) {
      setEtag('alice', `/path/${i}`, `"etag-${i}"`)
    }
    // All 50 present
    expect(getEtag('alice', '/path/0')).toBe('"etag-0"')
    expect(getEtag('alice', '/path/49')).toBe('"etag-49"')
    // Insert 51st — oldest (/path/0) should be evicted
    setEtag('alice', '/path/50', '"etag-50"')
    expect(getEtag('alice', '/path/0')).toBeUndefined()
    expect(getEtag('alice', '/path/50')).toBe('"etag-50"')
  })

  it('clearEtag removes a single (login, key) entry while leaving others intact', async () => {
    const { setEtag, getEtag, clearEtag } = await import('./etag')
    setEtag('alice', '/path/a', '"etag-a"')
    setEtag('alice', '/path/b', '"etag-b"')
    clearEtag('alice', '/path/a')
    expect(getEtag('alice', '/path/a')).toBeUndefined()
    expect(getEtag('alice', '/path/b')).toBe('"etag-b"')
  })

  it('clearUserEtags removes the entire localStorage key for that login; other logins unaffected', async () => {
    const { setEtag, getEtag, clearUserEtags } = await import('./etag')
    setEtag('alice', '/path/a', '"etag-a"')
    setEtag('bob', '/path/a', '"etag-bob"')
    clearUserEtags('alice')
    expect(storageMock.getItem(STORAGE_KEY('alice'))).toBeNull()
    // bob unaffected
    expect(getEtag('bob', '/path/a')).toBe('"etag-bob"')
  })

  it('localStorage read wrapped in try/catch — corrupted JSON returns empty Map (simulate by writing invalid JSON to STORAGE_KEY)', async () => {
    storageMock.setItem(STORAGE_KEY('alice'), 'not-json')
    const { getEtag } = await import('./etag')
    // Should not throw — returns undefined (empty Map)
    expect(getEtag('alice', '/any-key')).toBeUndefined()
  })

  it('localStorage write degrades silently when setItem throws (simulate QuotaExceededError)', async () => {
    const { setEtag } = await import('./etag')
    storageMock.setItem.mockImplementationOnce(() => {
      throw new DOMException('QuotaExceededError')
    })
    // Should not throw
    expect(() => setEtag('alice', '/path/a', '"etag-a"')).not.toThrow()
  })
})

describe('etagFetchWrapper', () => {
  beforeEach(async () => {
    storageMock = makeStoreMock()
    vi.stubGlobal('localStorage', storageMock)
    vi.clearAllMocks()
    storageMock.getItem.mockImplementation((key: string) => storageMock._store[key] ?? null)
    storageMock.setItem.mockImplementation((key: string, value: string) => {
      storageMock._store[key] = value
    })
    storageMock.removeItem.mockImplementation((key: string) => {
      delete storageMock._store[key]
    })
    vi.resetModules()
  })

  it('etagFetchWrapper sets If-None-Match header when a cached ETag exists for (login, key)', async () => {
    const { setEtag, etagFetchWrapper } = await import('./etag')
    setEtag('alice', 'alice:/repos/owner/repo/labels', '"cached-etag"')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(null, { status: 304, headers: {} }),
    )

    await etagFetchWrapper(
      'https://api.github.com/repos/owner/repo/labels',
      {},
      'alice:/repos/owner/repo/labels',
      'alice',
    )

    const calledHeaders = fetchSpy.mock.calls[0][1]?.headers
    const headers = new Headers(calledHeaders as HeadersInit)
    expect(headers.get('If-None-Match')).toBe('"cached-etag"')
  })

  it('etagFetchWrapper stores the ETag from a 200 response ETag header', async () => {
    const { getEtag, etagFetchWrapper } = await import('./etag')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('[]', {
        status: 200,
        headers: { ETag: '"new-etag-value"' },
      }),
    )

    await etagFetchWrapper(
      'https://api.github.com/repos/owner/repo/labels',
      {},
      'alice:/repos/owner/repo/labels',
      'alice',
    )

    expect(getEtag('alice', 'alice:/repos/owner/repo/labels')).toBe('"new-etag-value"')
  })

  it('etagFetchWrapper passes through when no ETag header on response (no error thrown)', async () => {
    const { etagFetchWrapper } = await import('./etag')

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('[]', { status: 200, headers: {} }),
    )

    await expect(
      etagFetchWrapper(
        'https://api.github.com/repos/owner/repo/labels',
        {},
        'alice:/repos/owner/repo/labels',
        'alice',
      ),
    ).resolves.not.toThrow()
  })
})
