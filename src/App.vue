<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { initMarkdown } from '@/lib/markdown'
import { useUIStore } from '@/stores/useUIStore'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { useOfflineQueue } from '@/composables/queries/useOfflineQueue'
import { useAuthStore } from '@/stores/useAuthStore'

const uiStore = useUIStore()
const authStore = useAuthStore()
const { isOnline, drainQueue, getQueue } = useOfflineQueue()

onMounted(async () => {
  await initMarkdown()
  uiStore.markdownReady = true
})

// Drain on auth change: if user signs in while online and queue has items, drain immediately
watch(
  () => authStore.token,
  (token) => {
    if (token && isOnline.value && getQueue().length > 0) {
      void drainQueue(token)
    }
  },
)

// Also drain on reconnect if already authenticated
watch(isOnline, (online) => {
  if (online && authStore.token && getQueue().length > 0) {
    void drainQueue(authStore.token)
  }
})
</script>

<template>
  <RouterView />
  <Sonner rich-colors position="bottom-right" />
</template>
