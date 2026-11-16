import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useRouter } from '@tanstack/react-router'
import { ChevronLeftIcon, HeartIcon, SearchIcon, ShoppingCartIcon, StarIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { addFavorite, getNft, getRelated, removeFavorite } from '../api'
import { keys } from '../api/queryKeys'
import type { NftDetail } from '../api/types'
import { useAuth } from '../auth'
import { useCart } from '../cart'
import { Breadcrumb, Button, NftRow, Section, Skeleton } from '../components'
import { errorStatus, errorText } from '../lib/errors'
import { Button as UiButton } from '@/components/ui/button'
import { unavailable } from '../lib/unavailable'
import { useCompact } from '../lib/useMediaQuery'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
const tabTrigger = 'h-auto flex-none rounded-none px-0 pb-2 text-[16px] max-[800px]:text-[14px] after:bottom-[-1px] after:bg-primary data-active:font-bold data-active:text-brand'
const grid5 = 'grid grid-cols-5 gap-4 max-[800px]:grid-cols-2'
const qtyBtn = 'h-11 w-8 rounded-full bg-primary text-[22px] font-bold text-primary-foreground hover:bg-primary/80'
const productGrid = 'grid grid-cols-[100px_minmax(0,446px)_1fr] gap-x-7 gap-y-6 max-[1100px]:grid-cols-[100px_1fr_1fr] max-[800px]:grid-cols-1'


function ProductSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-label={label}>
      <Skeleton w={160} />
      <div className={`mt-4 ${productGrid}`}>
        <div className="grid content-start gap-3"><Skeleton ratio="1" count={3} /></div>
        <Skeleton ratio="1" />
        <div>
          <Skeleton w="60%" h={28} />
          <Skeleton h={24} mt={16} />
          <Skeleton w={80} mt={24} />
          <Skeleton mt={12} /><Skeleton w="90%" mt={8} />
          <Skeleton w={80} mt={24} />
          <Skeleton w={200} h={32} mt={12} />
          <Skeleton h={40} mt={24} />
          <Skeleton w="70%" mt={24} /><Skeleton w="50%" mt={8} />
        </div>
      </div>
      <div className="mt-12 flex gap-8 border-b"><Skeleton w={80} h={20} /><Skeleton w={100} h={20} /></div>
      <Skeleton mt={16} /><Skeleton w="95%" mt={8} /><Skeleton w="80%" mt={8} />
      <Skeleton w={200} h={22} mt={48} />
      <div className={`mt-4 ${grid5}`}><Skeleton ratio="3/4" count={5} /></div>
    </div>
  )
}

function NotFound() {
  const { t } = useTranslation()
  return (
    <div role="alert" className="py-16 text-center">
      <h1 className="text-[1.5em]">{t('product.notFoundTitle')}</h1>
      <p className="text-muted-foreground">{t('product.notFoundText')}</p>
      <Link to="/" className="text-brand underline">{t('product.backToMarket')}</Link>
    </div>
  )
}

function ProductView({ nft }: { nft: NftDetail }) {
  const { t } = useTranslation()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const router = useRouter()
  const compact = useCompact()
  const qc = useQueryClient()
  const userId = useAuth().user?.id
  const { data: related = [], isLoading: relatedLoading } = useQuery({ queryKey: keys.related(nft.id), queryFn: ({ signal }) => getRelated(nft.id, 5, signal) })
  const firstInStock = nft.editions.find((e) => e.stock > 0)?.id
  const [edition, setEdition] = useState(firstInStock)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState<'details' | 'reviews'>('details')
  const [image, setImage] = useState(0)
  const stock = nft.editions.find((e) => e.id === edition)?.stock ?? 0
  const nftKey = keys.nft(nft.id, userId)

  const favorite = useMutation({
    mutationFn: (on: boolean) => (on ? addFavorite : removeFavorite)(nft.id),
    onMutate: async (on) => {
      await qc.cancelQueries({ queryKey: nftKey })
      const previous = qc.getQueryData<NftDetail>(nftKey)
      qc.setQueryData<NftDetail>(nftKey, (n) => n && { ...n, favorited: on })
      return { previous }
    },
    onError: (e, _on, ctx) => {
      qc.setQueryData(nftKey, ctx?.previous)
      if (errorStatus(e) !== 401) toast.error(t('product.favoriteError'))
    },
  })
  const buy = useMutation({
    mutationFn: () => addToCart({ id: nft.id, edition: edition!, qty }),
    onSuccess: () => navigate({ to: '/carrinho' }),
    onError: (e) => toast.error(errorText(e)),
  })
  const favorited = !!nft.favorited
  const addOnly = useMutation({
    mutationFn: () => addToCart({ id: nft.id, edition: edition!, qty }),
    onSuccess: () => toast.success(t('product.addedToCart')),
    onError: (e) => toast.error(errorText(e)),
  })
  const circle = 'grid size-9 cursor-pointer place-items-center rounded-full border border-[#3f2319] bg-transparent text-foreground'
  const tail = (
    <>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-12 gap-0">
        <TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-x-8 gap-y-1 rounded-none border-b p-0 max-[800px]:gap-x-5">
          <TabsTrigger value="details" className={tabTrigger}>{t('product.tabDetails')}</TabsTrigger>
          <TabsTrigger value="reviews" className={tabTrigger}>{t('product.tabReviews', { count: nft.reviews })}</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="mt-4 text-[14px] leading-6 text-muted-foreground">
          {nft.description.map((p) => <p key={p}>{p}</p>)}
          <p><b className="text-foreground">{t('product.network')}</b><br />{nft.networkInfo}</p>
          <p><b className="text-foreground">{t('product.contract')}</b><br />{nft.contract}</p>
          <p><b className="text-foreground">{t('product.copyright')}</b><br />{nft.copyright}</p>
        </TabsContent>
        <TabsContent value="reviews" className="mt-4 text-[14px]"><p className="text-muted-foreground">{t('product.reviewsLine', { count: nft.reviews })}</p></TabsContent>
      </Tabs>
      <Section title={t('product.moreFrom')}>{relatedLoading ? <div className={grid5}><Skeleton ratio="3/4" count={5} /></div> : <NftRow items={related} />}</Section>
    </>
  )
  if (compact) return (
    <div className="animate-fade">
      <div className="rounded-[28px] bg-[#271712]">
        <div className="relative px-[29px] pt-[62px]">
          <button type="button" aria-label={t('product.back')} onClick={() => router.history.back()} className={cn(circle, 'absolute top-4 left-7')}><ChevronLeftIcon aria-hidden="true" className="size-5" /></button>
          <button type="button" aria-label={t(favorited ? 'product.favorited' : 'product.favorite')} aria-pressed={favorited} onClick={() => favorite.mutate(!favorited)} className={cn(circle, 'absolute top-4 right-7')}><HeartIcon aria-hidden="true" className={cn('size-[18px]', favorited && 'fill-current text-brand')} /></button>
          <img src={nft.gallery[0].src} alt={nft.gallery[0].alt} width={257} height={261} fetchPriority="high" className="block aspect-square w-full rounded-[28px] object-cover" />
        </div>
        <div className="relative -mt-10 rounded-[28px] bg-card px-6 pt-8 pb-8">
          <div className="flex items-start justify-between gap-3">
            <h1 className="m-0 text-[20px] leading-[1.4]">{nft.name}</h1>
            <span className="flex shrink-0 items-center gap-1 rounded-full border border-primary px-2 py-0.5 text-[13px] font-bold">
              <StarIcon aria-hidden="true" className="size-3 fill-current text-brand" />
              <span className="sr-only">{t('product.ratingLabel', { rating: nft.rating })}</span>
              <span aria-hidden="true">{nft.rating}<span className="font-normal">({nft.reviews})</span></span>
            </span>
          </div>
          <p className="mt-3 mb-3 leading-6 text-muted-foreground">{nft.about}</p>
          <p className="mt-0 mb-2"><b>{t('product.edition')}</b></p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('product.edition')}>
            {nft.editions.map((e) => (
              <UiButton key={e.id} variant="outline" aria-pressed={e.id === edition} disabled={e.stock === 0}
                title={e.stock === 0 ? t('product.soldOut') : t('product.stockLeft', { count: e.stock })}
                onClick={() => { setEdition(e.id); setQty((q) => Math.min(q, e.stock)) }}
                className={cn('h-auto rounded-full bg-transparent px-2.5 py-0.5 text-[13px] font-normal text-muted-foreground hover:bg-transparent', e.id === edition && 'border-primary text-brand', e.stock === 0 && 'line-through')}>{e.id}</UiButton>
            ))}
          </div>
          {edition ? <p className="mt-1 mb-0 text-xs text-muted-foreground" aria-live="polite">{t('product.stockLeft', { count: stock })}</p>
            : <p role="alert" className="mt-1 mb-0 text-xs text-destructive">{t('product.noEditions')}</p>}
          <p className="mt-4 mb-0 leading-8 text-muted-foreground">
            {t('common.tokenId', { id: nft.id })}<br />
            {t('product.collection')}: {nft.collection}<br />
            {t('product.attributes')}: {nft.attributes.join(', ')}
          </p>
        </div>
        <div className="rounded-[28px] bg-card px-6 pt-5 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[16px]">
              <span className="mr-1 text-muted-foreground">{t('product.qtyShort')}</span>
              <UiButton className="size-[22px] min-w-0 rounded-full bg-primary p-0 text-[15px] leading-none text-primary-foreground hover:bg-primary/80" disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label={t('common.less')}>−</UiButton>{qty}
              <UiButton className="size-[22px] min-w-0 rounded-full bg-primary p-0 text-[15px] leading-none text-primary-foreground hover:bg-primary/80" disabled={qty >= stock} onClick={() => setQty(qty + 1)} aria-label={t('common.more')}>+</UiButton>
            </div>
            <b className="text-[22px] text-brand">{nft.price} ETH</b>
          </div>
          <div className="mt-4 flex gap-3">
            <Button className="h-[60px] flex-1 rounded-full text-[16px] font-bold" disabled={!edition || buy.isPending || buy.isSuccess} onClick={() => buy.mutate()}>
              {!edition ? t('product.soldOut') : buy.isPending || buy.isSuccess ? t('profile.loading') : t('product.buyNft')}
            </Button>
            <button type="button" aria-label={t('product.addToCart')} disabled={!edition || addOnly.isPending} onClick={() => addOnly.mutate()} className="grid size-[60px] shrink-0 cursor-pointer place-items-center rounded-full border border-[#3f2319] bg-[#2f1d15] text-brand disabled:opacity-50"><ShoppingCartIcon aria-hidden="true" className="size-5" /></button>
          </div>
        </div>
      </div>
      {tail}
    </div>
  )
  return (
    <div className="animate-fade">
      <Breadcrumb trail={['home', 'market']} />
      <div className={productGrid}>
        <div className="grid content-start gap-3 max-[800px]:order-1 max-[800px]:grid-cols-4">
          {nft.gallery.map((g, i) => (
            <button key={i} type="button" aria-label={t('product.galleryImage', { n: i + 1 })} aria-pressed={i === image} onClick={() => setImage(i)}>
              <img className={cn('block h-auto w-full rounded-lg', i === image && 'outline outline-primary')} src={g.src} width={257} height={261} loading="lazy" decoding="async" alt={g.alt} />
            </button>
          ))}
        </div>
        <div className="relative rounded-lg bg-card p-5"><button type="button" aria-label={t('product.zoom')} aria-disabled="true" onClick={unavailable} className="absolute top-4 right-4 grid size-9 cursor-not-allowed place-items-center rounded-full bg-background/80"><SearchIcon aria-hidden="true" className="size-5" /></button><img src={nft.gallery[image].src} alt={nft.gallery[image].alt} width={257} height={261} fetchPriority="high" className="block h-auto w-full rounded-[28px]" /></div>
        <div className="max-[800px]:order-2">
          <h1 className="m-0 text-[28px] leading-[1.4]">{nft.name}</h1>
          <div className="flex items-center justify-between border-b">
            <b className="text-[22px] leading-[1.8] text-brand">{nft.price} ETH</b>
            <span className="flex items-center gap-1.5 text-[15px]">
              <span role="img" aria-label={t('product.ratingLabel', { rating: nft.rating })} className="flex gap-1">
                {Array.from({ length: 5 }, (_, i) => <StarIcon key={i} aria-hidden="true" className={cn('size-[14px] fill-current', i < Math.floor(nft.rating) ? 'text-brand' : 'text-[#cfb28c]')} />)}
              </span>
              {t('product.reviewsLine', { count: nft.reviews })}
            </span>
          </div>
          <p className="mt-3 mb-2 text-[15px]"><b>{t('product.about')}</b></p>
          <p className="mt-0 mb-3 max-w-[560px] leading-6 text-muted-foreground">{nft.about}</p>
          <p className="mt-0 mb-2 text-[15px]"><b>{t('product.edition')}</b></p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('product.edition')}>
            {nft.editions.map((e) => (
              <UiButton key={e.id} variant="outline" aria-pressed={e.id === edition} disabled={e.stock === 0}
                title={e.stock === 0 ? t('product.soldOut') : t('product.stockLeft', { count: e.stock })}
                onClick={() => { setEdition(e.id); setQty((q) => Math.min(q, e.stock)) }}
                className={cn('h-auto rounded-full bg-transparent px-2.5 py-0.5 text-[13px] font-normal text-muted-foreground hover:bg-transparent', e.id === edition && 'border-primary text-brand', e.stock === 0 && 'line-through')}>{e.id}</UiButton>
            ))}
          </div>
          {edition ? <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{t('product.stockLeft', { count: stock })}</p>
            : <p role="alert" className="mt-1 text-xs text-destructive">{t('product.noEditions')}</p>}
          <div className="my-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-[16px]">
              <UiButton className={qtyBtn} disabled={qty <= 1} onClick={() => setQty(qty - 1)} aria-label={t('common.less')}>−</UiButton>{qty}
              <UiButton className={qtyBtn} disabled={qty >= stock} onClick={() => setQty(qty + 1)} aria-label={t('common.more')}>+</UiButton>
            </div>
            <div className="flex gap-2">
              <Button className="h-11 px-8 text-[15px] uppercase" disabled={!edition || buy.isPending || buy.isSuccess} onClick={() => buy.mutate()}>
                {!edition ? t('product.soldOut') : buy.isPending || buy.isSuccess ? t('profile.loading') : t('product.buy')}
              </Button>
              <Button ghost className="h-11 gap-2 rounded-[6px] border-primary px-5 text-[15px] font-medium normal-case" onClick={() => favorite.mutate(!favorited)} aria-pressed={favorited}><HeartIcon aria-hidden="true" className={cn('size-5 text-brand', favorited && 'fill-current')} />{t(favorited ? 'product.favorited' : 'product.favorite')}</Button>
            </div>
          </div>
          <p className="mt-4 mb-2 leading-8 text-muted-foreground">
            {t('common.tokenId', { id: nft.id })}<br />
            {t('product.collection')}: {nft.collection}<br />
            {t('product.attributes')}: {nft.attributes.join(', ')}
          </p>
          <b>{t('product.share')}</b>{' '}
          {['in', '✉', '🐦'].map((i) => <button key={i} type="button" aria-disabled="true" onClick={unavailable} className="cursor-not-allowed px-1">{i}</button>)}
        </div>
      </div>
      {tail}
    </div>
  )
}

export default function Product() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const { user } = useAuth()
  const { data: nft, error, refetch } = useQuery({ queryKey: keys.nft(id, user?.id), queryFn: ({ signal }) => getNft(id, signal) })
  if (error) {
    if (errorStatus(error) === 404) return <NotFound />
    return (
      <div role="alert" className="py-16 text-center">
        <p className="text-destructive">{errorText(error)}</p>
        <Button onClick={() => refetch()}>{t('errors.retry')}</Button>
      </div>
    )
  }
  if (!nft) return <ProductSkeleton label={t('profile.loading')} />
  return <ProductView key={`${nft.id}:${user?.id ?? ''}`} nft={nft} />
}
