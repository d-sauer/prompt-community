<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { usePromptVersions } from '@/composables/queries/usePromptVersions'
import { useRestoreVersion } from '@/composables/queries/useRestoreVersion'
import { useUIStore } from '@/stores/useUIStore'
import VersionList from '@/components/versions/VersionList.vue'
import DiffView from '@/components/versions/DiffView.vue'
import RestoreDialog from '@/components/versions/RestoreDialog.vue'
import type { VersionObject } from '@/types/index'

const route = useRoute()
const router = useRouter()
const uiStore = useUIStore()

const issueId = computed(() => {
  const id = Number(route.params.id)
  return isNaN(id) ? null : id
})

const { data: versions, isLoading } = usePromptVersions(issueId)

const selectedA = ref<VersionObject | null>(null)
const selectedB = ref<VersionObject | null>(null)
const showRestoreDialog = ref(false)
const restoreTarget = ref<VersionObject | null>(null)

const maxVersion = computed(() => {
  if (!versions.value || versions.value.length === 0) return 0
  return Math.max(...versions.value.map((v) => v.version))
})

const restoreMutation = useRestoreVersion()

function handleSelectA(version: VersionObject) {
  selectedA.value = version
  selectedB.value = null
}

function handleSelectB(version: VersionObject) {
  selectedB.value = version
}

function handleRestore(version: VersionObject) {
  restoreTarget.value = version
  showRestoreDialog.value = true
}

async function confirmRestore() {
  if (!restoreTarget.value || !issueId.value) return
  const newVersionNumber = maxVersion.value + 1
  try {
    await restoreMutation.mutateAsync({
      issueNumber: issueId.value,
      targetVersion: restoreTarget.value,
      newVersionNumber,
    })
    showRestoreDialog.value = false
    toast.success(`Version restored as Version ${newVersionNumber}`)
  } catch (error) {
    toast.error('Failed to restore version. Please try again.')
  }
}

function toggleLayout() {
  uiStore.diffLayout = uiStore.diffLayout === 'side-by-side' ? 'unified' : 'side-by-side'
}

function goBack() {
  void router.push(`/prompts/${route.params.id}`)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="sm" @click="goBack">← Back to prompt</Button>
        <h1 class="text-lg font-semibold">Version History</h1>
      </div>
      <Button variant="outline" size="sm" @click="toggleLayout">
        {{ uiStore.diffLayout === 'side-by-side' ? 'Unified' : 'Side by Side' }}
      </Button>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex gap-4 p-4 flex-1">
      <div class="w-72 space-y-3">
        <Skeleton class="h-20 w-full rounded" />
        <Skeleton class="h-20 w-full rounded" />
        <Skeleton class="h-20 w-full rounded" />
      </div>
      <Skeleton class="flex-1 rounded" />
    </div>

    <!-- Main content -->
    <div v-else class="flex flex-1 overflow-hidden">
      <!-- Left panel: version list -->
      <div class="w-72 shrink-0 border-r overflow-y-auto">
        <VersionList
          :versions="versions ?? []"
          :selected-a="selectedA"
          :selected-b="selectedB"
          @select-a="handleSelectA"
          @select-b="handleSelectB"
          @restore="handleRestore"
        />
      </div>

      <!-- Right panel: diff view -->
      <div class="flex-1 overflow-hidden">
        <DiffView
          :version-a="selectedA"
          :version-b="selectedB"
          :layout="uiStore.diffLayout"
        />
      </div>
    </div>

    <!-- Restore dialog -->
    <RestoreDialog
      :open="showRestoreDialog"
      :version="restoreTarget"
      :is-pending="restoreMutation.isPending.value"
      :on-confirm="confirmRestore"
      @update:open="showRestoreDialog = $event"
    />
  </div>
</template>
