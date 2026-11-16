import { QueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { UNAUTHORIZED_EVENT } from './client'
import { keys } from './queryKeys'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, error) => {
        const status = (error as AxiosError).response?.status
        return count < 2 && (status === undefined || status >= 500)
      },
    },
  },
})

const PUBLIC = ['nft', 'nfts']
export function resetSession() {
  queryClient.setQueryData(keys.me, null)
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me[0] && !PUBLIC.includes(q.queryKey[0] as string) })
  queryClient.resetQueries({ predicate: (q) => PUBLIC.includes(q.queryKey[0] as string) })
}

window.addEventListener(UNAUTHORIZED_EVENT, resetSession)
