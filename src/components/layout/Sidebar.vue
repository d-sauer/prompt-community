<script setup lang="ts">
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUIStore } from '@/stores/useUIStore'
import { usePromptsStore } from '@/stores/usePromptsStore'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import {
  LayoutGrid,
  TrendingUp,
  Clock,
  ChevronLeft,
  AlignJustify,
  Shield,
  Tag,
} from 'lucide-vue-next'
import type { SortOrder } from '@/types/index'

const route = useRoute()
const authStore = useAuthStore()
const uiStore = useUIStore()
const promptsStore = usePromptsStore()

const { isMaintainer } = storeToRefs(authStore)
const { sidebarCollapsed, sidebarMobileOpen } = storeToRefs(uiStore)
const { filterState, sortOrder } = storeToRefs(promptsStore)

// APP VERSION — defined in vite.config.ts
declare const __APP_VERSION__: string
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

// ============================================================
// NAV DATA
// ============================================================

const browseItems = [
  { label: 'All Prompts', path: '/browse', icon: LayoutGrid },
  { label: 'Trending', path: '/browse?sort=most-voted', icon: TrendingUp },
  { label: 'Recent', path: '/browse?sort=newest', icon: Clock },
]

const categories = [
  { name: 'Coding', color: '#3b82f6' },
  { name: 'Writing', color: '#10b981' },
  { name: 'Analysis', color: '#f59e0b' },
  { name: 'Creative', color: '#ec4899' },
  { name: 'System', color: '#8b5cf6' },
  { name: 'Other', color: '#6b7280' },
]

const aiModels = ['GPT-4', 'Claude', 'Gemini', 'Llama', 'Other']

const sortOptions: { label: string; value: SortOrder }[] = [
  { label: 'Most Voted', value: 'most-voted' },
  { label: 'Newest', value: 'newest' },
  { label: 'Most Discussed', value: 'most-discussed' },
]

// ============================================================
// ACTIVE STATE
// ============================================================

function isBrowseActive(path: string): boolean {
  if (path === '/browse') {
    return route.path === '/browse' && !route.query.sort
  }
  return route.fullPath === path
}

function isCategoryActive(name: string): boolean {
  return filterState.value.category === name
}

function isModelActive(name: string): boolean {
  return filterState.value.model === name
}

function isSortActive(value: SortOrder): boolean {
  return sortOrder.value === value
}

// ============================================================
// ITEM CLASS HELPERS
// ============================================================

const baseItem = 'flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer transition-colors w-full text-left rounded-none'
const activeItem = 'bg-[#1e1b4b] border-l-[3px] border-[#7c3aed] text-[#c4b5fd]'
const inactiveItem = 'border-l-[3px] border-transparent text-[#8888a4] hover:bg-[#1a1a27] hover:text-white'

function itemClass(active: boolean): string {
  return `${baseItem} ${active ? activeItem : inactiveItem}`
}

// ============================================================
// SECTION LABEL CLASS
// ============================================================
const sectionLabel = 'px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#555570]'
</script>

<template>
  <TooltipProvider :delay-duration="100">
    <!-- Desktop inline sidebar -->
    <aside
      :class="[
        'flex flex-col border-r border-[#2a2a3a] bg-[#0d0d12] overflow-hidden transition-[width] duration-300 shrink-0',
        sidebarCollapsed ? 'w-12' : 'w-[200px]',
      ]"
    >
      <!-- Collapse toggle -->
      <button
        :class="[
          'flex items-center h-12 border-b border-[#2a2a3a] text-[#8888a4] hover:text-white transition-colors',
          sidebarCollapsed ? 'justify-center' : 'justify-end px-3',
        ]"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="uiStore.toggleSidebar()"
      >
        <ChevronLeft
          :class="['size-4 transition-transform duration-300', sidebarCollapsed ? 'rotate-180' : '']"
        />
      </button>

      <!-- Nav content (scrollable) -->
      <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <!-- BROWSE section -->
        <template v-for="item in browseItems" :key="item.path">
          <Tooltip v-if="sidebarCollapsed">
            <TooltipTrigger as-child>
              <button
                :class="itemClass(isBrowseActive(item.path))"
                @click="$router.push(item.path)"
              >
                <component :is="item.icon" class="size-4 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{{ item.label }}</TooltipContent>
          </Tooltip>
          <button
            v-else
            :class="itemClass(isBrowseActive(item.path))"
            @click="$router.push(item.path)"
          >
            <component :is="item.icon" class="size-4 shrink-0" />
            <span v-show="!sidebarCollapsed">{{ item.label }}</span>
          </button>
        </template>

        <Separator class="my-2 bg-[#2a2a3a]" />

        <!-- CATEGORIES section -->
        <div v-show="!sidebarCollapsed" :class="sectionLabel">Categories</div>
        <template v-for="cat in categories" :key="cat.name">
          <Tooltip v-if="sidebarCollapsed">
            <TooltipTrigger as-child>
              <button
                :class="itemClass(isCategoryActive(cat.name))"
                @click="promptsStore.setCategory(isCategoryActive(cat.name) ? null : cat.name)"
              >
                <span
                  class="size-2 rounded-full shrink-0"
                  :style="{ backgroundColor: cat.color }"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{{ cat.name }}</TooltipContent>
          </Tooltip>
          <button
            v-else
            :class="itemClass(isCategoryActive(cat.name))"
            @click="promptsStore.setCategory(isCategoryActive(cat.name) ? null : cat.name)"
          >
            <span
              class="size-2 rounded-full shrink-0"
              :style="{ backgroundColor: cat.color }"
            />
            <span v-show="!sidebarCollapsed">{{ cat.name }}</span>
          </button>
        </template>

        <Separator class="my-2 bg-[#2a2a3a]" />

        <!-- AI MODELS section -->
        <div v-show="!sidebarCollapsed" :class="sectionLabel">AI Models</div>
        <template v-for="model in aiModels" :key="model">
          <Tooltip v-if="sidebarCollapsed">
            <TooltipTrigger as-child>
              <button
                :class="itemClass(isModelActive(model))"
                @click="promptsStore.setModel(isModelActive(model) ? null : model)"
              >
                <span class="size-4 rounded shrink-0 bg-[#2a2a3a] flex items-center justify-center text-[8px] text-[#8888a4] font-bold">
                  {{ model[0] }}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{{ model }}</TooltipContent>
          </Tooltip>
          <button
            v-else
            :class="itemClass(isModelActive(model))"
            @click="promptsStore.setModel(isModelActive(model) ? null : model)"
          >
            <span class="size-4 rounded shrink-0 bg-[#2a2a3a] flex items-center justify-center text-[8px] text-[#8888a4] font-bold">
              {{ model[0] }}
            </span>
            <span v-show="!sidebarCollapsed">{{ model }}</span>
          </button>
        </template>

        <Separator class="my-2 bg-[#2a2a3a]" />

        <!-- SORT section -->
        <div v-show="!sidebarCollapsed" :class="sectionLabel">Sort</div>
        <template v-for="opt in sortOptions" :key="opt.value">
          <Tooltip v-if="sidebarCollapsed">
            <TooltipTrigger as-child>
              <button
                :class="itemClass(isSortActive(opt.value))"
                @click="promptsStore.setSortOrder(opt.value)"
              >
                <AlignJustify class="size-4 shrink-0" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{{ opt.label }}</TooltipContent>
          </Tooltip>
          <button
            v-else
            :class="itemClass(isSortActive(opt.value))"
            @click="promptsStore.setSortOrder(opt.value)"
          >
            <AlignJustify class="size-4 shrink-0" />
            <span v-show="!sidebarCollapsed">{{ opt.label }}</span>
          </button>
        </template>

        <!-- ADMIN section (maintainer only) -->
        <template v-if="isMaintainer">
          <Separator class="my-2 bg-[#2a2a3a]" />
          <div v-show="!sidebarCollapsed" :class="sectionLabel">Admin</div>

          <Tooltip v-if="sidebarCollapsed">
            <TooltipTrigger as-child>
              <button :class="itemClass(false)" @click="$router.push('/admin')">
                <Shield class="size-4 shrink-0 text-[#ef4444]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Moderation Queue</TooltipContent>
          </Tooltip>
          <button v-else :class="itemClass(false)" @click="$router.push('/admin')">
            <Shield class="size-4 shrink-0 text-[#ef4444]" />
            <span v-show="!sidebarCollapsed" class="text-[#ef4444]">Moderation Queue</span>
          </button>

          <Tooltip v-if="sidebarCollapsed">
            <TooltipTrigger as-child>
              <button :class="itemClass(false)" @click="$router.push('/admin')">
                <Tag class="size-4 shrink-0 text-[#ef4444]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Label Manager</TooltipContent>
          </Tooltip>
          <button v-else :class="itemClass(false)" @click="$router.push('/admin')">
            <Tag class="size-4 shrink-0 text-[#ef4444]" />
            <span v-show="!sidebarCollapsed" class="text-[#ef4444]">Label Manager</span>
          </button>
        </template>
      </nav>

      <!-- Version badge at bottom -->
      <div class="border-t border-[#2a2a3a] px-3 py-2">
        <span v-show="!sidebarCollapsed" class="text-[10px] text-[#555570]">v{{ appVersion }}</span>
        <span v-show="sidebarCollapsed" class="text-[10px] text-[#555570] text-center block">v</span>
      </div>
    </aside>

    <!-- Mobile Sheet overlay sidebar -->
    <Sheet v-model:open="sidebarMobileOpen">
      <SheetContent side="left" class="p-0 w-[200px] bg-[#0d0d12] border-r border-[#2a2a3a]">
        <nav class="flex-1 overflow-y-auto py-2">
          <!-- BROWSE -->
          <template v-for="item in browseItems" :key="item.path + '-mobile'">
            <button
              :class="itemClass(isBrowseActive(item.path))"
              @click="$router.push(item.path); sidebarMobileOpen = false"
            >
              <component :is="item.icon" class="size-4 shrink-0" />
              <span>{{ item.label }}</span>
            </button>
          </template>

          <Separator class="my-2 bg-[#2a2a3a]" />

          <!-- CATEGORIES -->
          <div :class="sectionLabel">Categories</div>
          <template v-for="cat in categories" :key="cat.name + '-mobile'">
            <button
              :class="itemClass(isCategoryActive(cat.name))"
              @click="promptsStore.setCategory(isCategoryActive(cat.name) ? null : cat.name)"
            >
              <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: cat.color }" />
              <span>{{ cat.name }}</span>
            </button>
          </template>

          <Separator class="my-2 bg-[#2a2a3a]" />

          <!-- AI MODELS -->
          <div :class="sectionLabel">AI Models</div>
          <template v-for="model in aiModels" :key="model + '-mobile'">
            <button
              :class="itemClass(isModelActive(model))"
              @click="promptsStore.setModel(isModelActive(model) ? null : model)"
            >
              <span class="size-4 rounded shrink-0 bg-[#2a2a3a] flex items-center justify-center text-[8px] text-[#8888a4] font-bold">
                {{ model[0] }}
              </span>
              <span>{{ model }}</span>
            </button>
          </template>

          <Separator class="my-2 bg-[#2a2a3a]" />

          <!-- SORT -->
          <div :class="sectionLabel">Sort</div>
          <template v-for="opt in sortOptions" :key="opt.value + '-mobile'">
            <button
              :class="itemClass(isSortActive(opt.value))"
              @click="promptsStore.setSortOrder(opt.value)"
            >
              <AlignJustify class="size-4 shrink-0" />
              <span>{{ opt.label }}</span>
            </button>
          </template>

          <!-- ADMIN -->
          <template v-if="isMaintainer">
            <Separator class="my-2 bg-[#2a2a3a]" />
            <div :class="sectionLabel">Admin</div>
            <button :class="itemClass(false)" @click="$router.push('/admin'); sidebarMobileOpen = false">
              <Shield class="size-4 shrink-0 text-[#ef4444]" />
              <span class="text-[#ef4444]">Moderation Queue</span>
            </button>
            <button :class="itemClass(false)" @click="$router.push('/admin'); sidebarMobileOpen = false">
              <Tag class="size-4 shrink-0 text-[#ef4444]" />
              <span class="text-[#ef4444]">Label Manager</span>
            </button>
          </template>
        </nav>

        <!-- Version badge -->
        <div class="border-t border-[#2a2a3a] px-3 py-2">
          <span class="text-[10px] text-[#555570]">v{{ appVersion }}</span>
        </div>
      </SheetContent>
    </Sheet>
  </TooltipProvider>
</template>
