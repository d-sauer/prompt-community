import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

// NOTE: verifyMaintainerStatus re-export removed in Phase 10 (cookie-based auth).
// The router now uses authStore.isMaintainer (derived from user.role in JWT cookie).
// Any callers that imported verifyMaintainerStatus from here should import directly
// from @/lib/github/auth, or update to Phase 13 approach (to be cleaned up in Phase 15).

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
          path: 'users/:login',
          name: 'user-profile',
          component: () => import('@/views/UserProfileView.vue'),
        },
        {
          path: 'profile',
          name: 'own-profile',
          component: () => import('@/views/ProfileRedirectView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('@/views/AdminView.vue'),
          meta: { requiresMaintainer: true },
        },
        {
          path: 'auth/callback',
          name: 'auth-callback',
          component: () => import('@/views/AuthCallbackView.vue'),
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
    // isMaintainer is derived from user.role in the JWT cookie (Phase 10).
    // Phase 13 will add server-side role re-verification on each admin navigation.
    if (!authStore.isMaintainer) return { path: '/browse' }
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
