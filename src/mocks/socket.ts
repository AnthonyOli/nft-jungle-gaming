import { toSocketIo } from '@mswjs/socket.io-binding'
import { ws } from 'msw'
import { db } from './db'
import { peers, stats, type Peer } from './events'
import { scheduleSettle, settleOrders } from './handlers/orders'
import { userFromToken } from './jwt'

const PING_MS = 20_000

export const socketLink =
ws.link(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`)

export const socketHandlers = [
  socketLink.addEventListener('connection', (connection) => {
    const io = toSocketIo(connection)
    const peer: Peer = {
      userId: null,
      emit: (event, data) => io.client.emit(event, data),
      close: () => connection.client.close(),
    }
    peers.add(peer)
    stats.connections++
    const ping = setInterval(() => connection.client.send('2'), PING_MS)
    connection.client.addEventListener('close', () => { clearInterval(ping); peers.delete(peer) })
    connection.client.addEventListener('message', async (e) => {
      if (typeof e.data !== 'string' || !e.data.startsWith('40') || e.data.length < 3) return
      let token: unknown
      try { token = JSON.parse(e.data.slice(2)).token } catch { return }
      const user = typeof token === 'string' ? await userFromToken(token) : null
      if (!user || !peers.has(peer)) return
      peer.userId = user.id
      settleOrders(user.id)
      db().orders.filter((o) => o.userId === user.id).forEach(scheduleSettle)
    })
  }),
]
