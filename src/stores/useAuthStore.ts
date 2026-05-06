import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface ApiUser {
  login: string
  name: string | null
  avatar_url: string
  role: 'user' | 'maintainer'
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<ApiUser | null>(null)

  const isMaintainer = computed(() => user.value?.role === 'maintainer' ?? false)
  const isAuthenticated = computed(() => user.value !== null)

  function login() {
    const apiUrl = import.meta.env.VITE_API_URL as string
    const popup = window.open(
      `${apiUrl}/auth/login`,
      'github-oauth',
      'width=600,height=700,scrollbars=yes',
    )
    if (!popup) {
      console.warn('OAuth popup was blocked. Please allow popups for this site.')
      return
    }
    const t = setInterval(() => {
      if (popup.closed) {
        clearInterval(t)
        void fetchMe()
      }
    }, 200)
  }

  function logout() {
    user.value = null
    // POST /auth/logout deferred to Phase 13 — cookie expires naturally (7-day hard expiry)
  }

  async function fetchMe(): Promise<void> {
    try {
      const apiUrl = import.meta.env.VITE_API_URL as string
      const res = await fetch(`${apiUrl}/me`, { credentials: 'include' })
      if (res.ok) {
        user.value = await res.json() as ApiUser
      } else {
        user.value = null
      }
    } catch {
      user.value = null
    }
  }

  return {
    user,
    isMaintainer,
    isAuthenticated,
    login,
    logout,
    fetchMe,
  }
})
