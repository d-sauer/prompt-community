<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useUIStore } from '@/stores/useUIStore'
import { initMarkdown, renderMarkdown } from '@/lib/markdown'

const props = defineProps<{
  content: string
}>()

const uiStore = useUIStore()
const htmlOutput = ref('')

// Debounced render — 300ms as per CONT-06 spec
const debouncedRender = useDebounceFn(async (content: string) => {
  if (!uiStore.markdownReady) return
  const md = await initMarkdown()
  htmlOutput.value = renderMarkdown(md, content)
}, 300)

// Re-render when content changes
watch(() => props.content, (newContent) => {
  void debouncedRender(newContent)
})

// Initial render when markdown becomes ready
watch(
  () => uiStore.markdownReady,
  async (ready) => {
    if (ready) {
      const md = await initMarkdown()
      htmlOutput.value = renderMarkdown(md, props.content)
    }
  },
)
</script>

<template>
  <div class="h-full overflow-auto p-4">
    <div v-if="!uiStore.markdownReady" class="flex items-center gap-2 text-muted-foreground text-sm">
      <div class="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Initializing preview...
    </div>
    <div
      v-else
      class="prose prose-sm dark:prose-invert max-w-none"
      v-html="htmlOutput"
    />
  </div>
</template>
