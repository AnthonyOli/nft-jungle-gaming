import { delay, HttpResponse } from 'msw'

export const SCENARIOS = [
  'success', 'empty', 'slow', 'flaky', 'expired-session', 'coupon-expired',
  'price-changed', 'sold-out', 'order-timeout', 'payment-declined',
] as const
export type Scenario = (typeof SCENARIOS)[number]

const KEY = 'kurio:scenario'
const isScenario = (v: unknown): v is Scenario => SCENARIOS.includes(v as Scenario)

export function scenario(): Scenario {
  const fromUrl = new URLSearchParams(location.search).get('scenario')
  if (isScenario(fromUrl)) localStorage.setItem(KEY, fromUrl)
  const stored = localStorage.getItem(KEY)
  const env = import.meta.env.VITE_MOCK_SCENARIO
  return [fromUrl, stored, env].find(isScenario) ?? 'success'
}

let seed = Number(localStorage.getItem('kurio:scenario-seed') ?? 1) >>> 0
export function random() {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const between = (min: number, max: number) => Math.round(min + random() * (max - min))

export const tokenTtl = () => (scenario() === 'expired-session' ? '15s' : '1h')

type Forced = { path: string; times: number; status: number | 'network' }
export const forced: Forced[] = []

export async function beforeHandler(baseMs: number, url?: string): Promise<Response | null> {
  const hit = forced.find((f) => f.times > 0 && url?.includes(f.path))
  if (hit) {
    hit.times--
    return hit.status === 'network' ? HttpResponse.error() : HttpResponse.json({ code: 'unavailable', message: 'unavailable' }, { status: hit.status })
  }
  const s = scenario()
  await delay(s === 'slow' ? between(2000, 4000) : s === 'flaky' ? between(100, 2500) : baseMs)
  if (s === 'flaky') {
    const r = random()
    if (r < 0.15) return HttpResponse.error()
    if (r < 0.35) return HttpResponse.json({ code: 'unavailable', message: 'unavailable' }, { status: r < 0.25 ? 500 : 503 })
  }
  return null
}
