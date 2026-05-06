<script setup lang="ts">
import { onMounted } from 'vue'

// This route is opened in a popup by the GitHub OAuth flow.
// The server callback sets the session cookie then redirects here.
// All we need to do is close the popup — the parent window polls popup.closed
// and calls GET /me when it detects closure.
onMounted(() => {
  window.close()
})
</script>

<template>
  <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#666;">
    Logging in...
  </div>
</template>
