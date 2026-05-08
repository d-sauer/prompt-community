<script setup lang="ts">
import { ref, toRef } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { useReactions } from '@/composables/queries/useReactions'
import type { Prompt, ReactionContent } from '@/types/index'

const props = defineProps<{
  prompt: Prompt
}>()

const authStore = useAuthStore()
const { toggle, toggleReaction } = useReactions(toRef(props.prompt, 'id'))

const showSignInCta = ref(false)

const EMOJI_MAP: Record<ReactionContent, string> = {
  THUMBS_UP: '👍',
  HEART: '❤️',
  ROCKET: '🚀',
}

const REACTIONS: ReactionContent[] = ['THUMBS_UP', 'HEART', 'ROCKET']

function getGroup(content: ReactionContent) {
  return props.prompt.reactionGroups.find((g) => g.content === content)
}

function handleReactionClick(content: ReactionContent) {
  if (!authStore.isAuthenticated) {
    showSignInCta.value = true
    return
  }
  void toggle(content)
}
</script>

<template>
  <div class="px-5 py-2 border-b border-white/10 flex items-center gap-2 flex-wrap">
    <button
      v-for="content in REACTIONS"
      :key="content"
      class="flex items-center gap-1 px-2 py-1 rounded-full text-sm transition-colors"
      :class="[
        getGroup(content)?.viewerHasReacted
          ? 'bg-white/20 text-white ring-1 ring-white/40'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80',
      ]"
      :disabled="toggleReaction.isPending.value"
      @click="handleReactionClick(content)"
    >
      <span>{{ EMOJI_MAP[content] }}</span>
      <span>{{ getGroup(content)?.reactors.totalCount ?? 0 }}</span>
    </button>

    <div v-if="showSignInCta" class="ml-2 text-xs text-white/50">
      <button class="underline text-white/70 hover:text-white" @click="authStore.login()">Sign in</button>
      to react
    </div>
  </div>
</template>
