import YAML from 'yaml'

export interface PromptFrontmatter {
  type: 'prompt' | 'skill-file' | 'skill-set'
  category: string
  model: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  version: number
  changelog?: string
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

export function parseFrontmatter(body: string): { frontmatter: PromptFrontmatter | null; content: string } {
  const match = body.match(FRONTMATTER_REGEX)
  if (!match) {
    return { frontmatter: null, content: body }
  }

  const [, yamlStr, content] = match
  try {
    const frontmatter = YAML.parse(yamlStr) as PromptFrontmatter
    return { frontmatter, content }
  } catch {
    return { frontmatter: null, content: body }
  }
}

export function buildFrontmatter(meta: PromptFrontmatter): string {
  return `---\n${YAML.stringify(meta)}---\n\n`
}
