import { useSyncExternalStore } from 'react'

export const useMediaQuery = (query: string) =>
  useSyncExternalStore(
    (cb) => { const m = matchMedia(query); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb) },
    () => matchMedia(query).matches,
  )
export const useCompact = () => useMediaQuery('(max-width: 800px)')
