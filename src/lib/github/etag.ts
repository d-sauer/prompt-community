const etagCache = new Map<string, string>()

export function getEtag(key: string): string | undefined {
  return etagCache.get(key)
}

export function setEtag(key: string, value: string): void {
  etagCache.set(key, value)
}

export function clearEtag(key: string): void {
  etagCache.delete(key)
}

export async function etagFetchWrapper(
  url: string,
  options: RequestInit = {},
  cacheKey: string,
): Promise<Response> {
  const existingEtag = getEtag(cacheKey)
  const headers = new Headers(options.headers)

  if (existingEtag) {
    headers.set('If-None-Match', existingEtag)
  }

  const response = await fetch(url, { ...options, headers })

  const newEtag = response.headers.get('ETag')
  if (newEtag) {
    setEtag(cacheKey, newEtag)
  }

  return response
}
