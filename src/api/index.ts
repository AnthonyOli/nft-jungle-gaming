import type {
  AuthResponse, CartLine, CatalogPage, CatalogParams, Nft, NftDetail, Order, OrderInput, Profile, Quote,
  SecondaryWallet, User, Wallets,
} from './types'
import client from './client'
import { setToken } from './token'

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)
type Body = Record<string, unknown>

export const getNfts = (params?: CatalogParams, signal?: AbortSignal) => data<CatalogPage>(client.get('/nfts', { params, signal }))
export const getNft = (id: string, signal?: AbortSignal) => data<NftDetail>(client.get(`/nfts/${id}`, { signal }))
export const getPromotion = (signal?: AbortSignal) => data<Nft>(client.get('/nfts/promotion', { signal }))
export const getRelated = (id: string, limit = 5, signal?: AbortSignal) => data<Nft[]>(client.get(`/nfts/${id}/related`, { params: { limit }, signal }))

export const getFavorites = () => data<Nft[]>(client.get('/favorites'))
export const addFavorite = (id: string) => data<{ favorited: boolean }>(client.put(`/favorites/${id}`))
export const removeFavorite = (id: string) => data<{ favorited: boolean }>(client.delete(`/favorites/${id}`))

export const getCart = () => data<CartLine[]>(client.get('/cart'))
export const addToCart = (line: CartLine) => data<CartLine[]>(client.post('/cart', line))
export const setCartQty = (line: CartLine) => data<CartLine[]>(client.patch(`/cart/${line.id}`, { edition: line.edition, qty: line.qty }))
export const removeFromCart = (id: string, edition: string) => data<CartLine[]>(client.delete(`/cart/${id}`, { params: { edition } }))
export const mergeCart = (lines: CartLine[]) => data<CartLine[]>(client.post('/cart/merge', { lines }))

export const getQuote = (items: CartLine[], coupon?: string, signal?: AbortSignal) => data<Quote>(client.post('/quote', { items, coupon }, { signal }))

export const createOrder = (input: OrderInput, idempotencyKey: string) =>
  data<Order>(client.post('/orders', input, { headers: { 'Idempotency-Key': idempotencyKey } }))
export const getOrder = (id: string) => data<Order>(client.get(`/orders/${id}`))

const auth = (path: string, body: Body) =>
  data<AuthResponse>(client.post(path, body)).then((res) => {
    setToken(res.token)
    return res
  })
export const login = (body: Body) => auth('/auth/login', body)
export const signup = (body: Body) => auth('/auth/signup', body)
export const me = () => data<User>(client.get('/auth/me'))
export const logoutRequest = () => client.post('/auth/logout')

export const getProfile = () => data<Profile>(client.get('/profile'))
export const updateProfile = (body: Body) => data<Profile>(client.put('/profile', body))
export const changePassword = (body: Body) => client.put('/profile/password', body)
export const setAvatar = (dataUrl: string) => data<Profile>(client.put('/profile/avatar', { dataUrl }))
export const removeAvatar = () => data<Profile>(client.delete('/profile/avatar'))
export const getWallets = () => data<Wallets>(client.get('/wallets'))
export const saveMainWallet = (body: Body) => data<Wallets>(client.put('/wallets/main', body))
export const createSecondaryWallet = (w: SecondaryWallet) => data<Wallets>(client.post('/wallets/secondary', w))
export const updateSecondaryWallet = (w: SecondaryWallet) => data<Wallets>(client.put('/wallets/secondary', w))
export const deleteSecondaryWallet = () => data<Wallets>(client.delete('/wallets/secondary'))
