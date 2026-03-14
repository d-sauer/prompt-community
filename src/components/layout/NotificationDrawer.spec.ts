import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'

// Stub out the shadcn Sheet components to avoid full Reka UI rendering in jsdom
vi.mock('@/components/ui/sheet', () => ({
  Sheet: { template: '<div v-if="open" v-bind="$attrs"><slot /></div>', props: ['open'] },
  SheetContent: { template: '<div><slot /></div>' },
  SheetHeader: { template: '<div><slot /></div>' },
  SheetTitle: { template: '<h2><slot /></h2>' },
  SheetClose: { template: '<button @click="$emit(\'click\')"><slot /></button>', emits: ['click'] },
}))

import NotificationDrawer from './NotificationDrawer.vue'

describe('NotificationDrawer', () => {
  it('does not show badge when notificationCount is 0', () => {
    const wrapper = mount(NotificationDrawer, {
      global: {
        plugins: [createTestingPinia({ initialState: { ui: { notificationCount: 0, notificationDrawerOpen: true } } })],
      },
    })
    expect(wrapper.find('[data-testid="notification-badge"]').exists()).toBe(false)
  })

  it('shows "No notifications yet" when open', () => {
    const wrapper = mount(NotificationDrawer, {
      global: {
        plugins: [createTestingPinia({ initialState: { ui: { notificationCount: 0, notificationDrawerOpen: true } } })],
      },
    })
    expect(wrapper.text()).toContain('No notifications yet')
  })

  it('shows badge with count when notificationCount is 3', () => {
    const wrapper = mount(NotificationDrawer, {
      global: {
        plugins: [createTestingPinia({ initialState: { ui: { notificationCount: 3, notificationDrawerOpen: true } } })],
      },
    })
    const badge = wrapper.find('[data-testid="notification-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('3')
  })
})
