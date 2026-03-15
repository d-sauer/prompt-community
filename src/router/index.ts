import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'
import { verifyMaintainerStatus } from '@/lib/github/auth'

export { verifyMaintainerStatus }

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/browse' },
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      children: [
        {
          path: 'browse',
          name: 'browse',
          component: () => import('@/views/BrowseView.vue'),
        },
        {
          path: 'prompts/new',
          name: 'prompt-new',
          component: () => import('@/views/PromptEditorView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'prompts/:id/edit',
          name: 'prompt-edit',
          component: () => import('@/views/PromptEditorView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'prompts/:id',
          name: 'prompt-detail',
          component: () => import('@/views/PromptDetailView.vue'),
        },
        {
          path: 'prompts/:id/versions',
          name: 'prompt-versions',
          component: () => import('@/views/VersionHistoryView.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/AdminView.vue'),
          meta: { requiresMaintainer: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to, from) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/browse' }
  }

  if (to.meta.requiresMaintainer) {
    if (!authStore.isAuthenticated) {
      return { path: '/browse' }
    }
    // Re-verify via GitHub API on every admin navigation (INFR-08)
    const confirmed = await verifyMaintainerStatus(authStore.token)
    if (!confirmed) return { path: '/browse' }
  }

  // Unsaved-changes guard (CONT-11): warn before navigating away from editor
  // Only check if navigating to a different path
  if (to.path !== from.path) {
    // Dynamic import to avoid circular dependency at module load time
    const { useDraftStore } = await import('@/stores/useDraftStore')
    const { getActivePinia } = await import('pinia')
    const pinia = getActivePinia()
    if (pinia) {
      const draftStore = useDraftStore(pinia)
      if (draftStore.isDirty) {
        const confirmed = window.confirm('You have unsaved changes. Leave anyway?')
        if (!confirmed) return false
      }
    }
  }
})
