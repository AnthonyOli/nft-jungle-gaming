import axios from 'axios'
import { clearToken, getToken } from './token'

export const UNAUTHORIZED_EVENT = 'kurio:unauthorized'

const client = axios.create({ baseURL: '/api', timeout: 10_000, paramsSerializer: { indexes: null } })

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(undefined, (error) => {
  const url = error.config?.url ?? ''
  if (error.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/signup')) {
    clearToken()
    if (!url.startsWith('/auth/me')) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return Promise.reject(error)
})

export default client
