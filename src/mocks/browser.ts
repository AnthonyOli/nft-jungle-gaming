import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { socketHandlers } from './socket'
import { initDb, resetDb } from './db'

export const worker = setupWorker(...handlers, ...socketHandlers)

export async function startMocks() {
  await initDb()
  ;(window as unknown as { __kurio: unknown }).__kurio = { resetDb }
  return worker.start({ onUnhandledFrame: 'bypass' })
}
