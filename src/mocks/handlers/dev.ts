import { http, HttpResponse } from 'msw'
import { db, save, touchNft } from '../db'
import { emitRaw, peers, stats } from '../events'
import { forced } from '../scenario'

export const dev = [
  http.patch('/api/dev/nfts/:id', async ({ request, params }) => {
    const nft = db().nfts.find((n) => n.id === params.id)
    if (!nft) return HttpResponse.json({ code: 'not_found' }, { status: 404 })
    const { price, stock } = (await request.json().catch(() => ({}))) as { price?: string; stock?: Record<string, number> }
    if (typeof price === 'string' && /^\d+(\.\d{1,18})?$/.test(price)) nft.price = price
    for (const [edition, n] of Object.entries(stock ?? {})) {
      const ed = nft.editions.find((e) => e.id === edition)
      if (ed && Number.isInteger(n) && n >= 0) ed.stock = n
    }
    touchNft(nft)
    save()
    return HttpResponse.json({ version: nft.version })
  }),
  http.post('/api/dev/events', async ({ request }) => {
    const { event, data } = (await request.json()) as { event: string; data: Parameters<typeof emitRaw>[1] }
    emitRaw(event, data)
    return HttpResponse.json({ sent: true })
  }),
  http.post('/api/dev/fail', async ({ request }) => {
    const { path, times = 1, status = 500 } = (await request.json()) as { path: string; times?: number; status?: number | 'network' }
    forced.push({ path, times, status })
    return HttpResponse.json({ queued: times })
  }),
  http.get('/api/dev/socket', () => HttpResponse.json({ peers: peers.size, connections: stats.connections })),
  http.post('/api/dev/socket/drop', () => {
    const n = peers.size
    peers.forEach((p) => p.close())
    return HttpResponse.json({ dropped: n })
  }),
]
