const STORAGE_KEY = (login: string) => `etag-cache:${login}`
const MAX_ENTRIES = 50

function readCache(login: string): Map<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(login))
    if (!raw) return new Map()
    const entries = JSON.parse(raw) as [string, string][]
    return new Map(entries)
  } catch {
    return new Map()
  }
}

function writeCache(login: string, map: Map<string, string>): void {
  try {
    localStorage.setItem(STORAGE_KEY(login), JSON.stringify([...map.entries()]))
  } catch {
    // Degrade silently (e.g. QuotaExceededError)
  }
}

export function getEtag(login: string, key: string): string | undefined {
  return readCache(login).get(key)
}

export function setEtag(login: string, key: string, value: string): void {
  const cache = readCache(login)
  // Re-insert at end (LRU: move to most-recent position)
  cache.delete(key)
  // Evict oldest if at capacity
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey !== undefined) {
      cache.delete(firstKey)
    }
  }
  cache.set(key, value)
  writeCache(login, cache)
}

export function clearEtag(login: string, key: string): void {
  const cache = readCache(login)
  cache.delete(key)
  writeCache(login, cache)
}

export function clearUserEtags(login: string): void {
  try {
    localStorage.removeItem(STORAGE_KEY(login))
  } catch {
    // Degrade silently
  }
}

export async function etagFetchWrapper(
  url: string,
  options: RequestInit = {},
  cacheKey: string,
  userLogin: string,
): Promise<Response> {
  const existingEtag = getEtag(userLogin, cacheKey)
  const headers = new Headers(options.headers)

  if (existingEtag) {
    headers.set('If-None-Match', existingEtag)
  }

  const response = await fetch(url, { ...options, headers })

  const newEtag = response.headers.get('ETag')
  if (newEtag) {
    setEtag(userLogin, cacheKey, newEtag)
  }

  return response
}

export function makeBoundFetch(
  userLogin: string,
): (url: string, options?: RequestInit) => Promise<Response> {
  return (url: string, options: RequestInit = {}) => {
    const key = `${userLogin}:${new URL(url).pathname}`
    return etagFetchWrapper(url, options, key, userLogin)
  }
}
