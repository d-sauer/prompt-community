import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GitHubUser } from '@/types/index'

export const useAuthStore = defineStore('auth', () => {
  // SECURITY: plain ref, never localStorage — INFR-07
  const token = ref<string | null>(null)
  const user = ref<GitHubUser | null>(null)
  const isMaintainer = ref(false)

  const isAuthenticated = computed(() => token.value !== null)

  function receiveToken(newToken: string) {
    token.value = newToken
    // NOTE: never write to localStorage — INFR-07 requirement
  }

  function login() {
    const state = crypto.randomUUID()
    // Store state in closure variable, NOT sessionStorage (sessionStorage is not shared with popup)
    const workerUrl = import.meta.env.VITE_CF_WORKER_URL as string

    const popup = window.open(
      `${workerUrl}/login?state=${state}`,
      'github-oauth',
      'width=600,height=700,scrollbars=yes',
    )

    if (!popup) {
      console.warn('OAuth popup was blocked. Please allow popups for this site.')
      return
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== workerUrl) return
      if (!event.data?.token) return
      // Verify the state echo from postMessage payload
      if (event.data.state && event.data.state !== state) return
      window.removeEventListener('message', handleMessage)
      receiveToken(event.data.token as string)
      void fetchCurrentUser(event.data.token as string)
    }

    window.addEventListener('message', handleMessage)
  }

  function logout() {
    token.value = null
    user.value = null
    isMaintainer.value = false
  }

  // Stub: Phase 2 fills in GraphQL query to fetch authenticated user
  async function fetchCurrentUser(_token: string): Promise<void> {
    // TODO Phase 2: query GitHub GraphQL API for viewer { login, name, avatarUrl, ... }
  }

  return {
    token,
    user,
    isMaintainer,
    isAuthenticated,
    receiveToken,
    login,
    logout,
    fetchCurrentUser,
  }
})
