<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { useDraftStore } from '@/stores/useDraftStore'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import MarkdownEditor from '@/components/editor/MarkdownEditor.vue'
import MetadataFields from '@/components/editor/MetadataFields.vue'
import TagsInput from '@/components/editor/TagsInput.vue'
import ImageUploadZone from '@/components/editor/ImageUploadZone.vue'
import PreviewPane from '@/components/editor/PreviewPane.vue'
import StatusBadge from '@/components/editor/StatusBadge.vue'
import type { PromptFrontmatter } from '@/lib/frontmatter'

const props = defineProps<{
  title: string
  content: string
  metadata: Partial<PromptFrontmatter>
  tags: string[]
  isPublishing?: boolean
  publishLabel?: string
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:content': [value: string]
  'update:metadata': [value: Partial<PromptFrontmatter>]
  'update:tags': [tags: string[]]
  'publish': []
}>()

const draftStore = useDraftStore()

// Prevent browser back/close with unsaved changes (Pitfall 4 — browser navigation)
useEventListener(window, 'beforeunload', (e) => {
  if (draftStore.isDirty) {
    e.preventDefault()
    e.returnValue = ''
  }
})

function insertMarkdown(text: string) {
  // Append markdown at end of content (cursor position tracking would require editor ref)
  emit('update:content', props.content + '\n' + text)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
      <div class="flex items-center gap-3 min-w-0">
        <input
          :value="title"
          class="text-lg font-semibold bg-transparent border-0 outline-none focus:outline-none min-w-0 flex-1 truncate placeholder:text-muted-foreground"
          placeholder="Prompt title..."
          @input="emit('update:title', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="flex items-center gap-3 shrink-0 ml-4">
        <StatusBadge :is-saving="isPublishing" />
        <Button
          :disabled="isPublishing"
          @click="emit('publish')"
        >
          {{ publishLabel ?? 'Publish' }}
        </Button>
      </div>
    </div>

    <!-- Desktop: ResizablePanelGroup split pane -->
    <div class="flex-1 hidden md:block overflow-hidden">
      <ResizablePanelGroup direction="horizontal" class="h-full">
        <ResizablePanel :default-size="50" :min-size="30">
          <div class="flex flex-col h-full gap-3 p-3 overflow-auto">
            <MetadataFields
              :model-value="metadata"
              @update:model-value="emit('update:metadata', $event)"
            />
            <TagsInput
              :model-value="tags"
              @update:model-value="emit('update:tags', $event)"
            />
            <div class="flex-1 min-h-[300px]">
              <ImageUploadZone @insert-markdown="insertMarkdown">
                <MarkdownEditor
                  :model-value="content"
                  @update:model-value="emit('update:content', $event)"
                />
              </ImageUploadZone>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel :default-size="50" :min-size="25">
          <PreviewPane :content="content" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>

    <!-- Mobile: Tabs for Write/Preview -->
    <div class="flex-1 md:hidden overflow-hidden">
      <Tabs default-value="write" class="h-full flex flex-col">
        <TabsList class="mx-3 mt-2 shrink-0">
          <TabsTrigger value="write">Write</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="write" class="flex-1 overflow-auto p-3 space-y-3">
          <MetadataFields
            :model-value="metadata"
            @update:model-value="emit('update:metadata', $event)"
          />
          <TagsInput
            :model-value="tags"
            @update:model-value="emit('update:tags', $event)"
          />
          <ImageUploadZone @insert-markdown="insertMarkdown">
            <MarkdownEditor
              :model-value="content"
              @update:model-value="emit('update:content', $event)"
            />
          </ImageUploadZone>
        </TabsContent>
        <TabsContent value="preview" class="flex-1 overflow-hidden">
          <PreviewPane :content="content" />
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>
