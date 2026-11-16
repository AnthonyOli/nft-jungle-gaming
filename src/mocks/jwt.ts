import { jwtVerify, SignJWT } from 'jose'
import type { User } from '../api/types'
import { db, type StoredUser } from './db'
import { tokenTtl } from './scenario'

const key = () => new TextEncoder().encode(db().secret)

export const publicUser = ({ id, name, email }: User): User => ({ id, name, email })

export const signToken = (user: User) =>
  new SignJWT({ name: user.name, email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(tokenTtl())
    .sign(key())

export async function userFromToken(token: string): Promise<StoredUser | null> {
  try {
    const { payload } = await jwtVerify(token, key())
    return db().users.find((u) => u.id === payload.sub) ?? null
  } catch {
    return null
  }
}

export const authenticate = (request: Request) => {
  const header = request.headers.get('Authorization')
  return header?.startsWith('Bearer ') ? userFromToken(header.slice(7)) : Promise.resolve(null)
}
