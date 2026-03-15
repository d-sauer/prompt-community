import { createRestClient } from '@/lib/github/octokit'

const owner = () => import.meta.env.VITE_GITHUB_OWNER as string
const repo = () => import.meta.env.VITE_GITHUB_REPO as string

/**
 * Create a new GitHub Issue (prompt/skill) in the data repo.
 * Returns the issue number.
 */
export async function createIssue(
  token: string,
  title: string,
  body: string,
  labelNames: string[],
): Promise<number> {
  const octokit = createRestClient(token)
  const response = await octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner: owner(),
    repo: repo(),
    title,
    body,
    labels: labelNames,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  return response.data.number
}

/**
 * Update an existing GitHub Issue (edit mode).
 * Returns the updated issue data.
 */
export async function updateIssue(
  token: string,
  issueNumber: number,
  title: string,
  body: string,
  labelNames: string[],
): Promise<{ number: number; title: string; body: string }> {
  const octokit = createRestClient(token)
  const response = await octokit.request('PATCH /repos/{owner}/{repo}/issues/{issue_number}', {
    owner: owner(),
    repo: repo(),
    issue_number: issueNumber,
    title,
    body,
    labels: labelNames,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  return {
    number: response.data.number,
    title: response.data.title,
    body: response.data.body ?? '',
  }
}

/**
 * Post a version comment on a GitHub Issue (VERS-01).
 * Format: "## Version N — YYYY-MM-DD\n{changelog}\n\n{content}"
 * Returns the comment id.
 */
export async function createVersionComment(
  token: string,
  issueNumber: number,
  versionNumber: number,
  changelog: string,
  content: string,
): Promise<number> {
  const octokit = createRestClient(token)
  const date = new Date().toISOString().split('T')[0]
  const commentBody = `## Version ${versionNumber} — ${date}\n${changelog}\n\n${content}`

  const response = await octokit.request(
    'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
    {
      owner: owner(),
      repo: repo(),
      issue_number: issueNumber,
      body: commentBody,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )
  return response.data.id
}
