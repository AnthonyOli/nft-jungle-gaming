import { useSyncExternalStore } from 'react'

export function localStore<T>(key: string, fallback: T, parse: (raw: string) => T) {
  const listeners = new Set<() => void>()
  let memo: { raw: string | null; value: T } = { raw: null, value: fallback }
  const get = () => {
    const raw = localStorage.getItem(key)
    if (raw !== memo.raw) {
      let value = fallback
      try { value = raw === null ? fallback : parse(raw) } catch { }
      memo = { raw, value }
    }
    return memo.value
  }
  const emit = () => listeners.forEach((l) => l())
  window.addEventListener('storage', (e) => e.key === key && emit())
  return {
    get,
    set(value: T | null) {
      if (value === null) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(value))
      emit()
    },
    use: () => useSyncExternalStore((cb) => (listeners.add(cb), () => void listeners.delete(cb)), get),
  }
}
