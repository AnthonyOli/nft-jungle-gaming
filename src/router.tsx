import { createRootRoute, createRoute, createRouter, lazyRouteComponent, redirect } from '@tanstack/react-router'
import type { RouteComponent } from '@tanstack/react-router'
import App from './App'
import type { CatalogSort } from './api/types'
import { isLoggedIn } from './api/token'
import Home from './pages/Home'

export type HomeSearch = { q?: string; collection?: string[]; network?: string[]; minPrice?: string; maxPrice?: string; sort?: CatalogSort; page?: number }

const root = createRootRoute({
  component: App,
  validateSearch: (s: Record<string, unknown>) => ({
    login: s.login ? true : undefined,
    redirect: typeof s.redirect === 'string' && /^\/(?!\/)/.test(s.redirect) ? s.redirect : undefined,
  }),
})
const page = (path: string, component: RouteComponent, options?: Partial<{ beforeLoad: typeof requireAuth; validateSearch: (s: Record<string, unknown>) => object }>) => createRoute({ getParentRoute: () => root, path, component, ...options })

const requireAuth = ({ location }: { location: { pathname: string } }) => {
  if (!isLoggedIn()) throw redirect({ to: '/', search: { login: true, redirect: location.pathname } })
}

const SORTS = ['featured', 'new', 'hot', 'price-asc', 'price-desc']
const strings = (v: unknown) => (Array.isArray(v) ? v.map(String) : v === undefined ? [] : [String(v)])
export function validateHomeSearch(s: Record<string, unknown>): HomeSearch {
  const page = Number(s.page)
  const price = (v: unknown) => (/^\d+(\.\d{1,18})?$/.test(String(v ?? '')) ? String(v) : undefined)
  return {
    q: s.q ? String(s.q) : undefined,
    collection: strings(s.collection).length ? strings(s.collection) : undefined,
    network: strings(s.network).length ? strings(s.network) : undefined,
    minPrice: price(s.minPrice),
    maxPrice: price(s.maxPrice),
    sort: SORTS.includes(String(s.sort)) ? (String(s.sort) as CatalogSort) : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}

const lazyPage = (load: () => Promise<{ default: RouteComponent }>) => lazyRouteComponent(load)
const Cart = lazyPage(() => import('./pages/Cart'))
const Checkout = lazyPage(() => import('./pages/Checkout'))
const Order = lazyPage(() => import('./pages/Order'))
const Product = lazyPage(() => import('./pages/Product'))
const Profile = lazyPage(() => import('./pages/Profile'))

const routeTree = root.addChildren([
  page('/', Home, { validateSearch: validateHomeSearch }),
  page('/produto/$id', Product),
  page('/carrinho', Cart),
  page('/pagamento', Checkout, { beforeLoad: requireAuth }),
  page('/pedido/$id', Order, { beforeLoad: requireAuth }),
  page('/perfil', Profile, { beforeLoad: requireAuth }),
  page('/perfil/carteiras', Profile, { beforeLoad: requireAuth }),
])

export const router = createRouter({ routeTree })
