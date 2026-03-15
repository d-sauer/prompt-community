<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { computeDiff } from '@/lib/diff'
import type { DiffLine } from '@/lib/diff'
import type { VersionObject } from '@/types/index'
import DiffLineComponent from './DiffLine.vue'

const props = defineProps<{
  versionA: VersionObject | null
  versionB: VersionObject | null
  layout: 'side-by-side' | 'unified'
}>()

const lines = ref<DiffLine[]>([])

watchEffect(() => {
  if (props.versionA && props.versionB) {
    lines.value = computeDiff(props.versionA.content, props.versionB.content)
  } else {
    lines.value = []
  }
})

// For side-by-side layout
const leftLines = (): DiffLine[] =>
  lines.value.filter((l) => l.type === 'removed' || l.type === 'unchanged')
const rightLines = (): DiffLine[] =>
  lines.value.filter((l) => l.type === 'added' || l.type === 'unchanged')
</script>

<template>
  <!-- Placeholder when no selection -->
  <div
    v-if="!versionA || !versionB"
    class="flex items-center justify-center h-full text-muted-foreground text-sm"
  >
    Select two versions to compare
  </div>

  <!-- Unified layout -->
  <div v-else-if="layout === 'unified'" class="overflow-auto h-full">
    <div class="min-w-0">
      <DiffLineComponent
        v-for="(line, index) in lines"
        :key="index"
        :line="line"
        layout="unified"
      />
    </div>
  </div>

  <!-- Side-by-side layout -->
  <div v-else class="overflow-auto h-full grid grid-cols-2 divide-x divide-border">
    <!-- Left: A (original, removed + unchanged) -->
    <div class="overflow-auto">
      <DiffLineComponent
        v-for="(line, index) in leftLines()"
        :key="'left-' + index"
        :line="line"
        layout="side-by-side"
        side="left"
      />
    </div>
    <!-- Right: B (modified, added + unchanged) -->
    <div class="overflow-auto">
      <DiffLineComponent
        v-for="(line, index) in rightLines()"
        :key="'right-' + index"
        :line="line"
        layout="side-by-side"
        side="right"
      />
    </div>
  </div>
</template>
