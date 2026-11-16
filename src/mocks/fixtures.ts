import { img } from '../data'
import type { Edition, Nft, SecondaryWallet, Wallet } from '../api/types'

export type NftRecord = Omit<Nft, 'available'> & { editions: Edition[]; createdAt: string; popularity: number }

const IMAGES = {
  ape1: { src: img.ape1, alt: 'Macaco de óculos redondos e jaqueta verde' },
  ape2: { src: img.ape2, alt: 'Gorila de chapéu e moletom roxo' },
  ape3: { src: img.ape3, alt: 'Macaco de terno claro e gola alta verde' },
  ape4: { src: img.ape4, alt: 'Macaco laranja de fones de ouvido' },
}
type ImageKey = keyof typeof IMAGES
export const GALLERY = Object.values(IMAGES)

const NETWORKS = ['Ethereum', 'Polygon', 'Solana']
const COLLECTIONS: { name: string; image: ImageKey; theme: string }[] = [
  { name: 'Kurio Apes', image: 'ape1', theme: 'Ape' },
  { name: 'Kurio Nomads', image: 'ape2', theme: 'Nomad' },
  { name: 'Kurio Barons', image: 'ape3', theme: 'Baron' },
  { name: 'Kurio Beats', image: 'ape4', theme: 'Beat' },
  { name: 'Kurio Orbs', image: 'ape1', theme: 'Orb' },
  { name: 'Kurio Relics', image: 'ape3', theme: 'Relic' },
]
const COLORS = ['Emerald', 'Sage', 'Neon', 'Cosmic', 'Violet', 'Ivory', 'Golden', 'Crimson', 'Azure', 'Amber', 'Onyx', 'Coral']
const RARITIES = ['Comum', 'Raro', 'Épico']
const TRAITS: Record<string, string[]> = { ape1: ['Óculos', 'Esmeralda'], ape2: ['Chapéu', 'Roxo'], ape3: ['Terno', 'Verde'], ape4: ['Fones', 'Dourado'] }

const original: Omit<NftRecord, 'editions' | 'createdAt' | 'popularity' | 'version' | 'alt' | 'network' | 'rarity'>[] = [
  { id: '0042', name: 'Emerald Ape #042', price: '1.19', image: img.ape1, badge: 'RARO', collection: 'Kurio Apes', attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  { id: '0089', name: 'Sage Nomad #089', price: '1.69', image: img.ape2, collection: 'Kurio Nomads', attributes: ['Chapéu', 'Roxo', 'Comum'] },
  { id: '0052', name: 'Neon Vessel #052', price: '1.99', oldPrice: '2.29', promotion: true, image: img.ape3, collection: 'Kurio Barons', attributes: ['Terno', 'Verde', 'Épico'] },
  { id: '0118', name: 'Cosmic Bloom #118', price: '1.29', image: img.ape2, collection: 'Kurio Nomads', attributes: ['Chapéu', 'Roxo', 'Comum'] },
  { id: '0314', name: 'Violet Nomad #314', price: '1.39', image: img.ape2, collection: 'Kurio Nomads', attributes: ['Chapéu', 'Roxo', 'Raro'] },
  { id: '0088', name: 'Ivory Baron #088', price: '1.79', image: img.ape3, collection: 'Kurio Barons', attributes: ['Terno', 'Marfim', 'Raro'] },
  { id: '0207', name: 'Golden Beat #207', price: '0.99', image: img.ape4, collection: 'Kurio Beats', attributes: ['Fones', 'Dourado', 'Comum'] },
  { id: '0071', name: 'Golden Frequency #071', price: '0.59', image: img.ape4, collection: 'Kurio Beats', attributes: ['Fones', 'Dourado', 'Raro'] },
  { id: '0160', name: 'Golden Signal #160', price: '0.39', image: img.ape4, collection: 'Kurio Beats', attributes: ['Fones', 'Dourado', 'Épico'] },
]

const altOf = (src: string) => GALLERY.find((g) => g.src === src)?.alt ?? ''
const DAY = 86_400_000
const EPOCH = Date.UTC(2026, 0, 1)

function editionsFor(i: number, id: string): Edition[] {
  const stock = { '1/1': 1, '1/10': 10, '1/50': 50, ABERTA: 999 }
  if (i % 7 === 0) stock['1/1'] = 0
  if (i % 5 === 0) stock['1/10'] = 2
  if (id === '0071') stock['1/50'] = 3
  if (id === '0160') Object.keys(stock).forEach((k) => (stock[k as keyof typeof stock] = 0))
  return Object.entries(stock).map(([id, n]) => ({ id, stock: n }))
}

const generated: typeof original = Array.from({ length: 33 }, (_, k) => {
  const col = COLLECTIONS[k % COLLECTIONS.length]
  const rarity = RARITIES[(k * 7 + 1) % 3]
  const num = String(120 + k * 17).padStart(4, '0')
  const [obj, color] = TRAITS[col.image]
  return {
    id: num,
    name: `${COLORS[(k * 5) % COLORS.length]} ${col.theme} #${num.slice(1)}`,
    price: (0.25 + ((k * 37) % 190) / 100).toFixed(2),
    ...(k % 9 === 4 ? { oldPrice: (0.25 + ((k * 37) % 190) / 100 + 0.3).toFixed(2) } : {}),
    image: IMAGES[col.image].src,
    collection: col.name,
    attributes: [obj, color, rarity],
  }
})

export const catalog = (): NftRecord[] =>
  [...original, ...generated].map((n, i) => ({
    ...n,
    alt: altOf(n.image),
    network: NETWORKS[i % NETWORKS.length],
    rarity: n.attributes[2],
    version: 1,
    editions: editionsFor(i, n.id),
    createdAt: new Date(EPOCH + (60 - i) * DAY).toISOString(),
    popularity: (i * 53) % 97,
  }))

export const SEED_PASSWORD = '123456'
type SeedUser = {
  id: string; name: string; email: string; displayName: string; username: string; ens: string; walletNickname: string
  wallet: Partial<Wallet>; secondary: SecondaryWallet | null
}
export const seedUsers: SeedUser[] = [
  {
    id: '1', name: 'Demo', email: 'demo@kurio.com', displayName: 'Demo Collector', username: 'demo', ens: 'demo', walletNickname: 'Principal',
    wallet: { network: 'Ethereum', address: '0x7A42c9D1b8E5F03a64B2d7e19E8', walletType: 'MetaMask', profileName: 'Demo', referralCode: 'KURIO-DEMO' },
    secondary: { nickname: 'Reserva', network: 'Polygon', address: '0x91B3a07C5d2e48F6b19A0c3D7e5', walletType: 'Coinbase Wallet' },
  },
  {
    id: '2', name: 'Ana', email: 'ana@kurio.com', displayName: 'Ana Souza', username: 'ana', ens: 'ana', walletNickname: 'Pessoal',
    wallet: { network: 'Solana', address: '0x3C8d51aE92b7F40c6D1e8B2a97f', walletType: 'Coinbase Wallet', profileName: 'Ana', referralCode: 'KURIO-ANA' },
    secondary: null,
  },
]
