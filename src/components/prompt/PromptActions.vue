<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Copy, Share2 } from 'lucide-vue-next'
import type { Prompt } from '@/types/index'

const props = defineProps<{
  prompt: Prompt
}>()

const { copy: copyToClipboard } = useClipboard()

async function copyContent() {
  await copyToClipboard(props.prompt.body)
  toast.success('Copied to clipboard')
}

async function sharePrompt() {
  const url = `${window.location.origin}/prompts/${props.prompt.id}`
  await copyToClipboard(url)
  toast.success('Permalink copied to clipboard')
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
  </div>
</template>
