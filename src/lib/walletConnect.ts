import type { OrderWallet } from '../api/types'

export const connectWallet = (w: OrderWallet) =>
  new Promise<void>((resolve, reject) => setTimeout(() => (/dead$/i.test(w.address) ? reject(new Error('wallet_refused')) : resolve()), 800))
