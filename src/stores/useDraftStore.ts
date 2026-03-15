import { defineStore } from 'pinia'
import { ref, watch, nextTick } from 'vue'
import { useLocalStorage, useInterval } from '@vueuse/core'
import type { PromptFrontmatter } from '@/lib/frontmatter'

export interface DraftContent {
  title: string
  content: string
  metadata: Partial<PromptFrontmatter>
  tags: string[]
}

export const useDraftStore = defineStore('draft', () => {
  const draftKey = ref<string>('draft:new')

  const title = ref<string>('')
  const content = ref<string>('')
  const metadata = ref<Partial<PromptFrontmatter>>({})
  const tags = ref<string[]>([])
  const isDirty = ref<boolean>(false)
  const lastSaved = ref<Date | null>(null)
  // Flag to suppress watch during recover/clear operations
  let suppressDirty = false

  // useLocalStorage syncs with localStorage automatically
  const persistedDraft = useLocalStorage<Partial<DraftContent>>(draftKey, {})

  // Mark dirty when any field changes (suppressed during recover/clear)
  watch([title, content, metadata, tags], () => {
    if (!suppressDirty) {
      isDirty.value = true
    }
  }, { deep: true })

  function save(): void {
    persistedDraft.value = {
      title: title.value,
      content: content.value,
      metadata: metadata.value,
      tags: tags.value,
    }
    lastSaved.value = new Date()
    isDirty.value = false
  }

  function recover(promptId?: number): void {
    // Update draftKey based on whether we're editing an existing prompt
    draftKey.value = promptId ? `draft:${promptId}` : 'draft:new'

    // Restore from persisted draft if available
    const saved = persistedDraft.value
    if (saved && Object.keys(saved).length > 0) {
      suppressDirty = true
      if (saved.title !== undefined) title.value = saved.title
      if (saved.content !== undefined) content.value = saved.content
      if (saved.metadata !== undefined) metadata.value = saved.metadata
      if (saved.tags !== undefined) tags.value = saved.tags
      // Reset dirty after next tick (watch fires async)
      void nextTick(() => {
        isDirty.value = false
        suppressDirty = false
      })
    }
  }

  function clear(): void {
    suppressDirty = true
    persistedDraft.value = {}
    title.value = ''
    content.value = ''
    metadata.value = {}
    tags.value = []
    lastSaved.value = null
    isDirty.value = false
    void nextTick(() => {
      suppressDirty = false
    })
  }

  // Auto-save every 30 seconds
  useInterval(save, 30_000)

  return {
    draftKey,
    title,
    content,
    metadata,
    tags,
    isDirty,
    lastSaved,
    save,
    recover,
    clear,
  }
})
