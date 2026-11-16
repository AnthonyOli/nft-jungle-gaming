import { useQuery } from '@tanstack/react-query'
import { controlClass } from '../components/Field'
import { Link, useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { Trash2Icon } from 'lucide-react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Breadcrumb, Button, NftRow, Section, Skeleton } from '../components'
import { SumRow } from '../components/OrderSummary'
import { getNfts } from '../api'
import { keys } from '../api/queryKeys'
import type { QuoteIssue } from '../api/types'
import { useCart, useQuote } from '../cart'
import { useCoupon } from '../coupon'
import { errorText } from '../lib/errors'
import { format } from '../lib/eth'
import { Input } from '@/components/ui/input'
import { Button as UiButton } from '@/components/ui/button'
import { useCompact } from '../lib/useMediaQuery'
const roundBtn = 'h-7 w-[18px] min-w-0 rounded-full bg-primary p-0 text-[16px] leading-none font-normal text-primary-foreground hover:bg-primary/80'
const row = 'max-[800px]:grid max-[800px]:grid-cols-2 max-[800px]:gap-px max-[800px]:rounded-lg max-[800px]:bg-card'
const full = 'max-[800px]:col-span-2'
const td = 'bg-card px-3 py-1.5 max-[800px]:block'
const th = 'border-b px-3 pb-3 text-left text-[14px] font-bold'


function issueText(t: TFunction, issue: QuoteIssue) {
  if (issue.code === 'sold_out') return t('cart.issueSoldOut')
  if (issue.code === 'insufficient_stock') return t('cart.issueStock', { stock: issue.stock })
  return t('cart.issueUnknown')
}

export default function Cart() {
  const { t } = useTranslation()
  const { lines, pending, setQty, removeItem } = useCart()
  const [coupon, setCoupon] = useCoupon()
  const quoteQuery = useQuote(lines, coupon)
  const quote = lines.length ? quoteQuery.data : undefined
  const loading = pending || (lines.length > 0 && !quote && !quoteQuery.isError)
  const alsoViewedQuery = useQuery({ queryKey: keys.nfts({ sort: 'hot', pageSize: 5 }), queryFn: ({ signal }) => getNfts({ sort: 'hot', pageSize: 5 }, signal) })
  const alsoViewed = alsoViewedQuery.data?.items ?? []
  const navigate = useNavigate()
  const compact = useCompact()
  const couponMsgId = useId()
  const couponBad = quote?.coupon && quote.coupon.status !== 'applied'
  const change = (id: string, edition: string, qty: number) => setQty({ id, edition, qty }).catch((e) => toast.error(errorText(e)))
  return (
    <>
      <Breadcrumb trail={['home', 'market', 'cart']} />
      <h1 className="sr-only">{t('crumb.cart')}</h1>
      <div className="grid grid-cols-[1fr_332px] gap-[86px] max-[1100px]:gap-8 max-[800px]:grid-cols-1">
        <table className="w-full self-start border-separate border-spacing-y-1.5 max-[800px]:block" aria-busy={loading} aria-label={loading ? t('cart.loading') : undefined}>
          <thead className="max-[800px]:sr-only"><tr><th className={th}>{t('cart.nfts')}</th><th className={`${th} w-[140px]`}>{t('cart.price')}</th><th className={`${th} w-[136px]`}>{t('cart.editions')}</th><th className={`${th} w-[110px]`}>{t('cart.total')}</th><th className={`${th} w-[48px]`}><span className="sr-only">{t('common.remove')}</span></th></tr></thead>
          <tbody className="max-[800px]:block">
            {!pending && lines.length === 0 && <tr className={row}><td colSpan={5} className={`${td} ${full} text-muted-foreground`}>{t('cart.empty')}</td></tr>}
            {loading && <tr className={row}><td colSpan={5} className={`${td} ${full}`}><Skeleton h={compact ? 182 : 102} count={pending ? 1 : Math.min(lines.length, 3)} /></td></tr>}
            {quoteQuery.isError && !quote && <tr className={row}><td colSpan={5} className={`${td} ${full} text-destructive`} role="alert">{t('cart.quoteFailed')} <button className="underline" onClick={() => quoteQuery.refetch()}>{t('errors.retry')}</button></td></tr>}
            {quote?.lines.map((i) => {
              const issue = quote.issues.find((x) => x.id === i.id && x.edition === i.edition)
              return (
                <tr key={`${i.id}:${i.edition}`} className={row}>
                  <td className={`${td} ${full} leading-[1.4]`}>
                    <div className="flex items-center gap-3">
                      <img src={i.image} alt={i.alt} width={62} height={62} className="size-[62px] shrink-0 rounded-md object-cover" />
                      <div>
                        <b className="text-[16px]">{i.name}</b><br />
                        <small className="text-[13px] text-muted-foreground">{t('common.tokenId', { id: i.id })} · {i.edition}<span className="hidden max-[800px]:inline"> · {format(i.price)} ETH</span></small>
                      </div>
                    </div>
                    {issue && <p role="alert" className="m-0 text-xs text-destructive">{issueText(t, issue)}</p>}
                  </td>
                  <td className={`${td} font-bold text-brand max-[800px]:hidden`}>{format(i.price)} ETH</td>
                  <td className={td}>
                    <span className="flex items-center gap-3 text-[16px]">
                      <UiButton className={roundBtn} onClick={() => i.qty > 1 && change(i.id, i.edition, i.qty - 1)} aria-label={t('common.less')}>−</UiButton>{i.qty}
                      <UiButton className={roundBtn} onClick={() => change(i.id, i.edition, i.qty + 1)} aria-label={t('common.more')}>+</UiButton>
                    </span>
                  </td>
                  <td className={`${td} text-[16px] font-bold text-brand`}>{format(i.total)} ETH</td>
                  <td className={td}><UiButton variant="ghost" size="icon" className="text-muted-foreground" aria-label={t('common.remove')} onClick={() => removeItem(i.id, i.edition)}><Trash2Icon aria-hidden="true" className="size-[18px]" /></UiButton></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <aside>
          <h2 className="mt-0 mb-4 border-b pb-2 text-[18px]">{t('cart.summary')}</h2>
          <b className="mb-2 block text-[14px]">{t('cart.promoCode')}</b>
          {quote?.coupon?.status === 'applied' ? (
            <p className="flex items-center justify-between rounded-sm border border-primary px-2 py-1">
              <span>{t('cart.couponApplied', { code: quote.coupon.code })}</span>
              <button className="underline" onClick={() => setCoupon(null)}>{t('cart.removeCoupon')}</button>
            </p>
          ) : (
            <form className="flex" onSubmit={(e) => {
              e.preventDefault()
              setCoupon(String(new FormData(e.currentTarget).get('coupon') ?? '').trim() || null)
            }}>
              <Input name="coupon" defaultValue={coupon ?? ''} className={`${controlClass} h-10 flex-1 rounded-none border-primary text-[13px]`} placeholder={t('cart.promoPh')} aria-label={t('cart.promoCode')}
                aria-invalid={!!couponBad} aria-describedby={couponBad ? couponMsgId : undefined} />
              <Button type="submit" className="h-10 rounded-none px-4 text-[15px] font-medium normal-case">{t('common.apply')}</Button>
            </form>
          )}
          {couponBad && <p id={couponMsgId} role="alert" className="mt-1 mb-0 text-xs text-destructive">{t(quote!.coupon!.status === 'expired' ? 'cart.couponExpired' : 'cart.couponInvalid')}</p>}
          {loading ? <div className="grid gap-2 py-2"><Skeleton h={16} count={4} /></div> : (
            <div aria-live="polite">
              <SumRow label={t('common.subtotal')} value={`${format(quote?.subtotal ?? '0')} ETH`} />
              <SumRow label={t('common.launchDiscount')} value={`(-) ${format(quote?.discount ?? '0')}`} />
              <SumRow label={t('common.networkFee')} value={`${quote?.networkFee ?? '0'} ETH`} />
              <small className="block text-right text-[13px] font-bold text-brand">{t('common.estimatedFee')}</small>
              <SumRow label={t('common.total')} value={`${format(quote?.total ?? '0', 3)} ETH`} total />
            </div>
          )}
          <Button className="mt-5 mb-4 h-11 w-full rounded-[6px] text-[16px] font-medium normal-case" disabled={!quote || quote.issues.length > 0} onClick={() => navigate({ to: '/pagamento' })}>{t('cart.checkout')}</Button>
          <Link to="/" className="block text-center text-[15px] text-muted-foreground">{t('cart.keepExploring')}</Link>
        </aside>
      </div>
      <Section title={t('cart.alsoViewed')}>{alsoViewedQuery.isLoading ? <div className="grid grid-cols-5 gap-4 max-[800px]:grid-cols-2"><Skeleton ratio={compact ? '4/5' : '6/7'} count={5} /></div> : <NftRow items={alsoViewed} />}<div className="mt-4 flex justify-center gap-2">{[0, 1, 2].map((i) => <i key={i} className={`size-2.5 rounded-full border border-primary ${i === 1 ? 'bg-primary' : ''}`} />)}</div></Section>
    </>
  )
}
