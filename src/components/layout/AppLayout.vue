<script setup lang="ts">
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import Navbar from '@/components/layout/Navbar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import NotificationDrawer from '@/components/layout/NotificationDrawer.vue'

// Register global keyboard shortcuts for this layout
useKeyboardShortcuts()
</script>

<template>
  <div class="flex flex-col h-screen bg-[#08080f]">
    <Navbar />
    <div class="flex flex-1 overflow-hidden">
      <Sidebar class="hidden lg:flex" />
      <main class="flex-1 overflow-auto bg-[#08080f]">
        <RouterView />
      </main>
    </div>
    <NotificationDrawer />
  </div>
</template>
