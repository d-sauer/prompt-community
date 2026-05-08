import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./http', () => ({ apiFetch: vi.fn().mockResolvedValue({}) }))

import { apiFetch } from './http'
import {
  getPrompts,
  getPromptDetail,
  getPromptVersions,
  getPromptComments,
  searchPrompts,
  getLabels,
  getNotifications,
  getUserProfile,
  getUserPrompts,
  getUserActivity,
} from './queries'

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>

describe('queries', () => {
  beforeEach(() => {
    mockApiFetch.mockClear()
  })

  it('getPrompts calls /prompts path', async () => {
    await getPrompts({ category: null, model: null })
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/prompts'),
      expect.anything(),
    )
  })

  it('getPrompts includes cursor in query string when provided', async () => {
    await getPrompts({ category: null, model: null, cursor: 'abc123' })
    const path = mockApiFetch.mock.calls[0][0] as string
    expect(path).toContain('cursor=abc123')
  })

  it('getPromptDetail calls /prompts/:id path', async () => {
    await getPromptDetail('01PROMPT1')
    expect(mockApiFetch).toHaveBeenCalledWith('/prompts/01PROMPT1', undefined)
  })

  it('getPromptVersions calls /prompts/:id/versions path', async () => {
    await getPromptVersions('01PROMPT1')
    expect(mockApiFetch).toHaveBeenCalledWith('/prompts/01PROMPT1/versions', undefined)
  })

  it('getPromptComments calls /prompts/:id/comments path', async () => {
    await getPromptComments('01PROMPT1')
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/prompts/01PROMPT1/comments'),
      undefined,
    )
  })

  it('getPromptComments includes cursor in query string when provided', async () => {
    await getPromptComments('01PROMPT1', { cursor: 'cursor1' })
    const path = mockApiFetch.mock.calls[0][0] as string
    expect(path).toContain('cursor=cursor1')
  })

  it('searchPrompts calls /search path with q param', async () => {
    await searchPrompts('typescript')
    const path = mockApiFetch.mock.calls[0][0] as string
    expect(path).toContain('/search')
    expect(path).toContain('q=typescript')
  })

  it('searchPrompts includes cursor in query string when provided', async () => {
    await searchPrompts('typescript', { cursor: 'next_page' })
    const path = mockApiFetch.mock.calls[0][0] as string
    expect(path).toContain('cursor=next_page')
  })

  it('getLabels calls /labels path', async () => {
    await getLabels()
    expect(mockApiFetch).toHaveBeenCalledWith('/labels', undefined)
  })

  it('getNotifications calls /notifications path', async () => {
    await getNotifications()
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/notifications'),
      undefined,
    )
  })

  it('getUserProfile calls /users/:login path', async () => {
    await getUserProfile('testuser')
    expect(mockApiFetch).toHaveBeenCalledWith('/users/testuser', undefined)
  })

  it('getUserPrompts calls /users/:login/prompts path', async () => {
    await getUserPrompts('testuser')
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/testuser/prompts'),
      undefined,
    )
  })

  it('getUserActivity calls /users/:login/activity path', async () => {
    await getUserActivity('testuser')
    expect(mockApiFetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/testuser/activity'),
      undefined,
    )
  })
})
