<script setup lang="ts">
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { VersionObject } from '@/types/index'
import { format } from 'date-fns'
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  version: VersionObject | null
  onConfirm: () => void
  isPending?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const formattedDate = computed(() => {
  if (!props.version) return ''
  return format(props.version.date, 'MMM d, yyyy')
})

function handleCancel() {
  emit('update:open', false)
}

function handleConfirm() {
  props.onConfirm()
  emit('update:open', false)
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Restore Version {{ version?.version }}?</DialogTitle>
        <DialogDescription>
          This will create a new version (Version {{ version ? version.version + 1 : '' }}) with
          the content from Version {{ version?.version }} on {{ formattedDate }}. The current
          version is not deleted.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" @click="handleCancel">Cancel</Button>
        <Button :disabled="isPending" @click="handleConfirm">
          {{ isPending ? 'Restoring...' : 'Restore' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
