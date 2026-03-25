<script setup lang="ts">
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminLog } from '@/composables/queries/useAdminLog'

const { entries, isLoading, dateFrom, dateTo } = useAdminLog()

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div>
    <!-- Date range filter -->
    <div class="mb-4 flex flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="text-sm text-muted-foreground">From</label>
        <input
          v-model="dateFrom"
          type="date"
          class="rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm text-muted-foreground">To</label>
        <input
          v-model="dateTo"
          type="date"
          class="rounded border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <button
        v-if="dateFrom || dateTo"
        class="text-xs text-muted-foreground underline hover:text-foreground"
        @click="dateFrom = ''; dateTo = ''"
      >
        Clear
      </button>
    </div>

    <!-- Log table -->
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-border text-left text-muted-foreground">
            <th class="pb-2 pr-4 font-medium">Timestamp</th>
            <th class="pb-2 pr-4 font-medium">Action</th>
            <th class="pb-2 pr-4 font-medium">Prompt</th>
            <th class="pb-2 font-medium">Maintainer</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading skeleton rows -->
          <tr v-if="isLoading" v-for="i in 5" :key="i" class="border-b border-border">
            <td class="py-3 pr-4"><Skeleton class="h-4 w-32" /></td>
            <td class="py-3 pr-4"><Skeleton class="h-4 w-20" /></td>
            <td class="py-3 pr-4"><Skeleton class="h-4 w-48" /></td>
            <td class="py-3"><Skeleton class="h-4 w-24" /></td>
          </tr>

          <!-- Data rows -->
          <tr
            v-else
            v-for="entry in entries"
            :key="`${entry.issueNumber}-${entry.timestamp}`"
            class="border-b border-border hover:bg-muted/30"
          >
            <td class="py-3 pr-4 text-muted-foreground">{{ formatDate(entry.timestamp) }}</td>
            <td class="py-3 pr-4">
              <span class="font-medium text-foreground">{{ entry.action }}</span>
            </td>
            <td class="py-3 pr-4 text-foreground">{{ entry.promptTitle }}</td>
            <td class="py-3 text-muted-foreground">@{{ entry.maintainerLogin }}</td>
          </tr>

          <!-- Empty state -->
          <tr v-if="!isLoading && entries.length === 0">
            <td colspan="4" class="py-10 text-center text-muted-foreground">
              No moderation actions recorded yet.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
