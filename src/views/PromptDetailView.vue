<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PromptDetail from '@/components/prompt/PromptDetail.vue'

const route = useRoute()
const promptId = computed(() => {
  const id = parseInt(route.params.id as string, 10)
  return isNaN(id) ? null : id
})
</script>

<template>
  <div class="h-full overflow-auto">
    <PromptDetail v-if="promptId" :prompt-id="promptId" />
    <div v-else class="flex items-center justify-center h-full text-sm text-white/40">
      Invalid prompt ID
    </div>
  </div>
</template>
