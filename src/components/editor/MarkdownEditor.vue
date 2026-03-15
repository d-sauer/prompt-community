<script setup lang="ts">
import { Textarea } from '@/components/ui/textarea'

const model = defineModel<string>({ default: '' })
</script>

<template>
  <Textarea
    :model-value="model"
    class="h-full min-h-[400px] resize-none font-mono text-sm leading-relaxed"
    placeholder="Write your prompt content in markdown..."
    @update:model-value="model = String($event)"
  />
</template>
