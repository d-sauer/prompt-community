<script setup lang="ts">
import { computed } from 'vue'
import { usePromptsStore } from '@/stores/usePromptsStore'
import { X } from 'lucide-vue-next'

const promptsStore = usePromptsStore()

const activeFilters = computed(() => {
  const filters: Array<{ key: 'category' | 'model'; label: string; value: string }> = []
  if (promptsStore.filterState.category) {
    filters.push({ key: 'category', label: 'Category', value: promptsStore.filterState.category })
  }
  if (promptsStore.filterState.model) {
    filters.push({ key: 'model', label: 'Model', value: promptsStore.filterState.model })
  }
  return filters
})

function clearFilter(key: 'category' | 'model') {
  if (key === 'category') promptsStore.setCategory(null)
  if (key === 'model') promptsStore.setModel(null)
}
</script>

<template>
  <div v-if="activeFilters.length > 0" class="flex flex-wrap gap-1.5 px-3 py-2">
    <div
      v-for="filter in activeFilters"
      :key="filter.key"
      class="flex items-center gap-1 bg-purple-500/20 border border-purple-500/30 rounded-full px-2 py-0.5"
    >
      <span class="text-xs text-purple-300">{{ filter.label }}: {{ filter.value }}</span>
      <button
        class="text-purple-400 hover:text-purple-200 transition-colors"
        @click="clearFilter(filter.key)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>
