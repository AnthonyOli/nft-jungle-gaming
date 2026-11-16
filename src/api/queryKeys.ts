import type { CartLine, CatalogParams } from './types'

export const keys = {
  me: ['me'] as const,
  nfts: (params?: CatalogParams) => ['nfts', params ?? {}] as const,
  promotion: ['nfts', 'promotion'] as const,
  related: (id: string) => ['nfts', 'related', id] as const,
  nft: (id: string, userId?: string) => ['nft', id, userId ?? null] as const,
  cart: (userId?: string) => ['cart', userId ?? null] as const,
  quote: (userId: string | undefined, lines: CartLine[], coupon?: string) => ['quote', userId ?? null, lines, coupon ?? null] as const,
  order: (id: string, userId?: string) => ['order', id, userId ?? null] as const,
  profile: (userId?: string) => ['profile', userId ?? null] as const,
  wallets: (userId?: string) => ['wallets', userId ?? null] as const,
}
