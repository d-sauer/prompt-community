<script setup lang="ts">
import { ref } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import PromptRow from './PromptRow.vue'
import SkeletonRow from './SkeletonRow.vue'
import EmptyState from './EmptyState.vue'
import type { Prompt } from '@/types/index'

const props = defineProps<{
  prompts: Prompt[]
  isLoading: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
}>()

const emit = defineEmits<{
  loadMore: []
}>()

const sentinel = ref<HTMLElement | null>(null)

useIntersectionObserver(sentinel, ([entry]) => {
  if (entry?.isIntersecting && props.hasNextPage && !props.isFetchingNextPage) {
    emit('loadMore')
  }
})
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <template v-if="isLoading && prompts.length === 0">
      <SkeletonRow v-for="i in 5" :key="i" />
    </template>

    <template v-else-if="!isLoading && prompts.length === 0">
      <EmptyState />
    </template>

    <template v-else>
      <PromptRow v-for="prompt in prompts" :key="prompt.id" :prompt="prompt" />

      <template v-if="isFetchingNextPage">
        <SkeletonRow v-for="i in 3" :key="`skeleton-${i}`" />
      </template>

      <div ref="sentinel" class="h-1" aria-hidden="true" />
    </template>
  </div>
</template>
