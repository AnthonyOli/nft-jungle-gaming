const DECIMALS = 18
const ONE = 10n ** BigInt(DECIMALS)

export function toWei(value: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,18}))?$/.exec(value)
  if (!m) throw new Error(`Invalid ETH amount: ${value}`)
  return BigInt(m[1]) * ONE + BigInt((m[2] ?? '').padEnd(DECIMALS, '0'))
}

const fromWei = (wei: bigint) => {
  const frac = (wei % ONE).toString().padStart(DECIMALS, '0').replace(/0+$/, '')
  return `${wei / ONE}${frac ? `.${frac}` : ''}`
}

export const add = (a: string, b: string) => fromWei(toWei(a) + toWei(b))
export const mul = (price: string, qty: number) => fromWei(toWei(price) * BigInt(qty))

export function format(value: string, digits = 2): string {
  const step = 10n ** BigInt(DECIMALS - digits)
  const rounded = ((toWei(value) + step / 2n) / step) * step
  const [int, frac = ''] = fromWei(rounded).split('.')
  return digits ? `${int}.${frac.padEnd(digits, '0')}` : int
}

export const NETWORK_FEE = '0.016'

export function totals(items: { price: string; qty: number }[]) {
  const subtotal = items.reduce((sum, i) => add(sum, mul(i.price, i.qty)), '0')
  return { subtotal, total: add(subtotal, NETWORK_FEE) }
}

export const ratio = (value: string, num: number, den: number) => fromWei((toWei(value) * BigInt(num) * 2n + BigInt(den)) / (BigInt(den) * 2n))
export const sub = (a: string, b: string) => fromWei(toWei(a) - toWei(b))
export const cmp = (a: string, b: string) => (toWei(a) < toWei(b) ? -1 : toWei(a) > toWei(b) ? 1 : 0)
