import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  const sidebarCollapsed = ref(false)
  const notificationDrawerOpen = ref(false)
  const notificationCount = ref(0) // defaults to 0; no API call in Phase 1
  const commandPaletteOpen = ref(false)
  const theme = ref<'dark' | 'light'>('dark')

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function toggleNotificationDrawer() {
    notificationDrawerOpen.value = !notificationDrawerOpen.value
  }

  function openCommandPalette() {
    commandPaletteOpen.value = true
  }

  function closeCommandPalette() {
    commandPaletteOpen.value = false
  }

  function setTheme(newTheme: 'dark' | 'light') {
    theme.value = newTheme
  }

  return {
    sidebarCollapsed,
    notificationDrawerOpen,
    notificationCount,
    commandPaletteOpen,
    theme,
    toggleSidebar,
    toggleNotificationDrawer,
    openCommandPalette,
    closeCommandPalette,
    setTheme,
  }
})
