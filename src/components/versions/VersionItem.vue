<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VersionObject } from '@/types/index'
import { format } from 'date-fns'

const props = defineProps<{
  version: VersionObject
  isSelectedA: boolean
  isSelectedB: boolean
  showRestore: boolean
}>()

const emit = defineEmits<{
  select: []
  restore: []
}>()

const formattedDate = computed(() => format(props.version.date, 'MMM d, yyyy'))

const borderClass = computed(() => {
  if (props.isSelectedA) return 'border-l-4 border-l-purple-500'
  if (props.isSelectedB) return 'border-l-4 border-l-blue-500'
  return 'border-l-4 border-l-transparent'
})
</script>

<template>
  <div
    :class="[
      'flex items-start gap-3 p-3 cursor-pointer hover:bg-accent transition-colors',
      borderClass,
    ]"
    @click="emit('select')"
  >
    <!-- Selection chips -->
    <div class="flex flex-col items-center gap-1 shrink-0 pt-0.5">
      <span
        v-if="isSelectedA"
        class="text-xs font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
        >A</span
      >
      <span
        v-else-if="isSelectedB"
        class="text-xs font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
        >B</span
      >
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2 mb-1">
        <Badge variant="secondary">Version {{ version.version }}</Badge>
        <span class="text-xs text-muted-foreground">{{ formattedDate }}</span>
      </div>

      <!-- Author -->
      <div class="flex items-center gap-1.5 mb-1">
        <img
          v-if="version.authorAvatar"
          :src="version.authorAvatar"
          :alt="version.author"
          class="w-4 h-4 rounded-full"
        />
        <span class="text-xs text-muted-foreground">{{ version.author }}</span>
      </div>

      <!-- Changelog -->
      <p class="text-xs" :class="version.changelog ? '' : 'text-muted-foreground italic'">
        {{ version.changelog || 'No changelog' }}
      </p>
    </div>

    <!-- Restore button -->
    <div v-if="showRestore" class="shrink-0" @click.stop>
      <Button size="sm" variant="outline" @click="emit('restore')">Restore</Button>
    </div>
  </div>
</template>
