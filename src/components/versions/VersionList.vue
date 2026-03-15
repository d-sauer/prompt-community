<script setup lang="ts">
import type { VersionObject } from '@/types/index'
import VersionItem from './VersionItem.vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { computed } from 'vue'

const props = defineProps<{
  versions: VersionObject[]
  selectedA: VersionObject | null
  selectedB: VersionObject | null
}>()

const emit = defineEmits<{
  'select-a': [version: VersionObject]
  'select-b': [version: VersionObject]
  restore: [version: VersionObject]
}>()

const authStore = useAuthStore()

// Newest first display
const sortedVersions = computed(() => [...props.versions].reverse())

function canRestore(version: VersionObject): boolean {
  if (!authStore.isAuthenticated) return false
  if (authStore.isMaintainer) return true
  if (authStore.user?.login === version.author) return true
  return false
}

// Click handling: first click = select A, second click = select B
function handleSelect(version: VersionObject) {
  if (!props.selectedA || (props.selectedA && props.selectedB)) {
    emit('select-a', version)
  } else {
    emit('select-b', version)
  }
}
</script>

<template>
  <div class="flex flex-col">
    <!-- Empty state -->
    <div
      v-if="versions.length === 0"
      class="flex items-center justify-center p-8 text-muted-foreground text-sm"
    >
      No version history yet
    </div>

    <VersionItem
      v-for="version in sortedVersions"
      :key="version.commentId"
      :version="version"
      :is-selected-a="selectedA?.commentId === version.commentId"
      :is-selected-b="selectedB?.commentId === version.commentId"
      :show-restore="canRestore(version)"
      @select="handleSelect(version)"
      @restore="emit('restore', version)"
    />
  </div>
</template>
