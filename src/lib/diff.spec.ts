import { describe, it, expect } from 'vitest'
import { computeDiff } from './diff'

describe('computeDiff', () => {
  it('computeDiff returns empty array for identical strings', () => {
    const result = computeDiff('line one\nline two', 'line one\nline two')
    expect(result.every((l) => l.type === 'unchanged')).toBe(true)
    expect(result).toHaveLength(2)
  })

  it('detects added lines', () => {
    // Adding a line in the middle — surrounded by unchanged lines for proper grouping
    const result = computeDiff('keep\nalso keep', 'keep\nadded line\nalso keep')
    const added = result.filter((l) => l.type === 'added')
    expect(added).toHaveLength(1)
    expect(added[0].content).toBe('added line')
    expect(added[0].lineNumberA).toBeNull()
    expect(added[0].lineNumberB).toBe(2)
  })

  it('detects removed lines', () => {
    // A line in the middle of versionA that is absent from versionB
    const result = computeDiff('keep\nremove me\nalso keep', 'keep\nalso keep')
    const removed = result.filter((l) => l.type === 'removed')
    expect(removed).toHaveLength(1)
    expect(removed[0].content).toBe('remove me')
    expect(removed[0].lineNumberB).toBeNull()
    expect(removed[0].lineNumberA).toBe(2)
  })

  it('trailing newline differences do not produce spurious diff lines', () => {
    // One string has trailing newline, other does not — should show zero diff
    const result = computeDiff('line one\nline two\n', 'line one\nline two')
    expect(result.every((l) => l.type === 'unchanged')).toBe(true)
  })

  it('mixed add/remove/unchanged produces correct line numbers', () => {
    const a = 'alpha\nbeta\ngamma'
    const b = 'alpha\ndelta\ngamma'
    const result = computeDiff(a, b)
    const unchanged = result.filter((l) => l.type === 'unchanged')
    const removed = result.filter((l) => l.type === 'removed')
    const added = result.filter((l) => l.type === 'added')

    expect(unchanged[0].content).toBe('alpha')
    expect(unchanged[0].lineNumberA).toBe(1)
    expect(unchanged[0].lineNumberB).toBe(1)

    expect(removed[0].content).toBe('beta')
    expect(removed[0].lineNumberA).toBe(2)
    expect(removed[0].lineNumberB).toBeNull()

    expect(added[0].content).toBe('delta')
    expect(added[0].lineNumberA).toBeNull()
    expect(added[0].lineNumberB).toBe(2)

    const lastUnchanged = unchanged[unchanged.length - 1]
    expect(lastUnchanged.content).toBe('gamma')
    expect(lastUnchanged.lineNumberA).toBe(3)
    expect(lastUnchanged.lineNumberB).toBe(3)
  })
})
