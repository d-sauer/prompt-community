// vitest.workers.config.ts
// Worker-runtime test config — DO NOT merge with vitest.config.ts (jsdom).
// Picks up specs under src/workers/api/**/*.spec.ts and runs them inside workerd.
//
// Uses the cloudflareTest plugin (v0.15.x shape) from @cloudflare/vitest-pool-workers.
// Note: src/workers/api/wrangler.toml is created by Plan 02 — the config is
// committed now so Plan 02 can use it immediately.
import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './src/workers/api/wrangler.toml' },
    }),
  ],
  test: {
    include: ['src/workers/api/**/*.spec.ts'],
  },
})
