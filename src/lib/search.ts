import MiniSearch from 'minisearch'
import type { Prompt } from '@/types/index'

export function createSearchIndex(prompts: Prompt[]): MiniSearch {
  const index = new MiniSearch({
    fields: ['title', 'body', 'tags'],
    storeFields: ['id', 'title', 'author', 'category', 'model', 'difficulty', 'tags'],
    searchOptions: {
      boost: { title: 3, tags: 2, body: 1 },
      prefix: true,
      fuzzy: 0.2,
    },
  })

  index.addAll(
    prompts.map((p) => ({
      ...p,
      tags: p.frontmatter?.tags?.join(' ') ?? '',
      category: p.frontmatter?.category ?? '',
      model: p.frontmatter?.model ?? '',
      difficulty: p.frontmatter?.difficulty ?? '',
    })),
  )

  return index
}

export function searchPrompts(index: MiniSearch, query: string): Prompt[] {
  if (!query || !index) return []
  return index.search(query) as unknown as Prompt[]
}
