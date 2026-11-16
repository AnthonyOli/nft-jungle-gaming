import { HttpResponse } from 'msw'
import type { SecondaryWallet } from '../../api/types'
import { updateUser, walletsOf } from '../users'
import { authed, body, del, err, get, post, put } from '../route'

const EDITABLE: (keyof SecondaryWallet)[] = ['nickname', 'network', 'address', 'walletType']

async function readSecondary(request: Request) {
  const raw = await body(request)
  const fields: Record<string, string> = {}
  for (const k of EDITABLE) if (typeof raw[k] !== 'string' || !raw[k].trim()) fields[k] = 'invalid_data'
  if (typeof raw.address === 'string' && raw.address.trim() && !/^0x[0-9a-fA-F]{8,}$/.test(raw.address.trim())) fields.address = 'invalid_address'
  const wallet: SecondaryWallet = { nickname: raw.nickname, network: raw.network, address: raw.address?.trim(), walletType: raw.walletType }
  return { wallet, fields }
}

export const wallets = [
  get('/api/wallets', authed(({ user }) => HttpResponse.json(walletsOf(user)))),
  put('/api/wallets/main', authed(async ({ user, request }) => {
    const { displayName, walletNickname, ...wallet } = await body(request)
    const fields: Record<string, string> = {}
    if (!displayName) fields.displayName = 'invalid_data'
    if (!wallet.address) fields.address = 'invalid_data'
    else if (!/^0x[0-9a-fA-F]{8,}$/.test(wallet.address)) fields.address = 'invalid_address'
    if (Object.keys(fields).length) return err(400, 'invalid_data', fields)
    return HttpResponse.json(walletsOf(updateUser(user.id, { displayName, walletNickname, ens: wallet.ens ?? '', wallet })))
  }), 300),
  post('/api/wallets/secondary', authed(async ({ user, request }) => {
    if (user.secondary) return err(409, 'wallet_exists')
    const { wallet, fields } = await readSecondary(request)
    if (Object.keys(fields).length) return err(400, 'invalid_data', fields)
    return HttpResponse.json(walletsOf(updateUser(user.id, { secondary: wallet })), { status: 201 })
  }), 300),
  put('/api/wallets/secondary', authed(async ({ user, request }) => {
    if (!user.secondary) return err(404, 'not_found')
    const { wallet, fields } = await readSecondary(request)
    if (Object.keys(fields).length) return err(400, 'invalid_data', fields)
    return HttpResponse.json(walletsOf(updateUser(user.id, { secondary: wallet })))
  }), 300),
  del('/api/wallets/secondary', authed(({ user }) => HttpResponse.json(walletsOf(updateUser(user.id, { secondary: null }))))),
]
