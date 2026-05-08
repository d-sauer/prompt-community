import { apiFetch } from './http'

// ── Types ────────────────────────────────────────────────────────────────────

export interface FlaggedPrompt {
  id: string
  title: string
  status: 'flagged'
  author: { login: string; avatar_url: string | null }
  created_at: string
}

export interface LogEntry {
  id: string
  action: string
  reason: string | null
  actor: { login: string }
  prompt: { id: string; title: string }
  created_at: string
}

export interface AdminLabel {
  id: string
  prefix: string
  value: string
  color: string | null
  description: string | null
}

export interface AdminStats {
  total: number
  flagged: number
}

// ── Read functions ────────────────────────────────────────────────────────────

export function getAdminQueue(
  params?: { cursor?: string },
): Promise<{ data: FlaggedPrompt[]; next_cursor: string | null }> {
  const qs = params?.cursor ? `?cursor=${encodeURIComponent(params.cursor)}` : ''
  return apiFetch(`/admin/queue${qs}`)
}

export function getAdminLog(): Promise<{ data: LogEntry[] }> {
  return apiFetch('/admin/log')
}

export function getAdminStats(): Promise<AdminStats> {
  return apiFetch('/admin/stats')
}

// ── Write functions ───────────────────────────────────────────────────────────

export function approvePrompt(
  id: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/admin/prompts/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function hidePrompt(
  id: string,
  reason?: string,
): Promise<{ success: boolean }> {
  return apiFetch(`/admin/prompts/${id}/hide`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export function createLabel(input: {
  prefix: string
  value: string
  color?: string
  description?: string
}): Promise<AdminLabel> {
  return apiFetch('/labels', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateLabel(
  id: string,
  input: Partial<{ prefix: string; value: string; color: string; description: string }>,
): Promise<AdminLabel> {
  return apiFetch(`/labels/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export function deleteLabel(id: string): Promise<void> {
  return apiFetch(`/labels/${id}`, { method: 'DELETE' })
}
