<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/useUIStore'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { X, Bell } from 'lucide-vue-next'

const uiStore = useUIStore()
const { notificationDrawerOpen, notificationCount } = storeToRefs(uiStore)
</script>

<template>
  <Sheet :open="notificationDrawerOpen" @update:open="notificationDrawerOpen = $event">
    <SheetContent side="right" class="w-80 bg-[#0d0d12] border-l border-[#2a2a3a]">
      <SheetHeader class="flex flex-row items-center justify-between border-b border-[#2a2a3a] pb-4">
        <SheetTitle class="text-white text-base font-semibold">
          Notifications
          <span
            v-if="notificationCount > 0"
            data-testid="notification-badge"
            class="ml-2 inline-flex items-center justify-center rounded-full bg-[#7c3aed] text-white text-xs w-5 h-5"
          >{{ notificationCount }}</span>
        </SheetTitle>
        <SheetClose as-child>
          <Button
            variant="ghost"
            size="icon"
            class="text-[#8888a4] hover:text-white"
            @click="uiStore.toggleNotificationDrawer()"
          >
            <X class="size-4" />
          </Button>
        </SheetClose>
      </SheetHeader>

      <div
        aria-live="polite"
        class="flex flex-col items-center justify-center h-48 gap-3 text-[#8888a4]"
      >
        <Bell class="size-8 opacity-40" />
        <p class="text-sm">No notifications yet</p>
      </div>
    </SheetContent>
  </Sheet>
</template>
