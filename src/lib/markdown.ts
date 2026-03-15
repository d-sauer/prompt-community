import MarkdownIt from 'markdown-it'
import { fromHighlighter } from '@shikijs/markdown-it'
import { createHighlighter } from 'shiki'

let mdInstance: MarkdownIt | null = null

export async function initMarkdown(): Promise<MarkdownIt> {
  if (mdInstance) return mdInstance

  const highlighter = await createHighlighter({
    themes: ['github-dark'],
    langs: [
      'typescript',
      'javascript',
      'python',
      'bash',
      'shell',
      'json',
      'yaml',
      'markdown',
      'html',
      'css',
    ],
  })

  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
  })

  md.use(fromHighlighter(highlighter, { theme: 'github-dark' }))
  mdInstance = md
  return mdInstance
}

export function renderMarkdown(md: MarkdownIt, content: string): string {
  return md.render(content)
}

export function getMarkdownInstance(): MarkdownIt | null {
  return mdInstance
}
