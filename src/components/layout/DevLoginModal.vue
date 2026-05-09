<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [value: boolean]
  'logged-in': []
}>()

const authStore = useAuthStore()

interface DevUser { login: string; role: 'user' | 'maintainer' }

const LS_KEY = 'pc-dev-users'
const DEFAULT_USERS: DevUser[] = [
  { login: 'dev-user', role: 'user' },
  { login: 'dev-maintainer', role: 'maintainer' },
]

function loadDevUsers(): DevUser[] {
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as DevUser[]
    const logins = new Set(stored.map((u: DevUser) => u.login))
    return [...DEFAULT_USERS.filter(d => !logins.has(d.login)), ...stored]
  } catch {
    return [...DEFAULT_USERS]
  }
}

const devUsers = ref<DevUser[]>(loadDevUsers())
const newLogin = ref('')
const newRole = ref<'user' | 'maintainer'>('user')
const error = ref('')
const loading = ref(false)

const apiUrl = import.meta.env.VITE_API_URL as string

async function callDevLogin(login: string, role: 'user' | 'maintainer', name?: string): Promise<boolean> {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch(`${apiUrl}/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ login, role, name: name ?? login }),
    })
    if (!res.ok) {
      error.value = `Login failed (${res.status})`
      return false
    }
    return true
  } catch (_e) {
    error.value = 'Network error — is wrangler dev running?'
    return false
  } finally {
    loading.value = false
  }
}

async function selectUser(user: DevUser) {
  const ok = await callDevLogin(user.login, user.role)
  if (ok) {
    await authStore.fetchMe()
    emit('logged-in')
    emit('update:open', false)
  }
}

async function addUser() {
  const login = newLogin.value.trim()
  if (!login) { error.value = 'Login name is required'; return }
  const role = newRole.value
  const ok = await callDevLogin(login, role)
  if (ok) {
    // Persist new user to localStorage if not already present
    const existing = loadDevUsers()
    if (!existing.find(u => u.login === login)) {
      const updated = [...existing.filter(u => !DEFAULT_USERS.find(d => d.login === u.login)), { login, role }]
      localStorage.setItem(LS_KEY, JSON.stringify(updated))
      devUsers.value = loadDevUsers()
    }
    newLogin.value = ''
    newRole.value = 'user'
    await authStore.fetchMe()
    emit('logged-in')
    emit('update:open', false)
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="$emit('update:open', $event)">
    <DialogContent class="bg-[#0d0d12] border-[#2a2a3a] text-white sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Dev Login</DialogTitle>
        <DialogDescription class="text-[#8888a4]">
          Select a dev user or add a new one.
        </DialogDescription>
      </DialogHeader>

      <!-- Existing dev users list -->
      <div class="flex flex-col gap-1">
        <Button
          v-for="user in devUsers"
          :key="user.login"
          variant="ghost"
          class="w-full justify-start gap-2 hover:bg-[#1a1a27]"
          :disabled="loading"
          @click="selectUser(user)"
        >
          <span class="flex-1 text-left">{{ user.login }}</span>
          <Badge
            :variant="user.role === 'maintainer' ? 'default' : 'outline'"
            class="text-xs"
          >
            {{ user.role }}
          </Badge>
        </Button>
      </div>

      <hr class="border-[#2a2a3a] my-3" />

      <!-- Add user form -->
      <div class="flex flex-col gap-2">
        <p class="text-sm text-[#8888a4]">Add user</p>
        <Input
          v-model="newLogin"
          placeholder="login name"
          class="bg-[#1a1a27] border-[#2a2a3a] text-white placeholder:text-[#8888a4]"
          :disabled="loading"
          @keyup.enter="addUser"
        />
        <Select v-model="newRole">
          <SelectTrigger class="bg-[#1a1a27] border-[#2a2a3a] text-white">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent class="bg-[#0d0d12] border-[#2a2a3a] text-white">
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="maintainer">maintainer</SelectItem>
          </SelectContent>
        </Select>
        <Button
          class="bg-[#4c1d95] text-white hover:bg-[#5b21b6]"
          :disabled="loading"
          @click="addUser"
        >
          Add &amp; sign in
        </Button>
        <p v-if="error" class="text-red-400 text-sm mt-2">{{ error }}</p>
      </div>
    </DialogContent>
  </Dialog>
</template>
