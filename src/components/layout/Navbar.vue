<script setup lang="ts">
import { watch } from 'vue'
import { useDark } from '@vueuse/core'
import { RouterLink, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import { useSearchStore } from '@/stores/useSearchStore'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem,
} from '@/components/ui/command'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Bell, Search, Menu, Plus, Moon, Sun } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const uiStore = useUIStore()
const searchStore = useSearchStore()

const { isAuthenticated, user } = storeToRefs(authStore)
const { commandPaletteOpen, notificationCount } = storeToRefs(uiStore)
const { query: searchQuery, results: searchResults } = storeToRefs(searchStore)

const isDark = useDark()

const CATEGORY_COLORS: Record<string, string> = {
  Coding:   '#3b82f6',
  Writing:  '#10b981',
  Analysis: '#f59e0b',
  Creative: '#ec4899',
  System:   '#8b5cf6',
  Other:    '#6b7280',
}

function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Other
}

function onCommandInput(e: Event) {
  searchStore.setQuery((e.target as HTMLInputElement).value)
}

function onSelectResult(prompt: { id: number | string; title: string; frontmatter: { category: string } }) {
  searchStore.setQuery('')
  uiStore.closeCommandPalette()
  router.push(`/prompts/${prompt.id}`)
}

watch(commandPaletteOpen, (open) => {
  if (!open) searchStore.setQuery('')
})

function openMobileSidebar() {
  uiStore.sidebarMobileOpen = true
}
</script>

<template>
  <nav
    class="fixed top-0 left-0 right-0 z-10 flex items-center h-12 px-4 gap-3 bg-[#13131a] border-b border-[#2a2a3a]"
    aria-label="Main navigation"
  >
    <!-- Mobile hamburger -->
    <Button
      variant="ghost"
      size="icon"
      class="lg:hidden text-[#8888a4] hover:text-white"
      aria-label="Open sidebar"
      @click="openMobileSidebar"
    >
      <Menu class="size-4" />
    </Button>

    <!-- Logo + Site name -->
    <RouterLink
      to="/browse"
      class="flex items-center gap-2 shrink-0"
      aria-label="AI Prompt Community home"
    >
      <span class="size-6 rounded bg-[#4c1d95] flex items-center justify-center">
        <span class="text-white text-xs font-bold">A</span>
      </span>
      <span class="hidden lg:block text-white text-sm font-semibold tracking-tight">
        AI Prompt Community
      </span>
    </RouterLink>

    <!-- Search bar (desktop) / icon (mobile) -->
    <div class="flex-1 max-w-lg mx-auto">
      <!-- Desktop: full search trigger -->
      <button
        class="hidden lg:flex w-full items-center gap-2 px-3 py-1.5 rounded-md bg-[#1a1a27] border border-[#2a2a3a] text-[#8888a4] text-sm hover:border-[#4c1d95] transition-colors"
        @click="uiStore.openCommandPalette()"
      >
        <Search class="size-3.5 shrink-0" />
        <span class="flex-1 text-left">Search prompts...</span>
        <kbd class="hidden sm:inline text-xs bg-[#0d0d12] px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
      <!-- Mobile: icon only -->
      <Button
        variant="ghost"
        size="icon"
        class="lg:hidden text-[#8888a4] hover:text-white"
        aria-label="Search"
        @click="uiStore.openCommandPalette()"
      >
        <Search class="size-4" />
      </Button>
    </div>

    <!-- Right section -->
    <div class="flex items-center gap-1.5">
      <!-- Theme toggle -->
      <Button
        variant="ghost"
        size="icon"
        class="text-[#8888a4] hover:text-white"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="isDark = !isDark"
      >
        <Sun v-if="isDark" class="size-4" />
        <Moon v-else class="size-4" />
      </Button>

      <!-- Notification bell -->
      <Button
        variant="ghost"
        size="icon"
        class="relative text-[#8888a4] hover:text-white"
        aria-label="Notifications"
        @click="uiStore.toggleNotificationDrawer()"
      >
        <Bell class="size-4" />
        <Badge
          v-if="notificationCount > 0"
          class="absolute -top-1 -right-1 size-4 p-0 flex items-center justify-center text-[10px] bg-[#7c3aed] border-0"
        >
          {{ notificationCount }}
        </Badge>
      </Button>

      <!-- +New button (authenticated, desktop label / mobile icon only) -->
      <Button
        v-if="isAuthenticated"
        size="sm"
        class="bg-[#4c1d95] text-white hover:bg-[#5b21b6]"
        @click="router.push('/prompts/new')"
      >
        <Plus class="size-4" />
        <span class="hidden lg:inline">New</span>
      </Button>

      <!-- Avatar + Dropdown (authenticated) -->
      <DropdownMenu v-if="isAuthenticated">
        <DropdownMenuTrigger as-child>
          <button
            class="rounded-full focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
            aria-label="User menu"
          >
            <Avatar class="size-8 bg-[#4c1d95] ring-1 ring-[#7c3aed]">
              <AvatarImage
                v-if="user?.avatarUrl"
                :src="user.avatarUrl"
                :alt="user?.login ?? 'User'"
              />
              <AvatarFallback class="bg-[#4c1d95] text-white text-xs">
                {{ user?.login?.[0]?.toUpperCase() ?? '?' }}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          class="bg-[#0d0d12] border-[#2a2a3a] text-white w-40"
        >
          <DropdownMenuItem
            class="hover:bg-[#1a1a27] cursor-pointer"
            @click="router.push('/profile')"
          >
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            class="hover:bg-[#1a1a27] cursor-pointer text-[#ef4444]"
            @click="authStore.logout()"
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <!-- Sign in (unauthenticated) -->
      <Button
        v-if="!isAuthenticated"
        size="sm"
        variant="outline"
        class="border-[#2a2a3a] text-white hover:bg-[#1a1a27] text-xs"
        @click="authStore.login()"
      >
        Sign in with GitHub
      </Button>
    </div>

    <!-- Command dialog (palette) -->
    <CommandDialog v-model:open="commandPaletteOpen">
      <CommandInput
        placeholder="Search prompts..."
        @input="onCommandInput"
      />
      <CommandList>
        <template v-if="searchQuery.trim()">
          <CommandItem
            v-for="prompt in searchResults.slice(0, 8)"
            :key="prompt.id"
            :value="prompt.title"
            @select="onSelectResult(prompt)"
          >
            <span
              class="size-2 rounded-full shrink-0"
              :style="{ backgroundColor: categoryColor(prompt.frontmatter?.category ?? '') }"
            />
            <span class="font-medium flex-1 truncate">{{ prompt.title }}</span>
            <span class="text-muted-foreground text-xs ml-auto shrink-0">{{ prompt.frontmatter?.category }}</span>
          </CommandItem>
          <CommandEmpty v-if="searchResults.length === 0">No results found.</CommandEmpty>
        </template>
        <template v-else>
          <div class="py-6 text-center text-sm text-muted-foreground">Type to search prompts...</div>
        </template>
      </CommandList>
    </CommandDialog>
  </nav>

  <!-- Spacer to push content below fixed navbar -->
  <div class="h-12" aria-hidden="true" />
</template>
