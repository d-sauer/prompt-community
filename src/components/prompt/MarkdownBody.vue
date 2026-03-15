<script setup lang="ts">
import { computed } from 'vue'
import { getMarkdownInstance } from '@/lib/markdown'
import { renderMarkdown } from '@/lib/markdown'
import { useUIStore } from '@/stores/useUIStore'

const props = defineProps<{
  content: string
}>()

const uiStore = useUIStore()

const rendered = computed(() => {
  const md = getMarkdownInstance()
  if (!md || !uiStore.markdownReady) return ''
  return renderMarkdown(md, props.content)
})
</script>

<template>
  <div v-if="uiStore.markdownReady" class="prose prose-invert prose-sm max-w-none px-5 py-4">
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div v-html="rendered" class="markdown-body" />
  </div>
  <div v-else class="px-5 py-4 text-sm text-white/40">Loading renderer...</div>
</template>
