<script setup lang="ts">
import { ref, toRef } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { Flag } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/useAuthStore'
import { useComments } from '@/composables/queries/useComments'
import { useFlagPrompt } from '@/composables/queries/useFlagPrompt'
import type { Prompt } from '@/types/index'

const props = defineProps<{
  prompt: Prompt
}>()

const authStore = useAuthStore()
const issueId = toRef(props.prompt, 'id')
const { postCommentMutation } = useComments(issueId)
const { flagMutation } = useFlagPrompt(issueId)

const commentBody = ref('')
const showSignInCta = ref(false)

function handleSubmit() {
  if (!commentBody.value.trim()) return
  postCommentMutation.mutate(commentBody.value, {
    onSuccess: () => {
      commentBody.value = ''
    },
  })
}

function handleFlagClick() {
  if (window.confirm('Flag this prompt for review?')) {
    flagMutation.mutate()
  }
}

function handleCommentFocus() {
  if (!authStore.isAuthenticated) {
    showSignInCta.value = true
  }
}
</script>

<template>
  <div class="px-5 py-4 space-y-4">
    <!-- Header row with count and flag button -->
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-medium text-white/70">
        Comments ({{ prompt.commentCount }})
      </h3>
      <button
        v-if="authStore.isAuthenticated"
        class="flex items-center gap-1 px-2 py-1 rounded text-xs text-white/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        :disabled="flagMutation.isPending.value"
        @click="handleFlagClick"
      >
        <Flag class="w-3 h-3" />
        <span>Flag</span>
      </button>
    </div>

    <!-- Comment list -->
    <div v-if="prompt.comments && prompt.comments.length > 0" class="space-y-3">
      <div
        v-for="comment in prompt.comments"
        :key="comment.id"
        class="flex gap-3"
      >
        <img
          :src="comment.author.avatarUrl"
          :alt="comment.author.login"
          class="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-xs font-medium text-white/80">{{ comment.author.login }}</span>
            <span class="text-xs text-white/30">
              {{ formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) }}
            </span>
          </div>
          <p class="text-sm text-white/60 whitespace-pre-wrap">{{ comment.body }}</p>
        </div>
      </div>
    </div>

    <p v-else class="text-sm text-white/30 italic">No comments yet.</p>

    <!-- Post form (authenticated) -->
    <div v-if="authStore.isAuthenticated" class="space-y-2">
      <textarea
        v-model="commentBody"
        rows="3"
        placeholder="Add a comment..."
        class="w-full resize-none rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
      />
      <button
        class="px-3 py-1.5 rounded text-sm font-medium bg-white/10 text-white/80 hover:bg-white/20 transition-colors disabled:opacity-40"
        :disabled="postCommentMutation.isPending.value || !commentBody.trim()"
        @click="handleSubmit"
      >
        {{ postCommentMutation.isPending.value ? 'Posting...' : 'Post Comment' }}
      </button>
    </div>

    <!-- Sign-in CTA (unauthenticated) -->
    <div v-else class="text-sm text-white/40">
      <button class="underline text-white/60 hover:text-white" @click="authStore.login()">Sign in</button>
      to leave a comment.
    </div>
  </div>
</template>
