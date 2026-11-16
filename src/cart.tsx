import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as api from './api'
import { queryClient } from './api/queryClient'
import { keys } from './api/queryKeys'
import type { CartLine } from './api/types'
import { useAuth } from './auth'
import { guestCart, useGuestCart } from './guestCart'

export function useCart() {
  const { user, restoring } = useAuth()
  const userId = user?.id
  const guest = useGuestCart()
  const qc = useQueryClient()
  const key = keys.cart(userId)
  const { data, refetch } = useQuery({ queryKey: key, queryFn: api.getCart, enabled: !!userId })
  const apply = (lines: CartLine[]) => qc.setQueryData(key, lines)
  const add = useMutation({ mutationFn: api.addToCart, onSuccess: apply })
  const set = useMutation({ mutationFn: api.setCartQty, onSuccess: apply })
  const remove = useMutation({ mutationFn: ({ id, edition }: { id: string; edition: string }) => api.removeFromCart(id, edition), onSuccess: apply })
  const lines = userId ? (data ?? []) : guest
  return {
    lines,
    pending: restoring || (!!userId && data === undefined),
    units: lines.reduce((n, l) => n + l.qty, 0),
    refresh: () => (userId ? refetch().then(() => {}) : Promise.resolve()),
    addToCart: async (line: CartLine) => void (userId ? await add.mutateAsync(line) : guestCart.add(line)),
    setQty: async (line: CartLine) => void (userId ? await set.mutateAsync(line) : guestCart.setQty(line)),
    removeItem: async (id: string, edition: string) => void (userId ? await remove.mutateAsync({ id, edition }) : guestCart.remove(id, edition)),
  }
}

export async function mergeGuestCart(userId: string) {
  const lines = guestCart.get()
  if (!lines.length) return
  const merged = await api.mergeCart(lines)
  guestCart.clear()
  await queryClient.cancelQueries({ queryKey: keys.cart(userId) })
  queryClient.setQueryData(keys.cart(userId), merged)
}

export function useQuote(lines: CartLine[], coupon?: string) {
  const userId = useAuth().user?.id
  return useQuery({
    queryKey: keys.quote(userId, lines, coupon),
    queryFn: ({ signal }) => api.getQuote(lines, coupon, signal),
    enabled: lines.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })
}
