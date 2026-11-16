import { HttpResponse } from 'msw'
import type { CatalogPage, CatalogSort, Facet } from '../../api/types'
import { cmp, toWei } from '../../lib/eth'
import { db, save } from '../db'
import { authenticate } from '../jwt'
import { detailOf, relatedTo, toNft } from '../nftDetails'
import type { NftRecord } from '../fixtures'
import { scenario } from '../scenario'
import { authed, del, err, get, put } from '../route'

const SORTS: CatalogSort[] = ['featured', 'new', 'hot', 'price-asc', 'price-desc']
const validPrice = (v: string | null) => {
  if (v === null || v === '') return null
  try { toWei(v); return v } catch { return undefined }
}
const facet = (all: NftRecord[], pick: (n: NftRecord) => string): Facet[] => {
  const counts = new Map<string, number>()
  all.forEach((n) => counts.set(pick(n), (counts.get(pick(n)) ?? 0) + 1))
  return [...counts].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
}

const orderBy: Record<CatalogSort, (a: NftRecord, b: NftRecord) => number> = {
  featured: () => 0,
  new: (a, b) => b.createdAt.localeCompare(a.createdAt),
  hot: (a, b) => b.popularity - a.popularity,
  'price-asc': (a, b) => cmp(a.price, b.price),
  'price-desc': (a, b) => cmp(b.price, a.price),
}

export const nfts = [
  get('/api/nfts', ({ request }) => {
    const q = new URL(request.url).searchParams
    const min = validPrice(q.get('minPrice'))
    const max = validPrice(q.get('maxPrice'))
    const sort = (q.get('sort') ?? 'featured') as CatalogSort
    const page = Number(q.get('page') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 9)
    if (min === undefined || max === undefined || !SORTS.includes(sort) || !Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 48) {
      return err(400, 'invalid_data')
    }
    const text = (q.get('q') ?? '').trim().toLowerCase()
    const collections = q.getAll('collection')
    const networks = q.getAll('network')
    const all = db().nfts
    const matches = scenario() === 'empty' ? [] : all
      .filter((n) => !text || [n.name, n.collection, ...n.attributes].some((s) => s.toLowerCase().includes(text)))
      .filter((n) => !collections.length || collections.includes(n.collection))
      .filter((n) => !networks.length || networks.includes(n.network))
      .filter((n) => (min === null || cmp(n.price, min) >= 0) && (max === null || cmp(n.price, max) <= 0))
      .sort(orderBy[sort])
    const pages = Math.max(1, Math.ceil(matches.length / pageSize))
    const result: CatalogPage = {
      items: matches.slice((page - 1) * pageSize, page * pageSize).map(toNft),
      total: matches.length, page, pages, pageSize,
      facets: { collections: facet(all, (n) => n.collection), networks: facet(all, (n) => n.network) },
    }
    return HttpResponse.json(result)
  }, 300),
  get('/api/nfts/promotion', () => HttpResponse.json(toNft(db().nfts.find((n) => n.promotion) ?? db().nfts[0]))),
  get('/api/nfts/:id', async ({ params, request }) => {
    const nft = db().nfts.find((n) => n.id === params.id)
    if (!nft) return err(404, 'not_found')
    const user = await authenticate(request)
    return HttpResponse.json(detailOf(nft, !!user && (db().favorites[user.id] ?? []).includes(nft.id)))
  }),
  get('/api/nfts/:id/related', ({ params, request }) => {
    if (!db().nfts.some((n) => n.id === params.id)) return err(404, 'not_found')
    return HttpResponse.json(relatedTo(db().nfts, params.id, Number(new URL(request.url).searchParams.get('limit')) || 5))
  }),

  get('/api/favorites', authed(({ user }) => {
    const ids = db().favorites[user.id] ?? []
    return HttpResponse.json(db().nfts.filter((n) => ids.includes(n.id)).map(toNft))
  })),
  put('/api/favorites/:id', authed(({ user, params }) => {
    if (!db().nfts.some((n) => n.id === params.id)) return err(404, 'not_found')
    setFavorite(user.id, params.id, true)
    return HttpResponse.json({ favorited: true })
  })),
  del('/api/favorites/:id', authed(({ user, params }) => {
    setFavorite(user.id, params.id, false)
    return HttpResponse.json({ favorited: false })
  })),
]

function setFavorite(userId: string, nftId: string, on: boolean) {
  const ids = new Set(db().favorites[userId] ?? [])
  if (on) ids.add(nftId)
  else ids.delete(nftId)
  db().favorites[userId] = [...ids]
  save()
}
