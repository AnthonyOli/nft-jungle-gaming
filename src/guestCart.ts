import type { CartLine } from './api/types'
import { localStore } from './lib/localStore'

const store = localStore<CartLine[]>('kurio:guest-cart', [], (raw) => {
  const lines = JSON.parse(raw)
  if (!Array.isArray(lines)) throw new Error('bad guest cart')
  return lines
})

export const useGuestCart = store.use
export const guestCart = {
  get: store.get,
  clear: () => store.set(null),
  add: (line: CartLine) => {
    const lines = store.get()
    const hit = lines.find((l) => l.id === line.id && l.edition === line.edition)
    store.set(hit ? lines.map((l) => (l === hit ? { ...l, qty: l.qty + line.qty } : l)) : [...lines, line])
  },
  setQty: (line: CartLine) => store.set(store.get().map((l) => (l.id === line.id && l.edition === line.edition ? line : l))),
  remove: (id: string, edition: string) => store.set(store.get().filter((l) => !(l.id === id && l.edition === edition))),
}
