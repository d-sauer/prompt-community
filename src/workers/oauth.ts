interface Env {
  CLIENT_ID: string
  CLIENT_SECRET: string
  APP_ORIGIN: string
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)

    if (url.pathname === '/login') {
      const state = url.searchParams.get('state') ?? crypto.randomUUID()
      const githubUrl = new URL('https://github.com/login/oauth/authorize')
      githubUrl.searchParams.set('client_id', env.CLIENT_ID)
      githubUrl.searchParams.set('scope', 'public_repo')
      githubUrl.searchParams.set('state', state)
      return Response.redirect(githubUrl.toString(), 302)
    }

    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code')
      const state = url.searchParams.get('state')

      if (!code || !state) {
        return new Response('Missing code or state', { status: 400 })
      }

      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: env.CLIENT_ID,
          client_secret: env.CLIENT_SECRET,
          code,
        }),
      })

      const data = await tokenRes.json() as { access_token?: string; error?: string }
      const access_token = data.access_token
      const error = data.error

      if (!access_token) {
        return new Response(`OAuth error: ${error ?? 'unknown'}`, { status: 400 })
      }

      // Post token back to the opener — state echoed for SPA CSRF verification
      // CLIENT_SECRET is never included in the response body
      return new Response(
        `<script>
          window.opener.postMessage({ token: ${JSON.stringify(access_token)}, state: ${JSON.stringify(state)} }, ${JSON.stringify(env.APP_ORIGIN)});
          window.close();
        </script>`,
        { headers: { 'Content-Type': 'text/html' } },
      )
    }

    return new Response('Not found', { status: 404 })
  },
}
