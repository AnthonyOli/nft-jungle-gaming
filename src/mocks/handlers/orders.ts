import { HttpResponse } from 'msw'
import type { CartLine, Order, OrderWallet } from '../../api/types'
import { format, ratio } from '../../lib/eth'
import { db, save, touchNft, type OrderRecord } from '../db'
import { publish } from '../events'
import { delay } from 'msw'
import { scenario } from '../scenario'
import { authed, body, err, get, post } from '../route'
import { priceLines } from './quote'

const PENDING_MS = 4000
const ORDER_TIMEOUT_MS = 15_000

const stockOf = (id: string, edition: string) => db().nfts.find((n) => n.id === id)?.editions.find((e) => e.id === edition)
function adjustStock(lines: CartLine[], sign: 1 | -1) {
  for (const { id, edition, qty } of lines) {
    const nft = db().nfts.find((n) => n.id === id)
    const ed = stockOf(id, edition)
    if (nft && ed) { ed.stock += sign * qty; touchNft(nft) }
  }
}

export function settleOrders(userId: string) {
  let changed = false
  for (const o of db().orders) {
    if (o.userId !== userId || o.settled || o.settleAt > Date.now()) continue
    o.settled = true
    o.status = o.outcome
    o.settledAt = new Date(o.settleAt).toISOString()
    if (o.outcome === 'confirmed') {
      const hash = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
      o.txId = `0x${hash}`
      o.explorerUrl = `https://etherscan.io/tx/0x${hash}`
      const cart = db().carts[userId] ?? []
      for (const { id, edition, qty } of o.reserved) {
        const line = cart.find((l) => l.id === id && l.edition === edition)
        if (line) line.qty -= qty
      }
      db().carts[userId] = cart.filter((l) => l.qty > 0)
    } else {
      adjustStock(o.reserved, 1)
      o.declineReason = 'payment_declined'
    }
    changed = true
    publish('order.updated', `order:${o.id}`, 2, toOrder(o), userId)
  }
  if (changed) save()
}

const scheduled = new Set<string>()
export function scheduleSettle(o: OrderRecord) {
  if (o.settled || scheduled.has(o.id)) return
  scheduled.add(o.id)
  setTimeout(() => { scheduled.delete(o.id); settleOrders(o.userId) }, Math.max(0, o.settleAt - Date.now()) + 50)
}

const toOrder = ({ userId: _u, settleAt: _s, outcome: _o, reserved: _r, settled: _d, ...order }: OrderRecord): Order => order

function validWallet(w: unknown): w is OrderWallet {
  const x = w as Partial<OrderWallet> | undefined
  return !!x && [x.type, x.network, x.address].every((v) => typeof v === 'string' && v.trim() !== '')
}

export const orders = [
  post('/api/orders', authed(async ({ user, request }) => {
    const raw = await body(request)
    const { quoteId, items, coupon, wallet, note } = raw
    const key = request.headers.get('Idempotency-Key')
    if (!key) return err(400, 'idempotency_key_required')
    if (typeof quoteId !== 'string' || !Array.isArray(items) || !validWallet(wallet)) return err(400, 'invalid_data', validWallet(wallet) ? undefined : { wallet: 'invalid_data' })
    if (!items.length) return err(400, 'empty_cart')

    const bodyJson = JSON.stringify({ items, coupon, wallet, note })
    const idemKey = `${user.id}:${key}`
    const seen = db().idempotency[idemKey]
    if (seen) {
      if (seen.bodyHash !== bodyJson) return err(409, 'idempotency_conflict')
      settleOrders(user.id)
      const existing = db().orders.find((o) => o.id === seen.orderId)!
      return HttpResponse.json(toOrder(existing), { status: 200 })
    }

    const priced = priceLines(items, coupon)
    const quoted = db().quotes[quoteId]
    const s = scenario()
    const raise = () => priced.lines.forEach((l) => {
      const nft = db().nfts.find((n) => n.id === l.id)
      if (nft) { nft.price = format(ratio(nft.price, 11, 10)); touchNft(nft) }
    })
    const fire = (name: string) => { const k = `${user.id}:${name}`; if (db().fired[k]) return false; db().fired[k] = true; return true }
    if (s === 'price-changed' && fire(s)) {
      raise()
      save()
      return err(409, 'quote_changed')
    }
    if (s === 'sold-out' && fire(s)) {
      priced.lines.forEach((l) => { const ed = stockOf(l.id, l.edition); if (ed) ed.stock = 0; const nft = db().nfts.find((n) => n.id === l.id); if (nft) touchNft(nft) })
      save()
      return err(409, 'sold_out')
    }
    if (priced.issues.some((i) => i.code === 'sold_out' || i.code === 'insufficient_stock' || i.code === 'unknown_item')) return err(409, 'sold_out')
    if (!quoted || quoted.expiresAt < Date.now() || quoted.total !== priced.total) return err(409, 'quote_changed')

    adjustStock(items, -1)
    delete db().fired[`${user.id}:${s}`]
    const order: OrderRecord = {
      id: `ord_${crypto.randomUUID().slice(0, 8)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: priced.lines,
      subtotal: priced.subtotal, discount: priced.discount, networkFee: priced.networkFee, total: priced.total,
      wallet: { type: wallet.type, network: wallet.network, address: wallet.address },
      ...(typeof note === 'string' && note.trim() && { note: note.trim() }),
      userId: user.id,
      settleAt: Date.now() + PENDING_MS,
      outcome: s === 'payment-declined' ? 'declined' : 'confirmed',
      reserved: items,
      settled: false,
    }
    db().orders.push(order)
    db().idempotency[idemKey] = { bodyHash: bodyJson, orderId: order.id }
    save()
    publish('order.updated', `order:${order.id}`, 1, toOrder(order), user.id)
    scheduleSettle(order)
    if (s === 'order-timeout') await delay(ORDER_TIMEOUT_MS)
    return HttpResponse.json(toOrder(order), { status: 201 })
  }), 600),

  get('/api/orders/:id', authed(({ user, params }) => {
    settleOrders(user.id)
    const order = db().orders.find((o) => o.id === params.id && o.userId === user.id)
    return order ? HttpResponse.json(toOrder(order)) : err(404, 'not_found')
  })),
]
