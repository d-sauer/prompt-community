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

export const GET_PROMPT_DETAIL = `
  query GetPromptDetail($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      issue(number: $number) {
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
