
export type Edition = { id: string; stock: number }
export type Nft = {
  id: string
  name: string
  alt: string
  price: string
  oldPrice?: string
  image: string
  badge?: string
  promotion?: boolean
  collection: string
  network: string
  rarity: string
  attributes: string[]
  version: number
  available: boolean
}
export type NftDetail = Nft & {
  gallery: { src: string; alt: string }[]
  editions: Edition[]
  rating: number
  reviews: number
  about: string
  description: string[]
  networkInfo: string
  contract: string
  copyright: string
  favorited?: boolean
}
export type Facet = { name: string; count: number }
export type CatalogSort = 'featured' | 'new' | 'hot' | 'price-asc' | 'price-desc'
export type CatalogParams = {
  q?: string
  collection?: string[]
  network?: string[]
  minPrice?: string
  maxPrice?: string
  sort?: CatalogSort
  page?: number
  pageSize?: number
}
export type CatalogPage = {
  items: Nft[]
  total: number
  page: number
  pages: number
  pageSize: number
  facets: { collections: Facet[]; networks: Facet[] }
}

export type RealtimeEvent<P = unknown> = { eventId: string; resource: string; version: number; payload: P; userId?: string }
export type NftUpdate = { id: string; name: string; price: string; oldPrice?: string; editions: Edition[]; available: boolean }

export type CartLine = { id: string; edition: string; qty: number }
export type QuoteLine = {
  id: string; edition: string; name: string; alt: string; image: string
  price: string; qty: number; total: string
}
export type QuoteIssue = {
  code: 'unknown_item' | 'sold_out' | 'insufficient_stock'
  id: string; edition: string; stock?: number
}
export type CouponStatus = { code: string; status: 'applied' | 'invalid' | 'expired' }
export type Quote = {
  quoteId: string
  expiresAt: string
  lines: QuoteLine[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  coupon: CouponStatus | null
  issues: QuoteIssue[]
}
export type OrderStatus = 'pending' | 'confirmed' | 'declined'
export type OrderWallet = { type: string; network: string; address: string }
export type Order = {
  id: string
  status: OrderStatus
  createdAt: string
  settledAt?: string
  items: QuoteLine[]
  subtotal: string
  discount: string
  networkFee: string
  total: string
  wallet: OrderWallet
  note?: string
  txId?: string
  explorerUrl?: string
  declineReason?: string
}
export type OrderInput = { quoteId: string; items: CartLine[]; coupon?: string; wallet: OrderWallet; note?: string }

export type User = { id: string; name: string; email: string }
export type Profile = {
  displayName: string; username: string; email: string; ens: string; walletNickname: string; avatar: string | null
}
export type Wallet = {
  displayName: string; walletNickname: string; email: string; ens: string
  network: string; address: string; walletType: string; profileName: string; referralCode: string
}
export type SecondaryWallet = { nickname: string; network: string; address: string; walletType: string }
export type Wallets = { main: Wallet; secondary: SecondaryWallet | null }
export type AuthResponse = { token: string; user: User }
export type FormValues = Record<string, FormDataEntryValue>

export type ApiError = { code: string; message: string; fields?: Record<string, string> }
