<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-vue-next'
import { useUserProfile } from '@/composables/queries/useUserProfile'
import { useBookmarksStore } from '@/stores/useBookmarksStore'
import type { Prompt } from '@/types/index'

const props = defineProps<{
  login: string
  isOwnProfile: boolean
}>()

const router = useRouter()
const queryClient = useQueryClient()
const loginRef = toRef(props, 'login')
const { submissions } = useUserProfile(loginRef)
const bookmarksStore = useBookmarksStore()

// Resolve bookmarked IDs to prompt data from cache
const bookmarkedPrompts = computed(() =>
  bookmarksStore.bookmarkedIds.map((id) => {
    const cached = queryClient.getQueryData<Prompt>(['prompt', id])
    return { id, title: cached?.title ?? `Prompt #${id}` }
  }),
)

function removeBookmark(id: number) {
  bookmarksStore.toggle(id)
}
</script>

<template>
  <Tabs default-value="submitted" class="w-full">
    <TabsList class="bg-white/5 border border-white/10">
      <TabsTrigger value="submitted" class="text-xs">Submitted</TabsTrigger>
      <template v-if="isOwnProfile">
        <TabsTrigger value="saved" class="text-xs">Saved</TabsTrigger>
        <TabsTrigger value="activity" class="text-xs">Activity</TabsTrigger>
      </template>
    </TabsList>

    <!-- Submitted tab -->
    <TabsContent value="submitted" class="mt-4">
      <div v-if="submissions.length === 0" class="text-sm text-white/40 py-4">
        No submissions yet.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="submission in submissions"
          :key="submission.number"
          class="flex items-center gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            class="text-xs text-white/80 hover:text-white justify-start px-0"
            @click="router.push({ name: 'prompt-detail', params: { id: submission.number } })"
          >
            {{ submission.title }}
          </Button>
        </li>
      </ul>
    </TabsContent>

    <!-- Saved tab (own profile only) -->
    <TabsContent v-if="isOwnProfile" value="saved" class="mt-4">
      <div v-if="bookmarkedPrompts.length === 0" class="text-sm text-white/40 py-4">
        No saved prompts yet.
      </div>
      <ul v-else class="space-y-2">
        <li
          v-for="item in bookmarkedPrompts"
          :key="item.id"
          class="flex items-center justify-between gap-2"
        >
          <Button
            variant="ghost"
            size="sm"
            class="text-xs text-white/80 hover:text-white justify-start px-0"
            @click="router.push({ name: 'prompt-detail', params: { id: item.id } })"
          >
            {{ item.title }}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 text-white/40 hover:text-white/80"
            @click="removeBookmark(item.id)"
          >
            <Bookmark class="w-3.5 h-3.5" />
          </Button>
        </li>
      </ul>
    </TabsContent>

    <!-- Activity tab (own profile only) -->
    <TabsContent v-if="isOwnProfile" value="activity" class="mt-4">
      <p class="text-sm text-white/40 py-4">Activity coming soon.</p>
    </TabsContent>
  </Tabs>
</template>
