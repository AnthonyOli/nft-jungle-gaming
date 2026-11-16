import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export default function BottomNav({ cartCount }: { cartCount: number }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const tabs = [
    { to: '/', label: t('nav.home'), icon: '⌂', on: pathname === '/' },
    { to: '/carrinho', label: t('header.cart'), icon: '🛒', on: pathname.startsWith('/carrinho') || pathname.startsWith('/pagamento') || pathname.startsWith('/pedido'), badge: cartCount },
    { to: '/perfil', label: t('nav.profile'), icon: '☺', on: pathname.startsWith('/perfil') },
  ] as const
  return (
    <nav aria-label={t('header.tabBar')} className="fixed inset-x-0 bottom-0 z-40 hidden border-t bg-background max-[800px]:flex">
      {tabs.map((tab) => (
        <Link key={tab.to} to={tab.to} aria-current={tab.on ? 'page' : undefined}
          className={cn('flex flex-1 flex-col items-center py-2 text-xs no-underline', tab.on ? 'text-brand' : 'text-muted-foreground')}>
          <span aria-hidden="true" className="text-lg leading-none">{tab.icon}{'badge' in tab && tab.badge > 0 && <sup>{tab.badge}</sup>}</span>
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
