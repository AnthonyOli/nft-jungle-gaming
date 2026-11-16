import { http, HttpResponse, type PathParams } from 'msw'
import { authenticate } from './jwt'
import type { StoredUser } from './db'
import { beforeHandler } from './scenario'

export type Ctx = { request: Request; params: Record<string, string> }
export type AuthedCtx = Ctx & { user: StoredUser }
type Resolver<C> = (ctx: C) => Response | Promise<Response>

export const err = (status: number, code: string, fields?: Record<string, string>) =>
  HttpResponse.json({ code, message: code, ...(fields && { fields }) }, { status })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const body = (request: Request): Promise<Record<string, any>> => request.json().catch(() => ({}))

export const authed = (fn: Resolver<AuthedCtx>): Resolver<Ctx> => async (ctx) => {
  const user = await authenticate(ctx.request)
  return user ? fn({ ...ctx, user }) : err(401, 'unauthorized')
}

const wrap = (fn: Resolver<Ctx>, ms: number) => async ({ request, params }: { request: Request; params: PathParams }) =>
  (await beforeHandler(ms, request.url)) ?? fn({ request, params: params as Record<string, string> })

type Define = (path: string, fn: Resolver<Ctx>, ms?: number) => ReturnType<typeof http.get>
const define = (method: 'get' | 'post' | 'put' | 'patch' | 'delete'): Define => (path, fn, ms = 200) => http[method](path, wrap(fn, ms))
export const get = define('get')
export const post = define('post')
export const put = define('put')
export const patch = define('patch')
export const del = define('delete')
