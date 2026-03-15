<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import { usePromptsStore } from '@/stores/usePromptsStore'
import type { Prompt } from '@/types/index'
import { formatDistanceToNow } from 'date-fns'

const props = defineProps<{
  prompt: Prompt
}>()

const promptsStore = usePromptsStore()

const isActive = computed(() => promptsStore.selectedPromptId === props.prompt.id)

const voteCount = computed(() => {
  const thumbsUp = props.prompt.reactionGroups.find((g) => g.content === 'THUMBS_UP')
  return thumbsUp?.reactors.totalCount ?? 0
})

const relativeDate = computed(() => {
  try {
    return formatDistanceToNow(new Date(props.prompt.createdAt), { addSuffix: true })
  } catch {
    return ''
  }
})

const category = computed(() => props.prompt.frontmatter?.category ?? '')

function selectPrompt() {
  promptsStore.setSelectedPrompt(props.prompt.id)
}
</script>

<template>
  <div
    class="flex items-start gap-3 px-4 py-3 border-b border-white/5 cursor-pointer hover:bg-white/[0.03] transition-colors relative"
    :class="{
      'bg-purple-500/10 border-l-2 border-l-purple-500': isActive,
      'border-l-2 border-l-transparent': !isActive,
    }"
    @click="selectPrompt"
  >
    <img
      :src="prompt.author.avatarUrl"
      :alt="prompt.author.login"
      class="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 bg-white/10"
    />
    <div class="flex-1 min-w-0">
      <p class="text-sm font-medium text-white/90 line-clamp-2 leading-snug">{{ prompt.title }}</p>
      <div class="flex items-center gap-2 mt-1.5 flex-wrap">
        <Badge
          v-if="category"
          variant="outline"
          class="text-xs border-purple-500/30 text-purple-300 px-1.5 py-0"
        >
          {{ category }}
        </Badge>
        <span class="text-xs text-white/40">{{ prompt.author.login }}</span>
        <span class="text-xs text-white/30">{{ relativeDate }}</span>
      </div>
    </div>
    <div class="flex flex-col items-end gap-1 flex-shrink-0 text-xs text-white/40">
      <span class="flex items-center gap-0.5">
        <span>+1</span>
        <span>{{ voteCount }}</span>
      </span>
      <span class="flex items-center gap-0.5">
        <span>comment</span>
        <span>{{ prompt.commentCount }}</span>
      </span>
    </div>
  </div>
</template>
