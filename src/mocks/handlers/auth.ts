import { HttpResponse } from 'msw'
import { publicUser, signToken } from '../jwt'
import { createUser, findByCredentials } from '../users'
import { authed, body, err, get, post } from '../route'

export const auth = [
  post('/api/auth/login', async ({ request }) => {
    const { email, password } = await body(request)
    const user = typeof email === 'string' && typeof password === 'string' ? await findByCredentials(email, password) : null
    if (!user) return err(401, 'invalid_credentials')
    return HttpResponse.json({ token: await signToken(user), user: publicUser(user) })
  }, 400),
  post('/api/auth/signup', async ({ request }) => {
    const { username, email, password, confirm } = await body(request)
    const fields: Record<string, string> = {}
    if (!username) fields.username = 'invalid_data'
    if (!email) fields.email = 'invalid_data'
    if (typeof password !== 'string' || password.length < 6) fields.password = 'invalid_data'
    else if (password !== confirm) fields.confirm = 'password_mismatch'
    if (Object.keys(fields).length) return err(400, Object.values(fields).includes('password_mismatch') && Object.keys(fields).length === 1 ? 'password_mismatch' : 'invalid_data', fields)
    const user = await createUser({ username, email, password })
    if (!user) return err(409, 'email_taken', { email: 'email_taken' })
    return HttpResponse.json({ token: await signToken(user), user: publicUser(user) }, { status: 201 })
  }, 400),
  get('/api/auth/me', authed(({ user }) => HttpResponse.json(publicUser(user)))),
  post('/api/auth/logout', () => new HttpResponse(null, { status: 204 }), 100),
]
