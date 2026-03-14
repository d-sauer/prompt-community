import { describe, it } from 'vitest'

describe('OAuth Worker', () => {
  it.todo('/login redirects to GitHub OAuth URL with client_id and state params')
  it.todo('/callback exchanges code for token and sends postMessage with token')
  it.todo('/callback echoes state param back in postMessage payload')
  it.todo('CLIENT_SECRET is never exposed in response body')
})
