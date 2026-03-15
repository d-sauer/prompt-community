<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { useDraftStore } from '@/stores/useDraftStore'
import { usePromptDetail } from '@/composables/queries/usePromptDetail'
import { useCreatePrompt } from '@/composables/queries/useCreatePrompt'
import { useUpdatePrompt } from '@/composables/queries/useUpdatePrompt'
import EditorLayout from '@/components/editor/EditorLayout.vue'
import { toast } from 'vue-sonner'
import type { PromptFrontmatter } from '@/lib/frontmatter'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const draftStore = useDraftStore()

// Determine editor mode
const mode = computed<'create' | 'edit' | 'fork'>(() => {
  if (route.name === 'prompt-edit') return 'edit'
  if (route.query.fork) return 'fork'
  return 'create'
})

// Auth guard — redirect if not authenticated
if (!authStore.isAuthenticated) {
  void router.push('/browse')
}

// Prompt ID for edit mode
const promptId = computed<number | null>(() => {
  if (mode.value === 'edit' && route.params.id) {
    return Number(route.params.id)
  }
  return null
})

// Fork source ID
const forkSourceId = computed<number | null>(() => {
  if (mode.value === 'fork' && route.query.fork) {
    return Number(route.query.fork)
  }
  return null
})

// Load existing prompt for edit/fork pre-fill
const sourceId = computed(() => promptId.value ?? forkSourceId.value)
const { data: sourcePrompt } = usePromptDetail(sourceId as Parameters<typeof usePromptDetail>[0])

// Mutations
const createPrompt = useCreatePrompt()
const updatePrompt = useUpdatePrompt()

const isPublishing = computed(
  () => createPrompt.isPending.value || updatePrompt.isPending.value,
)

// Pre-fill editor from source prompt (edit or fork mode)
watch(sourcePrompt, (prompt) => {
  if (!prompt) return

  if (mode.value === 'edit') {
    // Edit: pre-fill with existing content
    draftStore.title = prompt.title
    draftStore.content = prompt.body
    draftStore.metadata = { ...prompt.frontmatter }
    draftStore.tags = [...(prompt.frontmatter.tags ?? [])]
  } else if (mode.value === 'fork') {
    // Fork: pre-fill but reset version to 1, clear author-specific fields
    draftStore.title = `Fork of ${prompt.title}`
    draftStore.content = prompt.body
    draftStore.metadata = {
      ...prompt.frontmatter,
      version: 1,
      changelog: undefined,
    }
    draftStore.tags = [...(prompt.frontmatter.tags ?? [])]
  }
}, { immediate: true })

// On mount: try to recover local draft for this prompt
onMounted(() => {
  draftStore.recover(promptId.value ?? undefined)
})

// Validate required fields before publish
function validate(): boolean {
  if (!draftStore.title.trim()) {
    toast.error('Title is required')
    return false
  }
  if (!draftStore.content.trim()) {
    toast.error('Content is required')
    return false
  }
  if (!draftStore.metadata.category) {
    toast.error('Category is required')
    return false
  }
  return true
}

// Build PromptFrontmatter for submission
function buildMetadata(): PromptFrontmatter {
  return {
    type: draftStore.metadata.type ?? 'prompt',
    category: draftStore.metadata.category ?? '',
    model: draftStore.metadata.model ?? '',
    difficulty: draftStore.metadata.difficulty ?? 'beginner',
    tags: draftStore.tags,
    version: draftStore.metadata.version ?? 1,
  }
}

async function handlePublish() {
  if (!validate()) return

  try {
    if (mode.value === 'create' || mode.value === 'fork') {
      await createPrompt.mutateAsync({
        title: draftStore.title,
        content: draftStore.content,
        metadata: buildMetadata(),
        tags: draftStore.tags,
      })
    } else if (mode.value === 'edit' && promptId.value) {
      const currentVersion = sourcePrompt.value?.frontmatter.version ?? 1
      await updatePrompt.mutateAsync({
        mode: 'version',
        issueNumber: promptId.value,
        title: draftStore.title,
        content: draftStore.content,
        metadata: buildMetadata(),
        tags: draftStore.tags,
        versionNumber: currentVersion + 1,
        changelog: '',
      })
      void router.push(`/prompts/${promptId.value}`)
    }
  } catch (err) {
    toast.error(`Failed to publish: ${err instanceof Error ? err.message : 'unknown error'}`)
  }
}

const publishLabel = computed(() => {
  if (isPublishing.value) return 'Publishing...'
  if (mode.value === 'edit') return 'Publish Update'
  if (mode.value === 'fork') return 'Publish Fork'
  return 'Publish'
})
</script>

<template>
  <div class="h-full flex flex-col">
    <EditorLayout
      :title="draftStore.title"
      :content="draftStore.content"
      :metadata="draftStore.metadata"
      :tags="draftStore.tags"
      :is-publishing="isPublishing"
      :publish-label="publishLabel"
      @update:title="draftStore.title = $event"
      @update:content="draftStore.content = $event"
      @update:metadata="draftStore.metadata = $event"
      @update:tags="draftStore.tags = $event"
      @publish="handlePublish"
    />
  </div>
</template>
