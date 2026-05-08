import type { PromptFrontmatter } from '@/lib/frontmatter'

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

export interface AuthState {
  token: string | null
  user: GitHubUser | null
  isMaintainer: boolean
}

// Phase 2 types

export type ContentType = 'prompt' | 'skill-file' | 'skill-set'

// Phase 3 types

export type ReactionContent = 'THUMBS_UP' | 'HEART' | 'ROCKET'

export interface ReactionGroup {
  content: string
  reactors: { totalCount: number }
  viewerHasReacted: boolean
}

export interface CommentNode {
  id: string
  body: string
  createdAt: string
  author: { login: string; avatarUrl: string }
}

export interface Prompt {
  id: string           // ULID from v2 API
  title: string
  body: string         // raw markdown content (after frontmatter stripped)
  frontmatter: PromptFrontmatter
  author: { login: string; avatarUrl: string }
  createdAt: string
  updatedAt: string
  labels: Array<{ name: string; color: string }>
  reactionGroups: ReactionGroup[]
  commentCount: number
  comments: CommentNode[]
  status?: 'draft' | 'published' | 'flagged' | 'hidden'
}

export interface VersionObject {
  version: number
  date: Date
  changelog: string
  content: string
  commentId: string
  author: string
  authorAvatar: string
}

export interface DraftState {
  title: string
  body: string
  frontmatter: PromptFrontmatter | null
  isDirty: boolean
  lastSaved: Date | null
}
