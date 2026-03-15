<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from 'vue-sonner'

const emit = defineEmits<{
  'insert-markdown': [text: string]
}>()

const authStore = useAuthStore()
const isDragOver = ref(false)

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

async function uploadFile(file: File) {
  if (!authStore.isAuthenticated || !authStore.token) {
    toast.error('Image upload requires sign-in')
    return
  }

  // Client-side validation
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error(`Unsupported file type: ${file.type}. Use PNG, JPG, GIF, or WebP.`)
    return
  }

  if (file.size > MAX_SIZE_BYTES) {
    toast.error('File exceeds 10MB limit')
    return
  }

  const workerUrl = import.meta.env.VITE_CF_WORKER_URL as string
  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(`${workerUrl}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `token ${authStore.token}`,
      },
      body: formData,
    })

    if (response.status === 401) {
      toast.error('Image upload requires sign-in')
      return
    }

    if (!response.ok) {
      const data = await response.json() as { error?: string }
      toast.error(data.error ?? 'Upload failed')
      return
    }

    const data = await response.json() as { url: string }
    const alt = file.name.replace(/\.[^.]+$/, '')
    const markdownLink = `![${alt}](${data.url})`
    emit('insert-markdown', markdownLink)
    toast.success('Image uploaded')
  } catch {
    toast.error('Upload failed — check your connection')
  }
}

function onDragover(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function onDragleave() {
  isDragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) void uploadFile(file)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) void uploadFile(file)
  // Reset input so same file can be uploaded again
  input.value = ''
}

// Expose trigger for programmatic file picker open
const fileInputRef = ref<HTMLInputElement | null>(null)
function openFilePicker() {
  fileInputRef.value?.click()
}

defineExpose({ openFilePicker })
</script>

<template>
  <div
    class="relative"
    :class="isDragOver ? 'ring-2 ring-primary ring-offset-1 rounded-md' : ''"
    @dragover="onDragover"
    @dragleave="onDragleave"
    @drop="onDrop"
  >
    <slot />

    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      class="sr-only"
      @change="onFileInput"
    />

    <!-- Drag overlay -->
    <div
      v-if="isDragOver"
      class="absolute inset-0 flex items-center justify-center rounded-md bg-primary/10 border-2 border-dashed border-primary pointer-events-none"
    >
      <p class="text-sm font-medium text-primary">Drop image to upload</p>
    </div>
  </div>
</template>
