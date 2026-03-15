<script setup lang="ts">
import { ref } from 'vue'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const MAX_TAGS = 5

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [tags: string[]]
}>()

const inputValue = ref('')

function addTag() {
  const tag = inputValue.value.trim().replace(/,+$/, '')
  if (!tag) return
  if (props.modelValue.length >= MAX_TAGS) return
  if (props.modelValue.includes(tag)) {
    inputValue.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, tag])
  inputValue.value = ''
}

function removeTag(tag: string) {
  emit('update:modelValue', props.modelValue.filter((t) => t !== tag))
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  }
  if (e.key === 'Backspace' && inputValue.value === '' && props.modelValue.length > 0) {
    removeTag(props.modelValue[props.modelValue.length - 1])
  }
}
</script>

<template>
  <div class="space-y-1">
    <label class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
      Tags (max {{ MAX_TAGS }})
    </label>
    <div class="flex flex-wrap gap-1.5 rounded-md border border-input bg-background p-2 min-h-10">
      <Badge
        v-for="tag in modelValue"
        :key="tag"
        variant="secondary"
        class="flex items-center gap-1 cursor-default"
      >
        {{ tag }}
        <button
          type="button"
          class="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5 leading-none"
          @click="removeTag(tag)"
        >
          <span class="sr-only">Remove {{ tag }}</span>
          <svg class="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </Badge>
      <Input
        v-if="modelValue.length < MAX_TAGS"
        v-model="inputValue"
        class="h-6 flex-1 min-w-[100px] border-0 shadow-none p-0 text-sm focus-visible:ring-0"
        placeholder="Add tag, press Enter..."
        @keydown="onKeydown"
        @blur="addTag"
      />
    </div>
    <p class="text-xs text-muted-foreground">{{ modelValue.length }}/{{ MAX_TAGS }} tags</p>
  </div>
</template>
