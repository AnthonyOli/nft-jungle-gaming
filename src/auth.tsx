import { useQuery } from '@tanstack/react-query'
import { logoutRequest, me } from './api'
import { queryClient, resetSession } from './api/queryClient'
import { keys } from './api/queryKeys'
import { clearToken, isLoggedIn } from './api/token'
import type { User } from './api/types'

export function useAuth() {
  const { data, isPending } = useQuery({
    queryKey: keys.me,
    queryFn: async (): Promise<User | null> => {
      if (!isLoggedIn()) return (clearToken(), null)
      return me().catch(() => null)
    },
    staleTime: Infinity,
    retry: false,
  })
  return {
    user: data ?? null,
    restoring: isPending,
    setUser: (u: User | null) => queryClient.setQueryData(keys.me, u),
    logout: () => {
      logoutRequest().catch(() => {})
      clearToken()
      resetSession()
    },
  }
}
