import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import type { Socket } from 'socket.io-client'
import { keys } from './api/queryKeys'
import { getToken } from './api/token'
import type { CartLine, NftDetail, NftUpdate, Order, Quote, RealtimeEvent } from './api/types'
import { guestCart } from './guestCart'
import i18n from './i18n'

let connected = false
const listeners = new Set<() => void>()
const setConnected = (v: boolean) => { connected = v; listeners.forEach((l) => l()) }
export const useSocketConnected = () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), () => connected)

const MAX_SEEN = 500

export function useRealtime(userId: string | undefined) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const go = useRef(navigate)
  useEffect(() => { go.current = navigate }, [navigate])
  useEffect(() => {
    let socket: Socket | undefined
    let closed = false
    import('socket.io-client').then(({ io }) => {
      if (closed) return
      socket = io({ transports: ['websocket'], reconnectionDelay: 500, reconnectionDelayMax: 5000, auth: (cb) => cb({ token: getToken() }) })
      const seen = new Set<string>()
      const versions = new Map<string, number>()
      let first = true
      const fresh = (e: RealtimeEvent) => {
        if (seen.has(e.eventId) || (e.userId && e.userId !== userId) || e.version <= (versions.get(e.resource) ?? 0)) return false
        seen.add(e.eventId)
        if (seen.size > MAX_SEEN) seen.delete(seen.values().next().value!)
        versions.set(e.resource, e.version)
        return true
      }
      socket.on('connect', () => {
        setConnected(true)
        if (!first) qc.invalidateQueries({ predicate: (q) => ['nfts', 'nft', 'quote', 'cart', 'order'].includes(q.queryKey[0] as string) })
        first = false
      })
      socket.on('disconnect', () => setConnected(false))
      socket.on('nft.updated', (e: RealtimeEvent<NftUpdate>) => fresh(e) && applyNft(qc, userId, e))
      socket.on('order.updated', (e: RealtimeEvent<Order>) => fresh(e) && applyOrder(qc, userId, e.payload, (id) => void go.current({ to: '/pedido/$id', params: { id } })))
    })
    return () => { closed = true; socket?.close(); setConnected(false) }
  }, [qc, userId])
}

function applyNft(qc: QueryClient, userId: string | undefined, e: RealtimeEvent<NftUpdate>) {
  const { id, name, price, oldPrice, editions, available } = e.payload
  qc.setQueryData<NftDetail>(keys.nft(id, userId), (d) => (d && d.version < e.version ? { ...d, price, oldPrice, editions, available, version: e.version } : d))
  const lines: CartLine[] = userId ? (qc.getQueryData<CartLine[]>(keys.cart(userId)) ?? []) : guestCart.get()
  const quoted = qc.getQueriesData<Quote>({ queryKey: ['quote'] }).flatMap(([, q]) => q?.lines ?? [])
  const affected = lines.some((l) => l.id === id && (quoted.find((q) => q.id === id && q.edition === l.edition)?.price !== price || (editions.find((x) => x.id === l.edition)?.stock ?? 0) < l.qty))
  qc.invalidateQueries({ queryKey: ['nfts'] })
  qc.invalidateQueries({ queryKey: ['quote'] })
  if (affected) toast.warning(i18n.t('realtime.cartItemChanged', { name }))
}

function applyOrder(qc: QueryClient, userId: string | undefined, order: Order, open: (id: string) => void) {
  const cached = qc.getQueryData<Order>(keys.order(order.id, userId))
  if (cached && cached.status !== 'pending') return
  qc.setQueryData(keys.order(order.id, userId), order)
  if (order.status === 'pending') return
  qc.invalidateQueries({ queryKey: keys.cart(userId) })
  if (location.pathname.endsWith(order.id)) return
  toast[order.status === 'confirmed' ? 'success' : 'error'](i18n.t(order.status === 'confirmed' ? 'realtime.orderConfirmed' : 'realtime.orderDeclined', { id: order.id }), {
    duration: Infinity,
    closeButton: true,
    action: { label: i18n.t('realtime.viewOrder'), onClick: () => open(order.id) },
  })
}
