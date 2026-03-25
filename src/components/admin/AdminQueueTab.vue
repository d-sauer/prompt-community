<script setup lang="ts">
import { ref, computed } from 'vue'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAdminQueue, type FlaggedIssue } from '@/composables/queries/useAdminQueue'
import { useAdminActions } from '@/composables/queries/useAdminActions'

const { items, isLoading, hasNextPage, fetchNextPage } = useAdminQueue()
const {
  approveMutation,
  hideMutation,
  deleteMutation,
  featureMutation,
  bulkApproveMutation,
  bulkHideMutation,
  bulkDeleteMutation,
} = useAdminActions()

// Single-item delete dialog
const deleteDialogOpen = ref(false)
const itemToDelete = ref<FlaggedIssue | null>(null)

function openDeleteDialog(item: FlaggedIssue) {
  itemToDelete.value = item
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!itemToDelete.value) return
  await deleteMutation.mutateAsync(itemToDelete.value.id)
  deleteDialogOpen.value = false
  itemToDelete.value = null
}

// Bulk selection
const selectedIds = ref<Set<number>>(new Set())

const selectedItems = computed(() =>
  items.value.filter((item) => selectedIds.value.has(item.number)),
)

function toggleSelect(number: number) {
  const next = new Set(selectedIds.value)
  if (next.has(number)) next.delete(number)
  else next.add(number)
  selectedIds.value = next
}

function toggleAll() {
  if (selectedIds.value.size === items.value.length) {
    selectedIds.value = new Set()
  } else {
    selectedIds.value = new Set(items.value.map((i) => i.number))
  }
}

// Bulk delete dialog
const bulkDeleteDialogOpen = ref(false)

async function confirmBulkDelete() {
  const nodeIds = selectedItems.value.map((i) => i.id)
  await bulkDeleteMutation.mutateAsync(nodeIds)
  selectedIds.value = new Set()
  bulkDeleteDialogOpen.value = false
}

async function bulkApprove() {
  await bulkApproveMutation.mutateAsync(
    selectedItems.value.map((i) => ({ issueNumber: i.number, nodeId: i.id })),
  )
  selectedIds.value = new Set()
}

async function bulkHide() {
  await bulkHideMutation.mutateAsync(selectedItems.value.map((i) => i.number))
  selectedIds.value = new Set()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function isFeatured(item: FlaggedIssue) {
  return item.labels.some((l) => l.name === 'status:featured')
}
</script>

<template>
  <div>
    <!-- Bulk action toolbar -->
    <div
      v-show="selectedIds.size > 0"
      class="mb-4 flex items-center gap-3 rounded-lg border border-border bg-muted px-4 py-2"
    >
      <span class="text-sm font-medium text-foreground">{{ selectedIds.size }} selected</span>
      <button
        class="rounded border border-border bg-background px-3 py-1 text-sm hover:bg-muted"
        :disabled="bulkApproveMutation.isPending.value"
        @click="bulkApprove"
      >
        Approve All
      </button>
      <button
        class="rounded border border-border bg-background px-3 py-1 text-sm hover:bg-muted"
        :disabled="bulkHideMutation.isPending.value"
        @click="bulkHide"
      >
        Hide All
      </button>
      <button
        class="rounded border border-destructive bg-destructive/10 px-3 py-1 text-sm text-destructive hover:bg-destructive/20"
        :disabled="bulkDeleteMutation.isPending.value"
        @click="bulkDeleteDialogOpen = true"
      >
        Delete All
      </button>
    </div>

    <!-- Queue table -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-border text-left text-muted-foreground">
            <th class="w-8 pb-2 pr-3">
              <input
                type="checkbox"
                :checked="selectedIds.size === items.length && items.length > 0"
                :indeterminate="selectedIds.size > 0 && selectedIds.size < items.length"
                @change="toggleAll"
              />
            </th>
            <th class="pb-2 pr-4 font-medium">Title</th>
            <th class="pb-2 pr-4 font-medium">Author</th>
            <th class="pb-2 pr-4 font-medium">Created</th>
            <th class="pb-2 pr-4 font-medium">Labels</th>
            <th class="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton rows -->
          <tr v-if="isLoading" v-for="i in 5" :key="i" class="border-b border-border">
            <td class="py-3 pr-3"><Skeleton class="h-4 w-4" /></td>
            <td class="py-3 pr-4"><Skeleton class="h-4 w-48" /></td>
            <td class="py-3 pr-4"><Skeleton class="h-4 w-24" /></td>
            <td class="py-3 pr-4"><Skeleton class="h-4 w-20" /></td>
            <td class="py-3 pr-4"><Skeleton class="h-4 w-24" /></td>
            <td class="py-3"><Skeleton class="h-4 w-32" /></td>
          </tr>
          <!-- Data rows -->
          <tr
            v-else
            v-for="item in items"
            :key="item.number"
            class="border-b border-border hover:bg-muted/30"
          >
            <td class="py-3 pr-3">
              <input
                type="checkbox"
                :checked="selectedIds.has(item.number)"
                @change="toggleSelect(item.number)"
              />
            </td>
            <td class="py-3 pr-4">
              <span class="font-medium text-foreground">{{ item.title }}</span>
            </td>
            <td class="py-3 pr-4 text-muted-foreground">{{ item.author.login }}</td>
            <td class="py-3 pr-4 text-muted-foreground">{{ formatDate(item.createdAt) }}</td>
            <td class="py-3 pr-4">
              <div class="flex flex-wrap gap-1">
                <Badge
                  v-for="label in item.labels"
                  :key="label.name"
                  variant="outline"
                  class="text-xs"
                  :style="{ borderColor: `#${label.color}`, color: `#${label.color}` }"
                >
                  {{ label.name }}
                </Badge>
              </div>
            </td>
            <td class="py-3">
              <div class="flex items-center gap-1">
                <button
                  class="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  :disabled="approveMutation.isPending.value"
                  @click="approveMutation.mutate({ issueNumber: item.number, nodeId: item.id })"
                >
                  Approve
                </button>
                <button
                  class="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  :disabled="hideMutation.isPending.value"
                  @click="hideMutation.mutate({ issueNumber: item.number })"
                >
                  Hide
                </button>
                <button
                  class="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
                  :disabled="featureMutation.isPending.value"
                  :title="isFeatured(item) ? 'Unfeature' : 'Feature'"
                  @click="featureMutation.mutate({ issueNumber: item.number, currentLabels: item.labels })"
                >
                  {{ isFeatured(item) ? '★' : '☆' }}
                </button>
                <button
                  class="rounded border border-destructive/50 px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                  @click="openDeleteDialog(item)"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
          <!-- Empty state -->
          <tr v-if="!isLoading && items.length === 0">
            <td colspan="6" class="py-10 text-center text-muted-foreground">
              No flagged prompts in the queue.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div v-if="!isLoading && items.length > 0" class="mt-4 flex justify-end">
      <button
        v-if="hasNextPage"
        class="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
        @click="fetchNextPage()"
      >
        Load More
      </button>
    </div>

    <!-- Single delete dialog -->
    <Dialog :open="deleteDialogOpen" @update:open="deleteDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Prompt</DialogTitle>
          <DialogDescription>
            Delete this prompt permanently? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            class="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
            @click="deleteDialogOpen = false"
          >
            Cancel
          </button>
          <button
            class="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
            :disabled="deleteMutation.isPending.value"
            @click="confirmDelete"
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Bulk delete dialog -->
    <Dialog :open="bulkDeleteDialogOpen" @update:open="bulkDeleteDialogOpen = $event">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {{ selectedIds.size }} Prompts</DialogTitle>
          <DialogDescription>
            Delete {{ selectedIds.size }} prompt{{ selectedIds.size !== 1 ? 's' : '' }} permanently? This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            class="rounded border border-border px-4 py-2 text-sm hover:bg-muted"
            @click="bulkDeleteDialogOpen = false"
          >
            Cancel
          </button>
          <button
            class="rounded bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:bg-destructive/90"
            :disabled="bulkDeleteMutation.isPending.value"
            @click="confirmBulkDelete"
          >
            Delete All
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
