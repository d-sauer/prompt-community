<script setup lang="ts">
import type { DiffLine } from '@/lib/diff'

defineProps<{
  line: DiffLine
  layout: 'side-by-side' | 'unified'
  side?: 'left' | 'right'
}>()
</script>

<template>
  <!-- Added line -->
  <div
    v-if="line.type === 'added'"
    class="flex items-start font-mono text-sm bg-green-100 dark:bg-green-900/40"
  >
    <span class="select-none w-10 text-right pr-2 text-xs text-muted-foreground shrink-0">
      {{ line.lineNumberB ?? '' }}
    </span>
    <span class="select-none px-1 text-green-700 dark:text-green-400 shrink-0">+</span>
    <span class="whitespace-pre-wrap break-all text-green-800 dark:text-green-200">{{ line.content }}</span>
  </div>

  <!-- Removed line -->
  <div
    v-else-if="line.type === 'removed'"
    class="flex items-start font-mono text-sm bg-red-100 dark:bg-red-900/40"
  >
    <span class="select-none w-10 text-right pr-2 text-xs text-muted-foreground shrink-0">
      {{ line.lineNumberA ?? '' }}
    </span>
    <span class="select-none px-1 text-red-700 dark:text-red-400 shrink-0">-</span>
    <span class="whitespace-pre-wrap break-all text-red-800 dark:text-red-200">{{ line.content }}</span>
  </div>

  <!-- Unchanged line -->
  <div v-else class="flex items-start font-mono text-sm">
    <span class="select-none w-10 text-right pr-2 text-xs text-muted-foreground shrink-0">
      {{ layout === 'unified' || side === 'left' ? (line.lineNumberA ?? '') : (line.lineNumberB ?? '') }}
    </span>
    <span class="select-none px-1 text-muted-foreground shrink-0"> </span>
    <span class="whitespace-pre-wrap break-all">{{ line.content }}</span>
  </div>
</template>
