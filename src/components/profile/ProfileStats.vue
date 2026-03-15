<script setup lang="ts">
import { BookMarked, ThumbsUp } from 'lucide-vue-next'

defineProps<{
  totalVotes: number
  totalSubmissions: number
}>()
</script>

<template>
  <div class="flex items-center gap-6">
    <div class="flex items-center gap-2">
      <BookMarked class="w-4 h-4 text-white/40" />
      <span class="text-lg font-semibold text-white">{{ totalSubmissions }}</span>
      <span class="text-sm text-white/60">submissions</span>
    </div>
    <div class="flex items-center gap-2">
      <ThumbsUp class="w-4 h-4 text-white/40" />
      <span class="text-lg font-semibold text-white">{{ totalVotes }}</span>
      <span class="text-sm text-white/60">votes</span>
    </div>
  </div>
</template>
