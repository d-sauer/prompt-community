import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GitHubUser } from '@/types/index'
import { createGraphqlClient } from '@/lib/github/octokit'
import { GET_VIEWER } from '@/lib/github/queries'
import { verifyMaintainerStatus } from '@/lib/github/auth'
import { clearUserEtags } from '@/lib/github/etag'
import { toast } from 'vue-sonner'

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
    const login = user.value?.login
    token.value = null
    user.value = null
    isMaintainer.value = false
    if (login) clearUserEtags(login)
  }

  async function fetchCurrentUser(token: string): Promise<void> {
    try {
      const client = createGraphqlClient(token)
      const data = await client<{
        viewer: {
          login: string
          name: string | null
          avatarUrl: string
          bio: string | null
          company: string | null
          location: string | null
          followers: { totalCount: number }
          following: { totalCount: number }
          repositories: { totalCount: number }
        }
      }>(GET_VIEWER)
      user.value = {
        login: data.viewer.login,
        name: data.viewer.name,
        avatarUrl: data.viewer.avatarUrl,
        bio: data.viewer.bio,
        company: data.viewer.company,
        location: data.viewer.location,
        followers: data.viewer.followers.totalCount,
        following: data.viewer.following.totalCount,
        publicRepos: data.viewer.repositories.totalCount,
      }
      isMaintainer.value = await verifyMaintainerStatus(token)
    } catch {
      toast.error('Sign-in failed, please try again')
      // token stays set (INFR-07); user stays null; isMaintainer stays false
    }
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
