import { vi } from 'vitest'

// Mock window.open — returns a minimal popup object
vi.stubGlobal('open', vi.fn(() => ({
  close: vi.fn(),
  closed: false,
  focus: vi.fn(),
})))

// Mock crypto.randomUUID for deterministic tests
if (!globalThis.crypto) {
  // jsdom may not have crypto.randomUUID
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'test-uuid-1234-5678-90ab-cdef01234567',
    },
  })
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => 'test-uuid-1234-5678-90ab-cdef01234567',
  })
}

// Spy on localStorage to verify token is never stored — INFR-07
vi.spyOn(Storage.prototype, 'setItem')
vi.spyOn(Storage.prototype, 'getItem')

// Mock window.postMessage (jsdom supports it but ensure it's tracked)
vi.spyOn(window, 'postMessage')
