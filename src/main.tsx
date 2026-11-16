import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import './index.css'
import { queryClient } from './api/queryClient'
import { router } from './router'

async function enableMocking() {
  if (!import.meta.env.DEV && !import.meta.env.VITE_MOCKS) return
  const { startMocks } = await import('./mocks/browser')
  return startMocks()
}

enableMocking().then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  ),
)
