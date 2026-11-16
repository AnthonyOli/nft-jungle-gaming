import { HttpResponse } from 'msw'
import { emailTaken, hashPassword, profileOf, updateUser, verifyPassword } from '../users'
import { authed, body, del, err, get, put } from '../route'

const MAX_AVATAR_CHARS = 300_000

export const profile = [
  get('/api/profile', authed(({ user }) => HttpResponse.json(profileOf(user)))),
  put('/api/profile', authed(async ({ user, request }) => {
    const { displayName, username, email, ens = '', walletNickname = '' } = await body(request)
    const fields: Record<string, string> = {}
    for (const [k, v] of Object.entries({ displayName, username, email })) if (typeof v !== 'string' || !v.trim()) fields[k] = 'invalid_data'
    if (Object.keys(fields).length) return err(400, 'invalid_data', fields)
    if (emailTaken(email, user.id)) return err(409, 'email_taken', { email: 'email_taken' })
    return HttpResponse.json(profileOf(updateUser(user.id, { displayName, username, email: email.toLowerCase(), ens, walletNickname })))
  }), 300),
  put('/api/profile/password', authed(async ({ user, request }) => {
    const { current, next, confirm } = await body(request)
    if (!(await verifyPassword(current ?? '', user.hash))) return err(400, 'wrong_password', { current: 'wrong_password' })
    if (typeof next !== 'string' || next.length < 6) return err(400, 'invalid_data', { next: 'invalid_data' })
    if (next !== confirm) return err(400, 'password_mismatch', { confirm: 'password_mismatch' })
    updateUser(user.id, { hash: await hashPassword(next) })
    return new HttpResponse(null, { status: 204 })
  }), 300),
  put('/api/profile/avatar', authed(async ({ user, request }) => {
    const { dataUrl } = await body(request)
    if (typeof dataUrl !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(dataUrl)) return err(400, 'invalid_data', { avatar: 'invalid_data' })
    if (dataUrl.length > MAX_AVATAR_CHARS) return err(413, 'avatar_too_large', { avatar: 'avatar_too_large' })
    return HttpResponse.json(profileOf(updateUser(user.id, { avatar: dataUrl })))
  }), 500),
  del('/api/profile/avatar', authed(({ user }) => HttpResponse.json(profileOf(updateUser(user.id, { avatar: null }))))),
]
