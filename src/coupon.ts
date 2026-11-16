import { localStore } from './lib/localStore'

const store = localStore<string | null>('kurio:coupon', null, (raw) => JSON.parse(raw))
export const useCoupon = () => [store.use() ?? undefined, (code: string | null) => store.set(code)] as const
