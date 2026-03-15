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
