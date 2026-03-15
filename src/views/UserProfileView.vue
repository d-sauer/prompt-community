<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useRoute } from 'vue-router'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import ProfileStats from '@/components/profile/ProfileStats.vue'
import ProfileTabs from '@/components/profile/ProfileTabs.vue'
import { useUserProfile } from '@/composables/queries/useUserProfile'
import { useAuthStore } from '@/stores/useAuthStore'

const route = useRoute()
const authStore = useAuthStore()

const login = computed(() => route.params.login as string)
const { isLoading, isError, totalVotes, totalSubmissions, submissions } = useUserProfile(login)

const isOwnProfile = computed(() => authStore.user?.login === login.value)

// Use first submission's author avatar if available
const avatarUrl = computed(() => submissions.value[0] ? undefined : undefined)
const avatarSrc = computed(() => {
  // GitHub avatar URL derived from login
  return `https://avatars.githubusercontent.com/${login.value}?s=80`
})

const initials = computed(() => login.value.slice(0, 2).toUpperCase())
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-8">
    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <div class="flex items-center gap-4">
        <Skeleton class="w-16 h-16 rounded-full" />
        <div class="space-y-2">
          <Skeleton class="h-5 w-32" />
          <Skeleton class="h-4 w-48" />
        </div>
      </div>
      <Skeleton class="h-4 w-full" />
      <Skeleton class="h-4 w-3/4" />
    </div>

    <!-- Error state -->
    <div v-else-if="isError" class="flex items-center justify-center py-16 text-sm text-white/40">
      User not found.
    </div>

    <!-- Profile content -->
    <div v-else class="space-y-6">
      <!-- Header: Avatar + login -->
      <div class="flex items-center gap-4">
        <Avatar class="w-16 h-16">
          <AvatarImage :src="avatarSrc" :alt="login" />
          <AvatarFallback class="bg-white/10 text-white text-lg font-semibold">
            {{ initials }}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 class="text-xl font-semibold text-white">{{ login }}</h1>
          <p v-if="isOwnProfile" class="text-xs text-white/40 mt-0.5">Your profile</p>
        </div>
      </div>

      <!-- Stats -->
      <ProfileStats :total-votes="totalVotes" :total-submissions="totalSubmissions" />

      <!-- Tabs -->
      <ProfileTabs :login="login" :is-own-profile="isOwnProfile" />
    </div>
  </div>
</template>
