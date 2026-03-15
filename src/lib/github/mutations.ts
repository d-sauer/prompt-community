import { createGraphqlClient, createRestClient } from '@/lib/github/octokit'
import type { ReactionContent, ReactionGroup } from '@/types/index'

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

/**
 * Post a community comment on a GitHub Issue (COMM-03).
 * Body must NOT start with "## Version" to avoid being parsed as a version comment.
 */
export async function postComment(
  token: string,
  issueNumber: number,
  body: string,
): Promise<{ id: number; body: string; createdAt: string }> {
  const octokit = createRestClient(token)
  const response = await octokit.request(
    'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
    {
      owner: owner(),
      repo: repo(),
      issue_number: issueNumber,
      body,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    },
  )
  return {
    id: response.data.id,
    body: response.data.body ?? '',
    createdAt: response.data.created_at,
  }
}

/**
 * Flag a prompt for moderator review by adding the flag:review label (COMM-06).
 */
export async function flagPrompt(token: string, issueNumber: number): Promise<void> {
  const octokit = createRestClient(token)
  await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/labels', {
    owner: owner(),
    repo: repo(),
    issue_number: issueNumber,
    labels: ['flag:review'],
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
}

// GraphQL mutation strings for reactions (COMM-01/02)

const ADD_REACTION = `
  mutation AddReaction($subjectId: ID!, $content: ReactionContent!) {
    addReaction(input: { subjectId: $subjectId, content: $content }) {
      reactionGroups {
        content
        reactors { totalCount }
        viewerHasReacted
      }
    }
  }
`

const REMOVE_REACTION = `
  mutation RemoveReaction($subjectId: ID!, $content: ReactionContent!) {
    removeReaction(input: { subjectId: $subjectId, content: $content }) {
      reactionGroups {
        content
        reactors { totalCount }
        viewerHasReacted
      }
    }
  }
`

interface AddReactionResponse {
  addReaction: { reactionGroups: ReactionGroup[] }
}

interface RemoveReactionResponse {
  removeReaction: { reactionGroups: ReactionGroup[] }
}

/**
 * Add a reaction to a GitHub issue node (COMM-01).
 * Returns the updated reactionGroups array.
 */
export async function addReaction(
  token: string,
  nodeId: string,
  content: ReactionContent,
): Promise<ReactionGroup[]> {
  const client = createGraphqlClient(token)
  const data = await client<AddReactionResponse>(ADD_REACTION, {
    subjectId: nodeId,
    content,
  })
  return data.addReaction.reactionGroups
}

/**
 * Remove a reaction from a GitHub issue node (COMM-02).
 * Returns the updated reactionGroups array.
 */
export async function removeReaction(
  token: string,
  nodeId: string,
  content: ReactionContent,
): Promise<ReactionGroup[]> {
  const client = createGraphqlClient(token)
  const data = await client<RemoveReactionResponse>(REMOVE_REACTION, {
    subjectId: nodeId,
    content,
  })
  return data.removeReaction.reactionGroups
}
