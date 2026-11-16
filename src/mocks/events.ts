import type { RealtimeEvent } from '../api/types'

export type Peer = { userId: string | null; emit: (event: string, data: unknown) => void; close: () => void }
export const peers = new Set<Peer>()
export const stats = { connections: 0 }

let seq = 0
export function publish<P>(event: 'nft.updated' | 'order.updated', resource: string, version: number, payload: P, userId?: string) {
  const data: RealtimeEvent<P> = { eventId: `evt_${Date.now().toString(36)}_${++seq}`, resource, version, payload, ...(userId && { userId }) }
  emitRaw(event, data)
  return data
}

export function emitRaw(event: string, data: RealtimeEvent) {
  peers.forEach((p) => (!data.userId || p.userId === data.userId) && p.emit(event, data))
}
