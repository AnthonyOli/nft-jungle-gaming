import { HttpResponse } from 'msw'
import type { CartLine } from '../../api/types'
import { db, save } from '../db'
import { authed, body, del, err, get, patch, post } from '../route'
import { settleOrders } from './orders'

const stockOf = (id: string, edition: string) => db().nfts.find((n) => n.id === id)?.editions.find((e) => e.id === edition)?.stock
const valid = (l: Partial<CartLine>): l is CartLine =>
  typeof l.id === 'string' && typeof l.edition === 'string' && Number.isInteger(l.qty) && l.qty! > 0 && stockOf(l.id, l.edition) !== undefined
const read = (userId: string) => db().carts[userId] ?? []
const write = (userId: string, lines: CartLine[]) => {
  db().carts[userId] = lines
  save()
  return HttpResponse.json(lines)
}
const find = (lines: CartLine[], id: string, edition: string) => lines.find((l) => l.id === id && l.edition === edition)

export const cart = [
  get('/api/cart', authed(({ user }) => {
    settleOrders(user.id)
    return HttpResponse.json(read(user.id))
  })),
  post('/api/cart', authed(async ({ user, request }) => {
    const line = await body(request)
    if (!valid(line)) return err(400, 'invalid_data')
    const lines = read(user.id)
    const existing = find(lines, line.id, line.edition)
    if ((existing?.qty ?? 0) + line.qty > stockOf(line.id, line.edition)!) return err(409, 'insufficient_stock')
    if (existing) existing.qty += line.qty
    else lines.push({ id: line.id, edition: line.edition, qty: line.qty })
    return write(user.id, lines)
  })),
  patch('/api/cart/:id', authed(async ({ user, params, request }) => {
    const { edition, qty } = await body(request)
    const lines = read(user.id)
    const line = find(lines, params.id, edition)
    if (!line) return err(404, 'not_found')
    if (!Number.isInteger(qty) || qty < 1) return err(400, 'invalid_data')
    if (qty > stockOf(params.id, edition)!) return err(409, 'insufficient_stock')
    line.qty = qty
    return write(user.id, lines)
  })),
  del('/api/cart/:id', authed(({ user, params, request }) => {
    const edition = new URL(request.url).searchParams.get('edition')
    return write(user.id, read(user.id).filter((l) => !(l.id === params.id && l.edition === edition)))
  })),
  post('/api/cart/merge', authed(async ({ user, request }) => {
    const { lines: incoming } = await body(request)
    if (!Array.isArray(incoming)) return err(400, 'invalid_data')
    const lines = read(user.id)
    for (const l of incoming.filter(valid)) {
      const room = stockOf(l.id, l.edition)! - (find(lines, l.id, l.edition)?.qty ?? 0)
      const qty = Math.min(l.qty, room)
      if (qty < 1) continue
      const existing = find(lines, l.id, l.edition)
      if (existing) existing.qty += qty
      else lines.push({ id: l.id, edition: l.edition, qty })
    }
    return write(user.id, lines)
  })),
]
