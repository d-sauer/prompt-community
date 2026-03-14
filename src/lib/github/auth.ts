import { createRestClient } from './octokit'

export async function verifyMaintainerStatus(token: string | null): Promise<boolean> {
  if (!token) return false
  try {
    const octokit = createRestClient(token)
    // Fetch current authenticated user login
    const { data: userInfo } = await octokit.request('GET /user')
    // Check if user is a collaborator on the data repo
    // Returns 204 if member, throws with status 404 if not
    const response = await octokit.request(
      'GET /repos/{owner}/{repo}/collaborators/{username}',
      {
        owner: import.meta.env.VITE_GITHUB_OWNER as string,
        repo: import.meta.env.VITE_GITHUB_REPO as string,
        username: userInfo.login as string,
      },
    )
    return response.status === 204
  } catch {
    // 404 = not a collaborator; any API error = deny access
    return false
  }
}
