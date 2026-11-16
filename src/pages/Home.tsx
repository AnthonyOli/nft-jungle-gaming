import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { controlClass } from '../components/Field'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { BlogCard, FilterSidebar, Hero, LimitedOffer, NftCard, Pagination, PromoBanner, Skeleton } from '../components'
import Button from '../components/Button'
import { getNfts } from '../api'
import { keys } from '../api/queryKeys'
import type { CatalogParams, CatalogSort } from '../api/types'
import { img } from '../data'
import { tList, tObj } from '../lib/i18n'
import type { HomeSearch } from '../router'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCompact } from '../lib/useMediaQuery'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

const postImages = [img.ape3, img.ape1, img.ape2, img.ape4]
const promoImages = [img.ape1, img.ape3]
const TAB_SORTS: CatalogSort[] = ['featured', 'new', 'hot']
const PAGE_SIZE = 9

export default function Home() {
  const { t } = useTranslation()
  const search = useSearch({ strict: false }) as HomeSearch
  const navigate = useNavigate()
  const update = (patch: Partial<HomeSearch>, keepPage = false) =>
    navigate({ to: '/', search: (prev: HomeSearch) => ({ ...prev, ...patch, page: keepPage ? patch.page : undefined }) })

  const params: CatalogParams = { ...search, pageSize: PAGE_SIZE }
  const { data, isLoading, isError, isPlaceholderData, refetch } = useQuery({
    queryKey: keys.nfts(params),
    queryFn: ({ signal }) => getNfts(params, signal),
    placeholderData: keepPreviousData,
  })
  const selected = { collection: search.collection ?? [], network: search.network ?? [] }
  const dirty = !!(search.q || selected.collection.length || selected.network.length || search.minPrice || search.maxPrice)
  const clear = () => update({ q: undefined, collection: undefined, network: undefined, minPrice: undefined, maxPrice: undefined })
  const tabs = tList<string>(t, 'home.tabs')
  const promos = tList<{ title: string; text: string }>(t, 'home.promos')
  const posts = tList<{ title: string; text: string; date: string; readTime: string }>(t, 'home.posts')
  const sort = search.sort ?? 'featured'
  const compact = useCompact()
  const sidebar = (
    <FilterSidebar
      facets={data?.facets}
      selected={selected}
      price={{ min: search.minPrice, max: search.maxPrice }}
      dirty={dirty}
      onClear={clear}
      onToggle={(group, name) => {
        const cur = selected[group]
        update({ [group]: cur.includes(name) ? cur.filter((x) => x !== name) : [...cur, name] })
      }}
      onPrice={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
    />
  )
  return (
    <>
      <Hero image={img.hero} />
      <div className="grid grid-cols-[310px_1fr] gap-12 max-[1100px]:grid-cols-[250px_1fr] max-[1100px]:gap-6 max-[800px]:grid-cols-1">
        <div className="grid content-start gap-6 max-[800px]:order-2">
          {!compact && sidebar}
          <LimitedOffer />
        </div>
        <div>
          {compact && (
            <Sheet>
              <SheetTrigger render={<Button ghost className="mb-4 w-full" />}>{t('filters.open')}{dirty && ' •'}</SheetTrigger>
              <SheetContent side="left">
                <SheetHeader><SheetTitle>{t('filters.open')}</SheetTitle></SheetHeader>
                <div className="overflow-y-auto">{sidebar}</div>
              </SheetContent>
            </Sheet>
          )}
          {compact && (
            <form role="search" aria-label={t('home.catalogSearch')} className="mb-4 flex" onSubmit={(e) => { e.preventDefault(); update({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined }) }}>
              <Input key={search.q ?? ''} name="q" type="search" defaultValue={search.q} className={`${controlClass} flex-1`} placeholder={t('home.searchPh')} aria-label={t('home.search')} />
              <Button type="submit">{t('home.search')}</Button>
            </form>
          )}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <Tabs value={TAB_SORTS.includes(sort) ? sort : ''} onValueChange={(v) => update({ sort: v as CatalogSort })}>
              <TabsList variant="line" className="h-auto flex-wrap justify-start gap-x-[21px] gap-y-1 p-0 max-[800px]:gap-x-4">
                {tabs.map((label, i) => <TabsTrigger key={label} value={TAB_SORTS[i]} className="flex-none px-0 text-[15px] font-medium max-[800px]:text-[14px] data-active:text-brand">{label}</TabsTrigger>)}
              </TabsList>
            </Tabs>
            <label className="flex items-center text-[15px]">
              {t('home.sortBy')}
              <select value={sort} onChange={(e) => update({ sort: e.target.value as CatalogSort })} className="cursor-pointer bg-transparent py-1 pl-1 text-[15px] outline-none focus-visible:outline-2 focus-visible:outline-ring [&>option]:bg-card">
                {Object.entries(tObj(t, 'home.sortOptions')).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </label>
          </div>
          {isError && !data ? (
            <div role="alert" className="py-8 text-center">
              <p className="text-destructive">{t('home.error')}</p>
              <Button onClick={() => refetch()}>{t('errors.retry')}</Button>
            </div>
          ) : !isLoading && data?.items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">{t('home.empty')}</p>
              {dirty && <Button ghost onClick={clear}>{t('filters.clear')}</Button>}
            </div>
          ) : (
            <div className={`grid grid-cols-3 gap-x-8 gap-y-14 max-[800px]:grid-cols-2 max-[800px]:gap-x-4 max-[800px]:gap-y-8 ${isLoading ? '' : 'animate-fade'} ${isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={isLoading || isPlaceholderData}>
              {isLoading && <Skeleton ratio="2/3" count={6} />}
              {data?.items.map((n) => <Link key={n.id} to="/produto/$id" params={{ id: n.id }} className="text-inherit no-underline"><NftCard {...n} /></Link>)}
            </div>
          )}
          {data && <p className="sr-only" aria-live="polite">{t('home.results', { count: data.total })}</p>}
        </div>
      </div>
      {data && data.pages > 1 && <div className="mt-10"><Pagination page={data.page} pages={data.pages} onChange={(page) => update({ page }, true)} /></div>}
      <div className="mt-24 grid grid-cols-2 gap-[27px] max-[800px]:mt-12 max-[800px]:grid-cols-1">
        {promos.map((p, i) => <PromoBanner key={p.title} image={promoImages[i]} {...p} />)}
      </div>
      <h2 className="mt-24 mb-2 text-center text-[28px] max-[800px]:mt-12">{t('home.blogTitle')}</h2>
      <p className="mt-0 mb-9 text-center text-[14px] text-muted-foreground">{t('home.blogSub')}</p>
      <div className="grid grid-cols-4 gap-6 max-[800px]:grid-cols-2 max-[800px]:gap-4">
        {posts.map((p, i) => <BlogCard key={p.title} image={postImages[i]} {...p} />)}
      </div>
    </>
  )
}
