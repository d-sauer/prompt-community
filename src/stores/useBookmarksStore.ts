import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'

export const useBookmarksStore = defineStore('bookmarks', () => {
  const bookmarkedIds = useLocalStorage<string[]>('bookmarks', [])

  const isBookmarked = (id: string) => computed(() => bookmarkedIds.value.includes(id))

  function toggle(id: string) {
    const idx = bookmarkedIds.value.indexOf(id)
    if (idx >= 0) {
      bookmarkedIds.value.splice(idx, 1)
    } else {
      bookmarkedIds.value.push(id)
    }
  }

  return { bookmarkedIds, isBookmarked, toggle }
})
