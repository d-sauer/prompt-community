import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { createRouter, createWebHashHistory } from 'vue-router'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import ProfileRedirectView from '@/views/ProfileRedirectView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/profile', name: 'profile', component: ProfileRedirectView },
    { path: '/browse', name: 'browse', component: { template: '<div>Browse</div>' } },
    { path: '/users/:login', name: 'user-profile', component: { template: '<div>Profile</div>' } },
  ],
})

describe('ProfileRedirectView', () => {
  beforeEach(async () => {
    await router.push('/profile')
    await router.isReady()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Test D: When isAuthenticated=false, renders "You are not signed in" text (no redirect)', async () => {
    const wrapper = mount(ProfileRedirectView, {
      global: {
        plugins: [
          createTestingPinia({
            initialState: {
              auth: { token: null, user: null, isMaintainer: false },
            },
          }),
          router,
        ],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('You are not signed in')
    expect(router.currentRoute.value.path).toBe('/profile')
  })

  it('Test E: When isAuthenticated=true and user already has login, immediately redirects to /users/:login', async () => {
    const replaceSpy = vi.spyOn(router, 'replace')

    mount(ProfileRedirectView, {
      global: {
        plugins: [
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
            },
          }),
          router,
        ],
      },
    })

    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({ name: 'user-profile', params: { login: 'alice' } })
  })

  it('Test F: When isAuthenticated=true and user is null initially, shows "Redirecting..." and redirects when user is set', async () => {
    const replaceSpy = vi.spyOn(router, 'replace')

    const pinia = createTestingPinia({
      initialState: {
        auth: { token: 'tok', user: null, isMaintainer: false },
      },
    })

    const wrapper = mount(ProfileRedirectView, {
      global: {
        plugins: [pinia, router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Redirecting...')

    // Simulate user being set (fetchCurrentUser resolves)
    const { useAuthStore } = await import('@/stores/useAuthStore')
    const store = useAuthStore()
    store.user = {
      login: 'bob',
      name: 'Bob',
      avatarUrl: '',
      bio: null,
      company: null,
      location: null,
      followers: 0,
      following: 0,
      publicRepos: 0,
    }

    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith({ name: 'user-profile', params: { login: 'bob' } })
  })

  it('Test G: When isAuthenticated=true and user stays null for 5s, redirects to /browse', async () => {
    vi.useFakeTimers()
    const replaceSpy = vi.spyOn(router, 'replace')

    mount(ProfileRedirectView, {
      global: {
        plugins: [
          createTestingPinia({
            initialState: {
              auth: { token: 'tok', user: null, isMaintainer: false },
            },
          }),
          router,
        ],
      },
    })

    await flushPromises()

    vi.advanceTimersByTime(5001)
    await flushPromises()

    expect(replaceSpy).toHaveBeenCalledWith('/browse')
  })
})
