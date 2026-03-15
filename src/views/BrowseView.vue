<script setup lang="ts">
import { computed, watch } from 'vue'
import { usePromptsStore } from '@/stores/usePromptsStore'
import { useSearchStore } from '@/stores/useSearchStore'
import { usePromptsQuery } from '@/composables/queries/usePromptsQuery'
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import FilterChips from '@/components/browse/FilterChips.vue'
import PromptList from '@/components/browse/PromptList.vue'
import PromptDetail from '@/components/prompt/PromptDetail.vue'
import type { SortOrder } from '@/types/index'

const promptsStore = usePromptsStore()
const searchStore = useSearchStore()

const filterStateRef = computed(() => promptsStore.filterState)
const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
  usePromptsQuery(filterStateRef)

// Flatten all pages into single prompt array
const allPrompts = computed(() => data.value?.pages.flatMap((p) => p.prompts) ?? [])

// Build search index whenever data changes
watch(allPrompts, (prompts) => {
  searchStore.buildIndex(prompts)
})

// Apply client-side sort after search/index filtering
const displayedPrompts = computed(() => {
  const prompts = searchStore.results
  const sort = promptsStore.sortOrder

  return [...prompts].sort((a, b) => {
    if (sort === 'most-voted') {
      const aVotes = a.reactionGroups.find((g) => g.content === 'THUMBS_UP')?.reactors.totalCount ?? 0
      const bVotes = b.reactionGroups.find((g) => g.content === 'THUMBS_UP')?.reactors.totalCount ?? 0
      return bVotes - aVotes
    }
    if (sort === 'most-discussed') {
      return b.commentCount - a.commentCount
    }
    // 'newest' — default GraphQL ordering preserved
    return 0
  })
})

function onLoadMore() {
  if (hasNextPage.value && !isFetchingNextPage.value) {
    fetchNextPage()
  }
}

const sortOptions: Array<{ value: SortOrder; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'most-voted', label: 'Most Voted' },
  { value: 'most-discussed', label: 'Most Commented' },
]
</script>

<template>
  <div class="h-full">
    <!-- Desktop: split pane -->
    <ResizablePanelGroup direction="horizontal" class="h-full hidden lg:flex">
      <ResizablePanel :default-size="38" :min-size="25" :max-size="55">
        <div class="flex flex-col h-full border-r border-white/10">
          <!-- Search + sort toolbar -->
          <div class="flex items-center gap-2 px-3 py-2 border-b border-white/10">
            <Input
              :model-value="searchStore.query"
              placeholder="Search prompts..."
              class="flex-1 h-8 text-xs bg-white/5 border-white/10 focus:border-purple-500/50"
              @update:model-value="searchStore.setQuery($event as string)"
            />
            <Select
              :model-value="promptsStore.sortOrder"
              @update:model-value="(v) => promptsStore.setSortOrder(v as SortOrder)"
            >
              <SelectTrigger class="w-36 h-8 text-xs bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <FilterChips />

          <div class="flex-1 overflow-hidden">
            <PromptList
              :prompts="displayedPrompts"
              :is-loading="isLoading"
              :has-next-page="hasNextPage ?? false"
              :is-fetching-next-page="isFetchingNextPage"
              @load-more="onLoadMore"
            />
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle />

      <ResizablePanel :default-size="62">
        <div class="h-full overflow-hidden">
          <PromptDetail
            v-if="promptsStore.selectedPromptId"
            :prompt-id="promptsStore.selectedPromptId"
          />
          <div v-else class="flex items-center justify-center h-full text-sm text-white/30">
            Select a prompt to view details
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>

    <!-- Mobile: list only -->
    <div class="lg:hidden h-full flex flex-col">
      <div class="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Input
          :model-value="searchStore.query"
          placeholder="Search prompts..."
          class="flex-1 h-8 text-xs bg-white/5 border-white/10"
          @update:model-value="searchStore.setQuery($event as string)"
        />
      </div>
      <FilterChips />
      <div class="flex-1 overflow-hidden">
        <PromptList
          :prompts="displayedPrompts"
          :is-loading="isLoading"
          :has-next-page="hasNextPage ?? false"
          :is-fetching-next-page="isFetchingNextPage"
          @load-more="onLoadMore"
        />
      </div>
    </div>
  </div>
</template>
