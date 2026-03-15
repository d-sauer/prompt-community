<script setup lang="ts">
import { onMounted } from 'vue'
import { initMarkdown } from '@/lib/markdown'
import { useUIStore } from '@/stores/useUIStore'

const uiStore = useUIStore()

onMounted(async () => {
  await initMarkdown()
  uiStore.markdownReady = true
})
</script>

<template>
  <RouterView />
</template>
