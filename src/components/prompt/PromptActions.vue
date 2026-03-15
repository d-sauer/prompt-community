<script setup lang="ts">
import { computed } from 'vue'
import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Copy, Share2, Bookmark, BookmarkCheck } from 'lucide-vue-next'
import type { Prompt } from '@/types/index'
import { useAuthStore } from '@/stores/useAuthStore'
import { useBookmarksStore } from '@/stores/useBookmarksStore'

const props = defineProps<{
  prompt: Prompt
}>()

const authStore = useAuthStore()
const bookmarksStore = useBookmarksStore()
const { copy: copyToClipboard } = useClipboard()

const isBookmarked = computed(() => bookmarksStore.isBookmarked(props.prompt.id).value)

async function copyContent() {
  await copyToClipboard(props.prompt.body)
  toast.success('Copied to clipboard')
}

async function sharePrompt() {
  const url = `${window.location.origin}/prompts/${props.prompt.id}`
  await copyToClipboard(url)
  toast.success('Permalink copied to clipboard')
}

function toggleBookmark() {
  if (!authStore.isAuthenticated) {
    toast.info('Sign in to save prompts')
    return
  }
  bookmarksStore.toggle(props.prompt.id)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Button variant="ghost" size="sm" class="text-xs text-white/60 hover:text-white" @click="copyContent">
      <Copy class="w-3.5 h-3.5 mr-1" />
      Copy
    </Button>
    <Button variant="ghost" size="sm" class="text-xs text-white/60 hover:text-white" @click="sharePrompt">
      <Share2 class="w-3.5 h-3.5 mr-1" />
      Share
    </Button>
    <Button
      variant="ghost"
      size="sm"
      class="text-xs hover:text-white"
      :class="isBookmarked ? 'text-purple-400' : 'text-white/60'"
      @click="toggleBookmark"
    >
      <BookmarkCheck v-if="isBookmarked" class="w-3.5 h-3.5 mr-1" />
      <Bookmark v-else class="w-3.5 h-3.5 mr-1" />
      {{ isBookmarked ? 'Saved' : 'Save' }}
    </Button>
  </div>
</template>
