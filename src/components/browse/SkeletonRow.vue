<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
</script>

<template>
  <div class="flex items-center gap-3 px-4 py-3 border-b border-white/5">
    <Skeleton class="h-8 w-8 rounded-full flex-shrink-0" />
    <div class="flex-1 space-y-2">
      <Skeleton class="h-4 w-3/4" />
      <div class="flex gap-2">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-12" />
        <Skeleton class="h-3 w-20" />
      </div>
    </div>
    <Skeleton class="h-5 w-8 flex-shrink-0" />
  </div>
</template>
