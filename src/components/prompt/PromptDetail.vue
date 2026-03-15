<script setup lang="ts">
import { toRef } from 'vue'
import { usePromptDetail } from '@/composables/queries/usePromptDetail'
import PromptMetadata from './PromptMetadata.vue'
import MarkdownBody from './MarkdownBody.vue'
import PromptActions from './PromptActions.vue'
import ReactionBar from './ReactionBar.vue'
import CommentSection from './CommentSection.vue'
import { Skeleton } from '@/components/ui/skeleton'

const props = defineProps<{
  promptId: number
}>()

const idRef = toRef(props, 'promptId')
const { data: prompt, isLoading, isError } = usePromptDetail(idRef)
</script>

<template>
  <div class="flex flex-col h-full">
    <template v-if="isLoading">
      <div class="px-5 py-4 border-b border-white/10 space-y-3">
        <Skeleton class="h-5 w-1/2" />
        <Skeleton class="h-4 w-3/4" />
        <div class="flex gap-2">
          <Skeleton class="h-5 w-16" />
          <Skeleton class="h-5 w-20" />
        </div>
      </div>
      <div class="px-5 py-4 space-y-2">
        <Skeleton class="h-4 w-full" />
        <Skeleton class="h-4 w-5/6" />
        <Skeleton class="h-4 w-4/6" />
      </div>
    </template>

    <template v-else-if="isError">
      <div class="flex items-center justify-center h-32 text-sm text-red-400">
        Failed to load prompt
      </div>
    </template>

    <template v-else-if="prompt">
      <div class="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h1 class="text-sm font-semibold text-white/90 line-clamp-1">{{ prompt.title }}</h1>
        <PromptActions :prompt="prompt" />
      </div>

      <PromptMetadata :prompt="prompt" />

      <ReactionBar :prompt="prompt" />

      <div class="flex-1 overflow-y-auto">
        <MarkdownBody :content="prompt.body" />
        <CommentSection :prompt="prompt" />
      </div>
    </template>
  </div>
</template>
