import { auth } from './auth'
import { dev } from './dev'
import { cart } from './cart'
import { nfts } from './nfts'
import { orders } from './orders'
import { profile } from './profile'
import { quote } from './quote'
import { wallets } from './wallets'

export const handlers = [...auth, ...nfts, ...cart, ...quote, ...orders, ...profile, ...wallets, ...dev]
