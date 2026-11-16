import { HttpResponse } from 'msw'
import type { CartLine, Quote, QuoteIssue, QuoteLine } from '../../api/types'
import { NETWORK_FEE, add, mul, ratio, sub } from '../../lib/eth'
import { db, save } from '../db'
import { scenario } from '../scenario'
import { body, err, post } from '../route'

const QUOTE_TTL_MS = 5 * 60_000

const COUPON_PERCENT: Record<string, number> = { KURIO10: 10, BEMVINDO20: 20 }

export function priceLines(items: CartLine[], couponCode?: string) {
  const lines: QuoteLine[] = []
  const issues: QuoteIssue[] = []
  for (const { id, edition, qty } of items) {
    const nft = db().nfts.find((n) => n.id === id)
    const ed = nft?.editions.find((e) => e.id === edition)
    if (!nft || !ed) { issues.push({ code: 'unknown_item', id, edition }); continue }
    if (ed.stock === 0) issues.push({ code: 'sold_out', id, edition, stock: 0 })
    else if (qty > ed.stock) issues.push({ code: 'insufficient_stock', id, edition, stock: ed.stock })
    lines.push({ id, edition, name: nft.name, alt: nft.alt, image: nft.image, price: nft.price, qty, total: mul(nft.price, qty) })
  }
  const subtotal = lines.reduce((sum, l) => add(sum, l.total), '0')
  const code = couponCode?.trim().toUpperCase()
  let coupon: Quote['coupon'] = null
  if (code) {
    const status = code === 'EXPIRADO' || (code === 'KURIO10' && scenario() === 'coupon-expired') ? 'expired' : code in COUPON_PERCENT ? 'applied' : 'invalid'
    coupon = { code, status }
  }
  const discount = coupon?.status === 'applied' ? ratio(subtotal, COUPON_PERCENT[coupon.code], 100) : '0'
  const networkFee = lines.length ? NETWORK_FEE : '0'
  const total = add(sub(subtotal, discount), networkFee)
  return { lines, issues, subtotal, discount, networkFee, total, coupon }
}

export const quote = [
  post('/api/quote', async ({ request }) => {
    const { items, coupon } = await body(request)
    if (!Array.isArray(items) || items.some((i) => typeof i?.id !== 'string' || typeof i?.edition !== 'string' || !(i?.qty >= 1))) return err(400, 'invalid_data')
    const priced = priceLines(items, typeof coupon === 'string' ? coupon : undefined)
    const quoteId = crypto.randomUUID()
    const expiresAt = Date.now() + QUOTE_TTL_MS
    db().quotes[quoteId] = { total: priced.total, expiresAt, coupon: priced.coupon?.code ?? null }
    save()
    const result: Quote = { quoteId, expiresAt: new Date(expiresAt).toISOString(), ...priced }
    return HttpResponse.json(result)
  }, 250),
]
