import type { CartLine, NftUpdate, Order, SecondaryWallet, Wallet } from '../api/types'
import { catalog, seedUsers, SEED_PASSWORD, type NftRecord } from './fixtures'
import { publish } from './events'
import { hashPassword } from './password'

const KEY = 'kurio:db:v1'

export type StoredUser = {
  id: string; name: string; email: string; hash: string
  displayName: string; username: string; ens: string; walletNickname: string; avatar: string | null
  wallet: Partial<Wallet>; secondary: SecondaryWallet | null
}
export type QuoteRecord = { total: string; expiresAt: number; coupon: string | null }
export type OrderRecord = Order & {
  userId: string
  settleAt: number
  outcome: 'confirmed' | 'declined'
  reserved: CartLine[]
  settled: boolean
}
export type Db = {
  version: 1
  secret: string
  users: StoredUser[]
  nfts: NftRecord[]
  carts: Record<string, CartLine[]>
  favorites: Record<string, string[]>
  quotes: Record<string, QuoteRecord>
  orders: OrderRecord[]
  idempotency: Record<string, { bodyHash: string; orderId: string }>
  fired: Record<string, true>
}

let state: Db | null = null

async function seed(): Promise<Db> {
  const hash = await hashPassword(SEED_PASSWORD)
  return {
    version: 1,
    secret: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join(''),
    users: seedUsers.map(({ secondary, ...u }) => ({ ...u, hash, avatar: null, secondary })),
    nfts: catalog(),
    carts: {},
    favorites: {},
    quotes: {},
    orders: [],
    idempotency: {},
    fired: {},
  }
}

export async function initDb() {
  const saved = localStorage.getItem(KEY)
  if (saved) {
    const parsed = JSON.parse(saved) as Db
    if (parsed.version === 1) return void (state = { ...parsed, fired: parsed.fired ?? {} })
  }
  state = await seed()
  save()
}

export const db = () => state!
export const save = () => localStorage.setItem(KEY, JSON.stringify(state))

export async function resetDb() {
  state = await seed()
  save()
}

export function touchNft(nft: NftRecord) {
  nft.version++
  publish<NftUpdate>('nft.updated', `nft:${nft.id}`, nft.version, {
    id: nft.id, name: nft.name, price: nft.price, oldPrice: nft.oldPrice, editions: nft.editions.map(({ id, stock }) => ({ id, stock })),
    available: nft.editions.some((e) => e.stock > 0),
  })
}
