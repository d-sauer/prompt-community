import { describe, it, expect } from 'vitest'
import { parseVersionComment } from './usePromptVersions'

describe('parseVersionComment', () => {
  it('parseVersionComment returns null for non-version comment', () => {
    const comment = {
      id: 'c1',
      body: 'Just a regular comment\nWith some content',
      createdAt: '2026-03-15T00:00:00Z',
      author: { login: 'user', avatarUrl: '' },
    }
    expect(parseVersionComment(comment)).toBeNull()
  })

  it('parseVersionComment extracts version number, date, changelog, content', () => {
    const comment = {
      id: 'c2',
      body: '## Version 3 \u2014 2026-03-15\nAdded new examples\n\nThe actual prompt content here.',
      createdAt: '2026-03-15T00:00:00Z',
      author: { login: 'alice', avatarUrl: 'https://example.com/avatar.png' },
    }
    const result = parseVersionComment(comment)
    expect(result).not.toBeNull()
    expect(result!.version).toBe(3)
    expect(result!.date).toEqual(new Date('2026-03-15'))
    expect(result!.changelog).toBe('Added new examples')
    expect(result!.content).toBe('The actual prompt content here.')
    expect(result!.commentId).toBe('c2')
    expect(result!.author).toBe('alice')
    expect(result!.authorAvatar).toBe('https://example.com/avatar.png')
  })
})

describe('usePromptVersions', () => {
  it.todo('usePromptVersions filters non-version comments silently')
})
