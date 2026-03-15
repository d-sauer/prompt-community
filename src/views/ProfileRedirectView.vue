<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/useAuthStore'

const router = useRouter()
const authStore = useAuthStore()

const target = computed(() => {
  if (authStore.user?.login) {
    return { name: 'user-profile', params: { login: authStore.user.login } }
  }
  return { path: '/browse' }
})

router.replace(target.value)
</script>

<template>
  <div class="flex items-center justify-center h-full text-sm text-white/40">
    Redirecting...
  </div>
</template>
