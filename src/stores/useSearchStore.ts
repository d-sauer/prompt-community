import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import MiniSearch from 'minisearch'
import { createSearchIndex, searchPrompts } from '@/lib/search'
import type { Prompt } from '@/types/index'

// MiniSearch is not reactive-friendly — store outside of Vue reactivity
let miniSearchInstance: MiniSearch | null = null

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const allPrompts = ref<Prompt[]>([])

  const results = computed<Prompt[]>(() => {
    if (!query.value.trim()) return allPrompts.value
    if (!miniSearchInstance) return allPrompts.value
    const hits = searchPrompts(miniSearchInstance, query.value)
    // Map search hits back to full prompt objects
    const hitIds = new Set(hits.map((h) => h.id))
    return allPrompts.value.filter((p) => hitIds.has(p.id))
  })

  function setQuery(q: string) {
    query.value = q
  }

  function buildIndex(prompts: Prompt[]) {
    allPrompts.value = prompts
    miniSearchInstance = createSearchIndex(prompts)
  }

  return {
    query,
    allPrompts,
    results,
    setQuery,
    buildIndex,
  }
})
