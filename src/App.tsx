import { Outlet, useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { AuthModal, Footer, Header } from './components'
import BottomNav from './components/BottomNav'
import { UNAUTHORIZED_EVENT } from './api/client'
import { useAuth } from './auth'
import { mergeGuestCart, useCart } from './cart'
import { useRealtime } from './realtime'
import { useTranslation } from 'react-i18next'
import { Toaster } from '@/components/ui/sonner'
import type { User } from './api/types'

type Search = { login?: true; redirect?: string }

export default function App() {
  const { t } = useTranslation()
  const { units } = useCart()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { login, redirect } = useSearch({ strict: false })
  useRealtime(user?.id)

  const openLogin = () => navigate({ to: '.', search: (p: Search) => ({ ...p, login: true, redirect: pathname }) })
  const closeLogin = () => navigate({ to: '.', search: (p: Search) => ({ ...p, login: undefined, redirect: undefined }) })

  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current !== pathname) document.getElementById('main')?.focus()
    lastPath.current = pathname
  }, [pathname])

  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, openLogin)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, openLogin)
  })

  return (
    <div className="mx-auto max-w-[1232px] px-4 max-[800px]:pb-16">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:px-3 focus:py-1 focus:text-primary-foreground">{t('a11y.skip')}</a>
      <Header cartCount={units} onLogin={openLogin} />
      <main id="main" tabIndex={-1} className="min-h-[70vh] outline-none"><Outlet /></main>
      <Footer />
      <BottomNav cartCount={units} />
      <Toaster />
      {login && !user && (
        <AuthModal
          onClose={closeLogin}
          onSuccess={(u: User) => {
            setUser(u)
            mergeGuestCart(u.id).catch(() => {})
            navigate({ href: redirect ?? pathname })
          }}
        />
      )}
    </div>
  )
}
