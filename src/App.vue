<script setup lang="ts">
import { onMounted } from 'vue'
import { initMarkdown } from '@/lib/markdown'
import { useUIStore } from '@/stores/useUIStore'
import { Toaster as Sonner } from '@/components/ui/sonner'

const uiStore = useUIStore()

onMounted(async () => {
  await initMarkdown()
  uiStore.markdownReady = true
})
</script>

<template>
  <RouterView />
  <Sonner rich-colors position="bottom-right" />
</template>
