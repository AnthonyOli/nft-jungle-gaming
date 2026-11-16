import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogInIcon, MenuIcon, SearchIcon, ShoppingCartIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth'
import { unavailable } from '../lib/unavailable'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import Button from './Button'
const navItem = 'flex items-center border-b-[3px] border-transparent text-[16px] no-underline'
const links = [['home', '/'], ['market', '/carrinho']] as const
const disabledLinks = ['creators', 'learn'] as const
const isMarket = (path: string) => ['/produto', '/carrinho', '/pagamento'].some((p) => path.startsWith(p))

function Search({ always, onDone }: { always?: boolean; onDone?: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const shown = always || open
  return (
    <form role="search" aria-label={t('header.quickSearch')} className="flex items-center gap-2" onSubmit={(e) => {
      e.preventDefault()
      const q = String(new FormData(e.currentTarget).get('q') ?? '').trim()
      navigate({ to: '/', search: q ? { q } : {} })
      setOpen(false)
      onDone?.()
    }}>
      {shown && (
        <input name="q" type="search" autoFocus={!always} aria-label={t('header.search')} placeholder={t('header.search')}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="w-44 rounded-sm bg-card px-3 py-1.5 text-[14px] max-[800px]:w-full max-[800px]:py-2" />
      )}
      {!always && (
        <button type="button" aria-label={t('header.search')} aria-expanded={open} onClick={() => setOpen(!open)} className="grid size-8 cursor-pointer place-items-center">
          <SearchIcon aria-hidden="true" className="size-6" />
        </button>
      )}
    </form>
  )
}

export default function Header({ cartCount = 0, onLogin }: { cartCount?: number; onLogin: () => void }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const active = isMarket(pathname) ? 'market' : pathname === '/' ? 'home' : null
  const leave = () => { logout(); setMenu(false); navigate({ to: '/', search: {} }) }
  const navLinks = (onPick?: () => void, stacked?: boolean) => (
    <>
      {links.map(([k, h]) => (
        <Link key={k} to={h} onClick={onPick} className={cn(navItem, '-mb-px', stacked && 'pb-2', k === active && 'border-brand text-brand')}>{t(`nav.${k}`)}</Link>
      ))}
      {disabledLinks.map((k) => (
        <button key={k} type="button" aria-disabled="true" onClick={unavailable} className={cn(navItem, '-mb-px cursor-not-allowed text-left opacity-60', stacked && 'pb-2')}>{t(`nav.${k}`)}</button>
      ))}
    </>
  )
  return (
    <header className="flex h-[68px] items-stretch justify-between border-b">
      <Link to="/" className="flex items-center text-[15px] tracking-[1.5px] no-underline"><b>KURIO</b></Link>
      <nav aria-label={t('header.mainNav')} className="ml-[122px] flex gap-10 max-[1100px]:ml-0 max-[800px]:hidden">{navLinks()}</nav>
      <div className="flex min-w-[205px] items-center justify-end gap-6 max-[800px]:min-w-0">
        <div className="max-[800px]:hidden"><Search /></div>
        <Link to="/carrinho" className="relative grid size-8 place-items-center max-[800px]:hidden">
          <span className="sr-only">{t('header.cart')}</span>
          <ShoppingCartIcon aria-hidden="true" className="size-6" />
          {cartCount > 0 && <span className="absolute -top-0.5 -right-1.5 grid size-4 place-items-center rounded-full bg-primary text-[10px] leading-none font-bold text-primary-foreground">{cartCount}</span>}
        </Link>
        <div className="flex items-center gap-4 max-[800px]:hidden">
          {user ? (
            <>
              <Link to="/perfil" className="text-[15px]">{user.name}</Link>
              <Button ghost onClick={leave} className="h-9 text-[16px] font-medium normal-case">{t('header.logout')}</Button>
            </>
          ) : (
            <Button onClick={onLogin} className="h-9 gap-2 rounded-[6px] px-3 text-[16px] font-medium normal-case"><LogInIcon aria-hidden="true" className="size-[18px]" />{t('header.login')}</Button>
          )}
        </div>
        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetTrigger render={<button type="button" aria-label={t('header.menu')} className="hidden size-10 place-items-center max-[800px]:grid" />}><MenuIcon aria-hidden="true" /></SheetTrigger>
          <SheetContent side="right">
            <SheetHeader><SheetTitle>{t('header.menu')}</SheetTitle></SheetHeader>
            <div className="grid gap-4 overflow-y-auto px-4 pb-4">
              <Search always onDone={() => setMenu(false)} />
              <nav aria-label={t('header.mainNav')} className="grid gap-3">{navLinks(() => setMenu(false), true)}</nav>
              {user ? (
                <>
                  <Link to="/perfil" onClick={() => setMenu(false)}>{user.name}</Link>
                  <Button ghost onClick={leave}>{t('header.logout')}</Button>
                </>
              ) : (
                <Button onClick={() => { setMenu(false); onLogin() }}>{t('header.login')}</Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
