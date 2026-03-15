import { diffLines } from 'diff'

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumberA: number | null
  lineNumberB: number | null
}

/**
 * Compute a line-level diff between two content strings.
 * Inputs are trimmed before diffing to avoid trailing newline artifacts (Pitfall 7).
 */
export function computeDiff(versionA: string, versionB: string): DiffLine[] {
  const normalized_a = versionA.trim()
  const normalized_b = versionB.trim()

  const changes = diffLines(normalized_a, normalized_b)
  const result: DiffLine[] = []

  let lineNumberA = 1
  let lineNumberB = 1

  for (const change of changes) {
    // Split lines, filter trailing empty string caused by trailing newline in chunk
    const rawLines = change.value.split('\n')
    const lines =
      rawLines.length > 1 && rawLines[rawLines.length - 1] === ''
        ? rawLines.slice(0, -1)
        : rawLines

    if (change.added) {
      for (const line of lines) {
        result.push({
          type: 'added',
          content: line,
          lineNumberA: null,
          lineNumberB: lineNumberB++,
        })
      }
    } else if (change.removed) {
      for (const line of lines) {
        result.push({
          type: 'removed',
          content: line,
          lineNumberA: lineNumberA++,
          lineNumberB: null,
        })
      }
    } else {
      for (const line of lines) {
        result.push({
          type: 'unchanged',
          content: line,
          lineNumberA: lineNumberA++,
          lineNumberB: lineNumberB++,
        })
      }
    }
  }

  return result
}
