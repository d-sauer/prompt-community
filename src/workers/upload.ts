export interface Env {
  R2_BUCKET: R2Bucket
  R2_PUBLIC_URL: string
  APP_ORIGIN: string
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  }
}

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const headers = corsHeaders(env.APP_ORIGIN)

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('token ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  // Parse form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file provided' }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}` }), {
      status: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  // Validate file size
  if (file.size > MAX_SIZE_BYTES) {
    return new Response(JSON.stringify({ error: 'File exceeds 10MB limit' }), {
      status: 413,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }

  // Upload to R2
  const key = `uploads/${crypto.randomUUID()}-${file.name}`
  const buffer = await file.arrayBuffer()
  await env.R2_BUCKET.put(key, buffer, {
    httpMetadata: { contentType: file.type },
  })

  return new Response(
    JSON.stringify({ url: `${env.R2_PUBLIC_URL}/${key}` }),
    {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    },
  )
}
