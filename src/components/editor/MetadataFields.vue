<script setup lang="ts">
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { PromptFrontmatter } from '@/lib/frontmatter'

// Extend frontmatter with optional usage instructions field
type ExtendedFrontmatter = Partial<PromptFrontmatter> & { usage_instructions?: string }

const props = defineProps<{
  modelValue: ExtendedFrontmatter
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ExtendedFrontmatter]
}>()

function update(field: keyof ExtendedFrontmatter, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [field]: String(value ?? '') })
}
</script>

<template>
  <div class="space-y-3">
    <!-- Content Type -->
    <div class="space-y-1">
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content Type</label>
      <Select
        :model-value="modelValue.type ?? ''"
        @update:model-value="(v) => update('type', v)"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Select type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="prompt">Prompt</SelectItem>
          <SelectItem value="skill-file">Skill File</SelectItem>
          <SelectItem value="skill-set">Skill Set</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Category -->
    <div class="space-y-1">
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</label>
      <Select
        :model-value="modelValue.category ?? ''"
        @update:model-value="(v) => update('category', v)"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Select category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Engineering">Engineering</SelectItem>
          <SelectItem value="Business">Business</SelectItem>
          <SelectItem value="General">General</SelectItem>
          <SelectItem value="Design">Design</SelectItem>
          <SelectItem value="Marketing">Marketing</SelectItem>
          <SelectItem value="Data">Data</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- AI Model -->
    <div class="space-y-1">
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">AI Model</label>
      <Select
        :model-value="modelValue.model ?? ''"
        @update:model-value="(v) => update('model', v)"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
          <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
          <SelectItem value="gpt-4">GPT-4</SelectItem>
          <SelectItem value="gemini-1-5-pro">Gemini 1.5 Pro</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Difficulty -->
    <div class="space-y-1">
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Difficulty</label>
      <Select
        :model-value="modelValue.difficulty ?? ''"
        @update:model-value="(v) => update('difficulty', v)"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Select difficulty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="beginner">Beginner</SelectItem>
          <SelectItem value="intermediate">Intermediate</SelectItem>
          <SelectItem value="advanced">Advanced</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Usage Instructions (CONT-04) -->
    <div class="space-y-1">
      <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Usage Instructions</label>
      <Input
        :model-value="modelValue.usage_instructions ?? ''"
        placeholder="How to use this prompt..."
        @update:model-value="(v) => update('usage_instructions', v)"
      />
    </div>
  </div>
</template>
