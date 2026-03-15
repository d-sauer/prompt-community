<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { usePromptsStore } from '@/stores/usePromptsStore'

const promptsStore = usePromptsStore()

function clearFilters() {
  promptsStore.setCategory(null)
  promptsStore.setModel(null)
}
</script>

<template>
  <div class="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
    <div class="text-4xl opacity-30">search</div>
    <div>
      <p class="text-sm text-white/60 font-medium">No prompts found</p>
      <p class="text-xs text-white/40 mt-1">Try adjusting your filters or search query</p>
    </div>
    <Button variant="outline" size="sm" @click="clearFilters">Clear filters</Button>
  </div>
</template>
