import type { Prompt, CommentNode } from '@/types/index'
import type { VersionObject } from '@/types/index'
import { apiFetch } from './http'

export function createPrompt(input: {
  title: string
  body: string
  tags: string[]
  category: string
  model: string
  difficulty: string
}): Promise<Prompt> {
  return apiFetch('/prompts', { method: 'POST', body: JSON.stringify(input) })
}

export function updatePrompt(
  id: string,
  input: Partial<{ title: string; body: string; tags: string[] }>,
): Promise<Prompt> {
  return apiFetch(`/prompts/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deletePrompt(id: string): Promise<Record<string, never>> {
  return apiFetch(`/prompts/${id}`, { method: 'DELETE' })
}

export function createVersion(
  promptId: string,
  input: { changelog: string; body: string },
): Promise<VersionObject> {
  return apiFetch(`/prompts/${promptId}/versions`, { method: 'POST', body: JSON.stringify(input) })
}

export function restoreVersion(
  promptId: string,
  versionNumber: number,
): Promise<VersionObject> {
  return apiFetch(`/prompts/${promptId}/versions/${versionNumber}/restore`, { method: 'POST' })
}

export function postComment(promptId: string, body: string): Promise<CommentNode> {
  return apiFetch(`/prompts/${promptId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

export function deleteComment(commentId: string): Promise<Record<string, never>> {
  return apiFetch(`/comments/${commentId}`, { method: 'DELETE' })
}

export function addReaction(promptId: string, emoji: string): Promise<Record<string, never>> {
  return apiFetch(`/prompts/${promptId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ emoji }),
  })
}

export function removeReaction(promptId: string, emoji: string): Promise<Record<string, never>> {
  return apiFetch(`/prompts/${promptId}/reactions`, {
    method: 'DELETE',
    body: JSON.stringify({ emoji }),
  })
}

export function addBookmark(promptId: string): Promise<Record<string, never>> {
  return apiFetch('/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ prompt_id: promptId }),
  })
}

export function removeBookmark(promptId: string): Promise<Record<string, never>> {
  return apiFetch(`/bookmarks/${promptId}`, { method: 'DELETE' })
}

export function markNotificationRead(id: string): Promise<Record<string, never>> {
  return apiFetch(`/notifications/${id}/read`, { method: 'POST' })
}

export function flagPrompt(_promptId: string): Promise<never> {
  return Promise.reject(new Error('flag endpoint not yet available'))
}
