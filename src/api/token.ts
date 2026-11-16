const KEY = 'kurio:token'

export const getToken = () => localStorage.getItem(KEY)
export const setToken = (token: string) => localStorage.setItem(KEY, token)
export const clearToken = () => localStorage.removeItem(KEY)

export function isLoggedIn() {
  const token = getToken()
  if (!token) return false
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return exp * 1000 > Date.now()
  } catch {
    return false
  }
}
