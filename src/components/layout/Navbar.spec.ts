import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createWebHashHistory } from 'vue-router'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Navbar from '@/components/layout/Navbar.vue'

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
