<script setup lang="ts">
import { computed } from 'vue'
import { useDraftStore } from '@/stores/useDraftStore'

const props = defineProps<{
  isSaving?: boolean
}>()

const draftStore = useDraftStore()

const statusText = computed(() => {
  if (props.isSaving) return 'Saving...'
  if (draftStore.isDirty) return 'Unsaved changes'
  if (draftStore.lastSaved) {
    const saved = new Date(draftStore.lastSaved)
    return `Saved ${formatTime(saved)}`
  }
  return ''
})

const statusClass = computed(() => {
  if (props.isSaving) return 'text-muted-foreground animate-pulse'
  if (draftStore.isDirty) return 'text-yellow-500 dark:text-yellow-400'
  if (draftStore.lastSaved) return 'text-green-600 dark:text-green-400'
  return 'text-muted-foreground'
})

function formatTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin === 1) return '1 min ago'
  return `${diffMin} min ago`
}
</script>

<template>
  <span v-if="statusText" :class="['text-xs', statusClass]">
    {{ statusText }}
  </span>
</template>
