<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const showNotSignedIn = computed(() => !authStore.isAuthenticated)

let timeoutId: ReturnType<typeof setTimeout> | null = null
let stopWatch: (() => void) | null = null

if (authStore.isAuthenticated) {
  if (authStore.user?.login) {
    // User already loaded (e.g., navigated back after login) — redirect immediately
    void router.replace({ name: 'user-profile', params: { login: authStore.user.login } })
  } else {
    // Authenticated but fetchCurrentUser not yet resolved — wait for user to populate
    timeoutId = setTimeout(() => {
      void router.replace('/browse')
    }, 5000)

    stopWatch = watch(
      () => authStore.user,
      (newUser) => {
        if (newUser?.login) {
          if (timeoutId) clearTimeout(timeoutId)
          stopWatch?.()
          void router.replace({ name: 'user-profile', params: { login: newUser.login } })
        }
      },
    )
  }
}

onUnmounted(() => {
  // Prevent timeout firing after component is gone (avoids unexpected /browse navigation)
  if (timeoutId) clearTimeout(timeoutId)
  stopWatch?.()
})
</script>

<template>
  <div class="flex items-center justify-center h-full text-sm text-white/40">
    <template v-if="showNotSignedIn">
      You are not signed in — please log in to view your profile
    </template>
    <template v-else>
      Redirecting...
    </template>
  </div>
</template>
