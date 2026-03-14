import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Prompt } from '@/types/index'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const results = ref<Prompt[]>([])

  function setQuery(q: string) {
    query.value = q
  }

  function setResults(r: Prompt[]) {
    results.value = r
  }

  return {
    query,
    results,
    setQuery,
    setResults,
  }
})
