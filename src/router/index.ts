import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

// Stub: Phase 2 wires real GitHub collaborator API call
// Exported so it can be mocked in tests
export async function verifyMaintainerStatus(_token: string): Promise<boolean> {
  // TODO Phase 2: call GET /repos/:owner/:repo/collaborators/:username (INFR-08)
  return false
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/browse' },
    {
      path: '/browse',
      name: 'browse',
      component: () => import('@/views/BrowseView.vue'),
    },
    {
      path: '/prompts/new',
      name: 'prompt-new',
      component: () => import('@/views/PromptEditorView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/prompts/:id',
      name: 'prompt-detail',
      component: () => import('@/views/PromptDetailView.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresMaintainer: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { path: '/browse' }
  }

  if (to.meta.requiresMaintainer) {
    if (!authStore.isAuthenticated) {
      return { path: '/browse' }
    }
    // Re-verify via GitHub API on every admin navigation (INFR-08)
    const confirmed = await verifyMaintainerStatus(authStore.token ?? '')
    if (!confirmed) return { path: '/browse' }
  }
})
