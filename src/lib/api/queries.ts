import type { Prompt, FilterState, CommentNode, VersionObject } from '@/types/index'
import { apiFetch } from './http'

export interface PageResponse<T> {
  data: T[]
  next_cursor: string | null
}

export interface ActivityItem {
  type: 'prompt_created'
  prompt: { id: string; title: string; created_at: string }
}

export interface NotificationItem {
  id: string
  type: string
  read: boolean
  created_at: string
  prompt?: { id: string; title: string }
}

export interface UserProfile {
  login: string
  name: string | null
  avatar_url: string
  role: string
  bio?: string | null
  company?: string | null
  location?: string | null
}

export interface LabelGroup {
  [type: string]: Array<{ id: string; prefix: string; value: string; color: string | null; description: string | null }>
}

function buildQuery(params: Record<string, string | number | boolean | null | undefined>): string {
  const usp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') {
      usp.set(key, String(value))
    }
  }
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

export function getPrompts(
  params: FilterState & { cursor?: string; limit?: number; sort?: string },
): Promise<PageResponse<Prompt>> {
  const qs = buildQuery(params as Record<string, string | null | undefined>)
  return apiFetch(`/prompts${qs}`)
}

export function getPromptDetail(id: string): Promise<Prompt> {
  return apiFetch(`/prompts/${id}`)
}

export function getPromptVersions(id: string): Promise<VersionObject[]> {
  return apiFetch(`/prompts/${id}/versions`)
}

export function getPromptComments(
  id: string,
  params?: { cursor?: string; limit?: number },
): Promise<PageResponse<CommentNode>> {
  const qs = params ? buildQuery(params as Record<string, string | number | undefined>) : ''
  return apiFetch(`/prompts/${id}/comments${qs}`)
}

export function searchPrompts(
  q: string,
  params?: { cursor?: string; limit?: number },
): Promise<PageResponse<Prompt>> {
  const qs = buildQuery({ q, ...params })
  return apiFetch(`/search${qs}`)
}

export function getLabels(): Promise<LabelGroup> {
  return apiFetch('/labels')
}

export function getNotifications(
  params?: { cursor?: string; limit?: number },
): Promise<PageResponse<NotificationItem>> {
  const qs = params ? buildQuery(params as Record<string, string | number | undefined>) : ''
  return apiFetch(`/notifications${qs}`)
}

export function getUserProfile(login: string): Promise<UserProfile> {
  return apiFetch(`/users/${login}`)
}

export function getUserPrompts(
  login: string,
  params?: { cursor?: string; limit?: number },
): Promise<PageResponse<Prompt>> {
  const qs = params ? buildQuery(params as Record<string, string | number | undefined>) : ''
  return apiFetch(`/users/${login}/prompts${qs}`)
}

export function getUserActivity(
  login: string,
  cursor?: string,
): Promise<PageResponse<ActivityItem>> {
  const qs = cursor ? buildQuery({ cursor }) : ''
  return apiFetch(`/users/${login}/activity${qs}`)
}
