import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FilterState, SortOrder } from '@/types/index'

export const usePromptsStore = defineStore('prompts', () => {
  const filterState = ref<FilterState>({ category: null, model: null })
  const sortOrder = ref<SortOrder>('newest')

  function setCategory(v: string | null) {
    filterState.value.category = v
  }

  function setModel(v: string | null) {
    filterState.value.model = v
  }

  function setSortOrder(v: SortOrder) {
    sortOrder.value = v
  }

  return {
    filterState,
    sortOrder,
    setCategory,
    setModel,
    setSortOrder,
  }
})
