<script setup lang="ts">
import { computed } from 'vue'
import { Badge } from '@/components/ui/badge'
import type { Prompt } from '@/types/index'
import { formatDistanceToNow } from 'date-fns'

const props = defineProps<{
  prompt: Prompt
}>()

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

const contentType = computed(() => props.prompt.frontmatter?.type ?? 'prompt')
const category = computed(() => props.prompt.frontmatter?.category ?? '')
const model = computed(() => props.prompt.frontmatter?.model ?? '')
const difficulty = computed(() => props.prompt.frontmatter?.difficulty ?? '')
const tags = computed(() => (props.prompt.frontmatter?.tags ?? []).slice(0, 5))
</script>

<template>
  <div class="px-5 py-4 border-b border-white/10 space-y-3">
    <div class="flex items-start gap-2 flex-wrap">
      <Badge variant="outline" class="text-xs border-blue-500/30 text-blue-300 capitalize">
        {{ contentType }}
      </Badge>
      <Badge v-if="category" variant="outline" class="text-xs border-purple-500/30 text-purple-300">
        {{ category }}
      </Badge>
      <Badge v-if="model" variant="outline" class="text-xs border-emerald-500/30 text-emerald-300">
        {{ model }}
      </Badge>
      <Badge
        v-if="difficulty"
        variant="outline"
        class="text-xs"
        :class="{
          'border-green-500/30 text-green-300': difficulty === 'beginner',
          'border-yellow-500/30 text-yellow-300': difficulty === 'intermediate',
          'border-red-500/30 text-red-300': difficulty === 'advanced',
        }"
      >
        {{ difficulty }}
      </Badge>
    </div>

    <div class="flex items-center gap-4 text-xs text-white/50">
      <div class="flex items-center gap-1">
        <img
          :src="prompt.author.avatarUrl"
          :alt="prompt.author.login"
          class="w-4 h-4 rounded-full"
        />
        <span class="text-white/70">{{ prompt.author.login }}</span>
      </div>
      <span>{{ relativeDate }}</span>
      <span class="flex items-center gap-1">
        <span>+1</span>
        <span>{{ voteCount }}</span>
      </span>
      <span class="flex items-center gap-1">
        <span>comment</span>
        <span>{{ prompt.commentCount }}</span>
      </span>
    </div>

    <div v-if="tags.length > 0" class="flex flex-wrap gap-1.5">
      <span
        v-for="tag in tags"
        :key="tag"
        class="text-xs bg-white/5 text-white/50 rounded px-1.5 py-0.5"
      >
        #{{ tag }}
      </span>
    </div>
  </div>
</template>
