import { useEventListener } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useUIStore } from '@/stores/useUIStore'

export function useKeyboardShortcuts() {
  const router = useRouter()
  const uiStore = useUIStore()

  let chordFirstKey: string | null = null
  let chordTimer: ReturnType<typeof setTimeout> | null = null
  const CHORD_TIMEOUT_MS = 500

  function isInputFocused(): boolean {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName.toLowerCase()
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable
  }

  useEventListener('keydown', (e: KeyboardEvent) => {
    if (isInputFocused()) return

    // ⌘K / Ctrl+K — open Command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      uiStore.openCommandPalette()
      return
    }

    // [ — toggle sidebar
    if (e.key === '[') {
      e.preventDefault()
      uiStore.toggleSidebar()
      return
    }

    // Chord: G+B, G+N
    if (e.key === 'g' || e.key === 'G') {
      chordFirstKey = 'g'
      if (chordTimer) clearTimeout(chordTimer)
      chordTimer = setTimeout(() => {
        chordFirstKey = null
      }, CHORD_TIMEOUT_MS)
      return
    }

    if (chordFirstKey === 'g') {
      if (chordTimer) clearTimeout(chordTimer)
      chordFirstKey = null

      if (e.key === 'b' || e.key === 'B') {
        router.push('/browse')
      }
      if (e.key === 'n' || e.key === 'N') {
        router.push('/prompts/new')
      }
    }
  })
}
