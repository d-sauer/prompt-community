export const GET_PROMPTS = `
  query GetPrompts($owner: String!, $repo: String!, $labels: [String!], $after: String) {
    repository(owner: $owner, name: $repo) {
      issues(
        first: 20
        after: $after
        states: [OPEN]
        labels: $labels
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          number
          title
          body
          createdAt
          updatedAt
          author {
            login
            avatarUrl
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
          reactionGroups {
            content
            reactors {
              totalCount
            }
          }
          comments {
            totalCount
          }
        }
      }
    }
  }
`

export const GET_USER_SUBMISSIONS = `
  query GetUserSubmissions($searchQuery: String!, $first: Int!) {
    search(query: $searchQuery, type: ISSUE, first: $first) {
      issueCount
      nodes {
        ... on Issue {
          number
          title
          createdAt
          reactionGroups {
            content
            reactors { totalCount }
          }
          comments { totalCount }
          labels(first: 5) { nodes { name color } }
        }
      }
    }
  }
`

export const GET_PROMPT_DETAIL = `
  query GetPromptDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
        id
        number
        title
        body
        createdAt
        updatedAt
        author {
          login
          avatarUrl
        }
        labels(first: 10) {
          nodes {
            name
            color
          }
        }
        reactionGroups {
          content
          reactors {
            totalCount
          }
          viewerHasReacted
        }
        comments(first: 100) {
          totalCount
          nodes {
            id
            body
            createdAt
            author {
              login
              avatarUrl
            }
          }
        }
      }
    }
  }
`

// ── Admin queries (ADMN-02 / ADMN-03) ────────────────────────────────────────

/**
 * Returns three totalCount aliases for the admin dashboard stats (ADMN-02):
 *  - total: all open issues
 *  - flagged: open issues with flag:review label
 *  - featured: open issues with status:featured label
 */
export const GET_ADMIN_STATS = `
  query GetAdminStats($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      total: issues(states: [OPEN]) {
        totalCount
      }
      flagged: issues(states: [OPEN], labels: ["flag:review"]) {
        totalCount
      }
      featured: issues(states: [OPEN], labels: ["status:featured"]) {
        totalCount
      }
    }
  }
`

/**
 * Fetches the first 20 open issues with the flag:review label (ADMN-03).
 * IMPORTANT: includes `id` (GraphQL base64 node ID) — required by deleteIssueGraphQL.
 */
export const GET_FLAGGED_ISSUES = `
  query GetFlaggedIssues($owner: String!, $repo: String!, $after: String) {
    repository(owner: $owner, name: $repo) {
      issues(
        first: 20
        after: $after
        states: [OPEN]
        labels: ["flag:review"]
        orderBy: { field: CREATED_AT, direction: DESC }
      ) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          number
          title
          createdAt
          author {
            login
            avatarUrl
          }
          labels(first: 10) {
            nodes {
              name
              color
            }
          }
        }
      }
    }
  }
`

export const GET_VIEWER = `
  query GetViewer {
    viewer {
      login
      name
      avatarUrl
      bio
      company
      location
      followers { totalCount }
      following { totalCount }
      repositories(privacy: PUBLIC) { totalCount }
    }
  }
`

import { createRestClient } from '@/lib/github/octokit'

const owner = () => import.meta.env.VITE_GITHUB_OWNER as string
const repo = () => import.meta.env.VITE_GITHUB_REPO as string

/**
 * Fetch all repo labels via REST (ADMN-06).
 * Returns up to 100 labels per request.
 */
export async function getRepoLabels(token: string): Promise<
  Array<{
    id: number
    node_id: string
    name: string
    color: string
    description: string | null
  }>
> {
  const octokit = createRestClient(token)
  const response = await octokit.request('GET /repos/{owner}/{repo}/labels', {
    owner: owner(),
    repo: repo(),
    per_page: 100,
    headers: { 'X-GitHub-Api-Version': '2022-11-28' },
  })
  return response.data as Array<{
    id: number
    node_id: string
    name: string
    color: string
    description: string | null
  }>
}

/**
 * Fetch all comments for a single issue via REST (ADMN-08).
 * Consumed by useAdminLog in Plan 02 to read moderation system comments.
 * Returns up to 100 comments per request.
 */
export async function getIssueComments(
  token: string,
  issueNumber: number,
): Promise<
  Array<{
    id: number
    body: string
    created_at: string
    user: { login: string } | null
  }>
> {
  const octokit = createRestClient(token)
  const response = await octokit.request(
    'GET /repos/{owner}/{repo}/issues/{issue_number}/comments',
    {
      owner: owner(),
      repo: repo(),
      issue_number: issueNumber,
      per_page: 100,
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
    },
  )
  return response.data as Array<{
    id: number
    body: string
    created_at: string
    user: { login: string } | null
  }>
}
