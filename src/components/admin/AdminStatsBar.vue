<script setup lang="ts">
import { Badge } from '@/components/ui/badge'

defineProps<{
  total: number
  flagged: number
  featured: number
}>()
</script>

<template>
  <div class="flex items-center gap-6 rounded-lg border border-border bg-card px-6 py-3">
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Total Prompts</span>
      <Badge variant="secondary">{{ total }}</Badge>
    </div>
    <div class="h-4 w-px bg-border" />
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Flagged</span>
      <Badge variant="destructive">{{ flagged }}</Badge>
    </div>
    <div class="h-4 w-px bg-border" />
    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Featured</span>
      <Badge class="bg-green-600 text-white hover:bg-green-700">{{ featured }}</Badge>
    </div>
  </div>
</template>
