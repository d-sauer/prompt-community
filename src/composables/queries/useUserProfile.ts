import { useQuery } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getUserProfile, getUserPrompts } from '@/lib/api/queries'
import type { Prompt } from '@/types/index'

export function useUserProfile(login: Ref<string>) {
  const query = useQuery({
    queryKey: computed(() => ['user-profile', login.value]),
    queryFn: async () => {
      const [profile, promptsPage] = await Promise.all([
        getUserProfile(login.value),
        getUserPrompts(login.value),
      ])
      return { profile, prompts: promptsPage.data }
    },
    enabled: computed(() => Boolean(login.value)),
    staleTime: 300_000,
  })

  const submissions = computed<Prompt[]>(() => query.data.value?.prompts ?? [])

  const totalVotes = computed(() =>
    submissions.value
      .flatMap((p) => p.reactionGroups)
      .reduce((sum, g) => sum + g.reactors.totalCount, 0),
  )

  const totalSubmissions = computed(() => submissions.value.length)

  return { ...query, submissions, totalVotes, totalSubmissions }
}
