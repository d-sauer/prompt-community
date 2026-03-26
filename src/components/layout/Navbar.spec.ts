import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createWebHashHistory } from 'vue-router'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import Navbar from '@/components/layout/Navbar.vue'
import { useSearchStore } from '@/stores/useSearchStore'
import { useUIStore } from '@/stores/useUIStore'

// Stub @vueuse/core to avoid localStorage issues in jsdom
vi.mock('@vueuse/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vueuse/core')>()
  return {
    ...actual,
    useDark: () => ({ value: true }),
  }
})

vi.mock('lucide-vue-next', () => ({
  Bell: { template: '<svg />' },
  Search: { template: '<svg />' },
  Menu: { template: '<svg />' },
  Plus: { template: '<svg />' },
  Moon: { template: '<svg />' },
  Sun: { template: '<svg />' },
}))

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/browse', component: { template: '<div />' } },
    { path: '/profile', component: { template: '<div />' } },
    { path: '/prompts/new', component: { template: '<div />' } },
    { path: '/prompts/:id', component: { template: '<div />' } },
  ],
})

const authenticatedPinia = () =>
  createTestingPinia({
    initialState: {
      auth: {
        token: 'tok',
        user: {
          login: 'alice',
          name: 'Alice',
          avatarUrl: '',
          bio: null,
          company: null,
          location: null,
          followers: 0,
          following: 0,
          publicRepos: 0,
        },
        isMaintainer: false,
      },
      ui: { commandPaletteOpen: false, notificationCount: 0, sidebarMobileOpen: false },
    },
  })

const globalConfig = (pinia: ReturnType<typeof createTestingPinia>) => ({
  plugins: [pinia, router],
  stubs: {
    Avatar: { template: '<div><slot /></div>' },
    AvatarImage: { template: '<img />' },
    AvatarFallback: { template: '<span><slot /></span>' },
    Badge: { template: '<span><slot /></span>' },
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: {
      template: '<div @click="$emit(\'select\')"><slot /></div>',
      emits: ['select'],
    },
    DropdownMenuSeparator: { template: '<hr />' },
    CommandDialog: { template: '<div />' },
    CommandInput: { template: '<input />' },
    CommandList: { template: '<div />' },
    CommandEmpty: { template: '<div />' },
  },
})

// Palette config with expanded stubs that allow palette content to render
const paletteConfig = (pinia: ReturnType<typeof createTestingPinia>) => ({
  plugins: [pinia, router],
  stubs: {
    Avatar: { template: '<div><slot /></div>' },
    AvatarImage: { template: '<img />' },
    AvatarFallback: { template: '<span><slot /></span>' },
    Badge: { template: '<span><slot /></span>' },
    DropdownMenu: { template: '<div><slot /></div>' },
    DropdownMenuTrigger: { template: '<div><slot /></div>' },
    DropdownMenuContent: { template: '<div><slot /></div>' },
    DropdownMenuItem: {
      template: '<div @click="$emit(\'select\')"><slot /></div>',
      emits: ['select'],
    },
    DropdownMenuSeparator: { template: '<hr />' },
    // Expanded stubs: allow palette children to render
    CommandDialog: { template: '<div><slot /></div>' },
    CommandInput: {
      template: '<input data-testid="cmd-input" />',
      inheritAttrs: false,
    },
    CommandList: { template: '<div><slot /></div>' },
    CommandEmpty: { template: '<div><slot /></div>' },
    CommandItem: {
      template: '<div data-testid="cmd-item" @click="$emit(\'select\')"><slot /></div>',
      emits: ['select'],
    },
  },
})

describe('Navbar', () => {
  beforeEach(async () => {
    await router.push('/')
    await router.isReady()
  })

  it('Test I: Profile DropdownMenuItem is rendered when isAuthenticated=true', async () => {
    const wrapper = mount(Navbar, {
      global: globalConfig(authenticatedPinia()),
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Profile')
  })

  it('Test H: Clicking the Profile DropdownMenuItem calls router.push("/profile")', async () => {
    const pushSpy = vi.spyOn(router, 'push')

    const wrapper = mount(Navbar, {
      global: globalConfig(authenticatedPinia()),
    })

    await flushPromises()

    // The DropdownMenuItem stub renders as a <div>; find the one containing 'Profile' text
    const allDivs = wrapper.findAll('div')
    const profileDiv = allDivs.find((div) => div.text().trim() === 'Profile')
    expect(profileDiv).toBeDefined()
    await profileDiv!.trigger('click')

    expect(pushSpy).toHaveBeenCalledWith('/profile')
  })
})

describe('Navbar command palette (SHEL-01)', () => {
  beforeEach(async () => {
    await router.push('/')
    await router.isReady()
  })

  it('Test A: CommandInput @input calls searchStore.setQuery (SHEL-01)', async () => {
    const pinia = createTestingPinia({
      initialState: {
        auth: { token: null, user: null, isMaintainer: false },
        ui: { commandPaletteOpen: true, notificationCount: 0, sidebarMobileOpen: false },
        search: { query: '', allPrompts: [], results: [] },
      },
    })
    const wrapper = mount(Navbar, { global: paletteConfig(pinia) })
    const searchStore = useSearchStore(pinia)

    const input = wrapper.find('[data-testid="cmd-input"]')
    await input.trigger('input', { target: { value: 'python' } })

    expect(searchStore.setQuery).toHaveBeenCalledWith('python')
  })

  it('Test B: closing palette resets searchStore.query to empty (SHEL-01)', async () => {
    const pinia = createTestingPinia({
      initialState: {
        auth: { token: null, user: null, isMaintainer: false },
        ui: { commandPaletteOpen: true, notificationCount: 0, sidebarMobileOpen: false },
        search: { query: 'test', allPrompts: [], results: [] },
      },
    })
    const wrapper = mount(Navbar, { global: paletteConfig(pinia) })
    const uiStore = useUIStore(pinia)
    const searchStore = useSearchStore(pinia)

    uiStore.commandPaletteOpen = false
    await nextTick()

    expect(searchStore.setQuery).toHaveBeenCalledWith('')

    // Keep wrapper in scope to avoid unmount side-effects
    wrapper.unmount()
  })

  it('Test C: CommandItem list renders from searchStore.results when query non-empty (SHEL-01)', async () => {
    const mockPrompt = { id: 42, title: 'Python Prompt', frontmatter: { category: 'Coding' } }
    const pinia = createTestingPinia({
      initialState: {
        auth: { token: null, user: null, isMaintainer: false },
        ui: { commandPaletteOpen: true, notificationCount: 0, sidebarMobileOpen: false },
        search: { query: 'python', results: [mockPrompt], allPrompts: [mockPrompt] },
      },
    })
    const wrapper = mount(Navbar, { global: paletteConfig(pinia) })
    await flushPromises()

    expect(wrapper.findAll('[data-testid="cmd-item"]').length).toBeGreaterThan(0)
  })

  it('Test D: selecting a CommandItem navigates to /prompts/:id and closes palette (SHEL-01)', async () => {
    const mockPrompt = { id: 42, title: 'Python Prompt', frontmatter: { category: 'Coding' } }
    const pinia = createTestingPinia({
      initialState: {
        auth: { token: null, user: null, isMaintainer: false },
        ui: { commandPaletteOpen: true, notificationCount: 0, sidebarMobileOpen: false },
        search: { query: 'python', results: [mockPrompt], allPrompts: [mockPrompt] },
      },
    })
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(Navbar, { global: paletteConfig(pinia) })
    const uiStore = useUIStore(pinia)
    await flushPromises()

    await wrapper.find('[data-testid="cmd-item"]').trigger('click')

    expect(pushSpy).toHaveBeenCalledWith('/prompts/42')
    expect(uiStore.closeCommandPalette).toHaveBeenCalled()
  })
})
