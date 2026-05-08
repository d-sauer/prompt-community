import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./http', () => ({ apiFetch: vi.fn().mockResolvedValue({}) }))

import { apiFetch } from './http'
import {
  createPrompt,
  updatePrompt,
  deletePrompt,
  createVersion,
  restoreVersion,
  postComment,
  deleteComment,
  addReaction,
  removeReaction,
  addBookmark,
  removeBookmark,
  markNotificationRead,
  flagPrompt,
} from './mutations'

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>

describe('mutations', () => {
  beforeEach(() => {
    mockApiFetch.mockClear()
  })

  it('createPrompt calls POST /prompts', async () => {
    await createPrompt({
      title: 'Test',
      body: 'Body',
      tags: [],
      category: 'coding',
      model: 'gpt-4',
      difficulty: 'beginner',
    })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('createPrompt does not accept a token parameter', () => {
    // Function signature must be (input: {...}) — no token
    expect(createPrompt.length).toBe(1)
  })

  it('updatePrompt calls PATCH /prompts/:id', async () => {
    await updatePrompt('01PROMPT1', { title: 'Updated' })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('updatePrompt does not accept a token parameter', () => {
    expect(updatePrompt.length).toBe(2)
  })

  it('deletePrompt calls DELETE /prompts/:id', async () => {
    await deletePrompt('01PROMPT1')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('deletePrompt does not accept a token parameter', () => {
    expect(deletePrompt.length).toBe(1)
  })

  it('createVersion calls POST /prompts/:id/versions', async () => {
    await createVersion('01PROMPT1', { changelog: 'v2', body: 'new body' })
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1/versions',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('restoreVersion calls POST /prompts/:id/versions/:n/restore', async () => {
    await restoreVersion('01PROMPT1', 2)
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1/versions/2/restore',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('postComment calls POST /prompts/:id/comments', async () => {
    await postComment('01PROMPT1', 'Great prompt!')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1/comments',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('deleteComment calls DELETE /comments/:id', async () => {
    await deleteComment('01COMMENT1')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/comments/01COMMENT1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('addReaction calls POST /prompts/:id/reactions', async () => {
    await addReaction('01PROMPT1', '👍')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1/reactions',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('removeReaction calls DELETE /prompts/:id/reactions', async () => {
    await removeReaction('01PROMPT1', '👍')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/prompts/01PROMPT1/reactions',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('addBookmark calls POST /bookmarks', async () => {
    await addBookmark('01PROMPT1')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/bookmarks',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('removeBookmark calls DELETE /bookmarks/:id', async () => {
    await removeBookmark('01PROMPT1')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/bookmarks/01PROMPT1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('markNotificationRead calls POST /notifications/:id/read', async () => {
    await markNotificationRead('01NOTIF1')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/notifications/01NOTIF1/read',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('flagPrompt throws error since endpoint not yet available', async () => {
    await expect(flagPrompt('01PROMPT1')).rejects.toThrow('flag endpoint not yet available')
  })
})
