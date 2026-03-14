import { graphql } from '@octokit/graphql'
import { Octokit } from '@octokit/core'

export function createGraphqlClient(token?: string) {
  return graphql.defaults({
    headers: {
      ...(token ? { authorization: `token ${token}` } : {}),
      'User-Agent': 'prompt-community-spa',
    },
  })
}

export function createRestClient(token: string) {
  return new Octokit({ auth: token })
}
