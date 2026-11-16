import type { Profile, Wallet, Wallets } from '../api/types'
import { db, save, type StoredUser } from './db'
import { hashPassword, verifyPassword } from './password'

export const profileOf = (u: StoredUser): Profile => ({
  displayName: u.displayName, username: u.username, email: u.email, ens: u.ens, walletNickname: u.walletNickname, avatar: u.avatar,
})

export const walletsOf = (u: StoredUser): Wallets => {
  const main: Wallet = {
    displayName: u.displayName, walletNickname: u.walletNickname, email: u.email, ens: u.ens,
    network: '', address: '', walletType: '', profileName: '', referralCode: '',
    ...u.wallet,
  }
  return { main, secondary: u.secondary }
}

export function updateUser(id: string, patch: Partial<StoredUser>) {
  const users = db().users
  const i = users.findIndex((u) => u.id === id)
  users[i] = { ...users[i], ...patch }
  save()
  return users[i]
}

export const emailTaken = (email: string, exceptId?: string) =>
  db().users.some((u) => u.email === email.toLowerCase() && u.id !== exceptId)

export async function findByCredentials(email: string, password: string) {
  const user = db().users.find((u) => u.email === email.toLowerCase())
  return user && (await verifyPassword(password, user.hash)) ? user : null
}

export async function createUser({ username, email, password }: { username: string; email: string; password: string }) {
  if (emailTaken(email)) return null
  const user: StoredUser = {
    id: String(Date.now()), name: username, email: email.toLowerCase(), hash: await hashPassword(password),
    displayName: username, username: username.toLowerCase(), ens: '', walletNickname: '', avatar: null, wallet: {}, secondary: null,
  }
  db().users.push(user)
  save()
  return user
}

export { hashPassword, verifyPassword }
