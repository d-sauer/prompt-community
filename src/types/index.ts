export interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
  bio: string | null
  company: string | null
  location: string | null
  followers: number
  following: number
  publicRepos: number
}

export interface FilterState {
  category: string | null
  model: string | null
}

export type SortOrder = 'most-voted' | 'newest' | 'most-discussed'

export interface Prompt {
  id: number
  title: string
  body: string
  author: GitHubUser
  createdAt: string
  updatedAt: string
  voteCount: number
  commentCount: number
  labels: string[]
  category: string | null
  model: string | null
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null
  tags: string[]
}

// Pinia store state shapes (for reference — actual stores use defineStore setup syntax)
export interface AuthState {
  token: string | null
  user: GitHubUser | null
  isMaintainer: boolean
}
