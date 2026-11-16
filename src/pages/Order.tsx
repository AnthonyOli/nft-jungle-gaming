import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getOrder } from '../api'
import { keys } from '../api/queryKeys'
import { useAuth } from '../auth'
import { Breadcrumb, Button, OrderSummary, Skeleton } from '../components'
import { errorStatus, errorText } from '../lib/errors'
import { format } from '../lib/eth'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSocketConnected } from '../realtime'

const Spinner = () => (
  <span role="img" aria-label="" className="size-12 animate-spin rounded-full border-4 border-current border-t-transparent motion-reduce:animate-none" />
)
const Cross = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true" className="text-destructive">
    <circle cx="28" cy="28" r="24" /><path d="m19 19 18 18m0-18L19 37" />
  </svg>
)

const Envelope = () => (
  <svg width="68" height="82" viewBox="0 0 68 82" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 32 34 6l30 26v46H4z" />
    <path d="M13 40V18h42v22M4 78l30-26 30 26M4 32l30 24 30-24" />
    <text x="34" y="31" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">THANK</text>
    <text x="34" y="42" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor" stroke="none">YOU</text>
  </svg>
)

export default function Order() {
  const { t } = useTranslation()
  const { id } = useParams({ strict: false }) as { id: string }
  const userId = useAuth().user?.id
  const qc = useQueryClient()
  const live = useSocketConnected()
  const { data: order, error, refetch } = useQuery({
    queryKey: keys.order(id, userId),
    queryFn: () => getOrder(id),
    enabled: !!userId,
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? (live ? 10_000 : 1500) : false),
    refetchIntervalInBackground: true,
  })
  const status = order?.status
  useEffect(() => { if (status && status !== 'pending') qc.invalidateQueries({ queryKey: keys.cart(userId) }) }, [status, qc, userId])

  if (error && !order) {
    return (
      <div role="alert" className="py-16 text-center">
        <p className="text-destructive">{errorStatus(error) === 404 ? t('order.notFound') : errorText(error)}</p>
        {errorStatus(error) === 404 ? <Link to="/" className="text-brand underline">{t('product.backToMarket')}</Link> : <Button onClick={() => refetch()}>{t('errors.retry')}</Button>}
      </div>
    )
  }
  if (!order) return <div aria-busy="true" aria-label={t('order.loading')}>
    <div className="mx-auto mt-[84px] min-h-[817px] max-w-[580px] border-b-[10px] border-primary bg-popover px-9 pt-10 pb-8 max-[520px]:min-h-[1021px] max-[800px]:px-4"><Skeleton w={200} h={24} /><Skeleton h={64} mt={24} /><Skeleton h={48} mt={16} count={3} /></div>
  </div>
  const label = t(`order.status${order.status[0].toUpperCase()}${order.status.slice(1)}`)
  return (
    <div className="animate-fade">
      <Breadcrumb trail={['home', 'market', 'checkout']} />
      <div className="mx-auto max-w-[580px] border-b-[10px] border-primary bg-popover px-9 pt-10 pb-8 max-[800px]:px-4">
      <header className="flex flex-col items-center text-brand">
        {order.status === 'confirmed' && <Envelope />}
        {order.status === 'pending' && <Spinner />}
        {order.status === 'declined' && <Cross />}
        {error && <p role="status" className="mt-2 text-xs text-destructive">{t('order.offline')}</p>}
        <div role="status"><h1 className="mt-3 mb-0 text-[16px] font-medium text-foreground">
          {order.status === 'pending' ? t('order.pendingTitle') : order.status === 'declined' ? t('order.declinedTitle') : t('success.title')}
        </h1></div>
        {order.status === 'pending' && <p className="text-center text-muted-foreground">{t('order.pendingText')}</p>}
        {order.status === 'declined' && (
          <>
            <p role="alert" className="text-center text-destructive">{t('order.declinedText')}</p>
            <Link to="/pagamento" className="text-brand underline">{t('order.tryAgain')}</Link>
          </>
        )}
      </header>
      <div className="my-5 flex flex-wrap justify-center gap-y-3 border-y border-primary py-3 text-[13px] text-muted-foreground">
        {[
          [t('order.orderId'), order.id],
          [t('order.status'), label],
          [t('success.date'), new Date(order.createdAt).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })],
          [t('common.total'), `${format(order.total, 3)} ETH`],
          [t('success.wallet'), `${order.wallet.type} · ${order.wallet.network}`],
          ...(order.txId ? [[t('success.txId'), `${order.txId.slice(0, 10)}…${order.txId.slice(-8)}`]] : []),
        ].map(([k, v]) => <div key={k} className="border-l border-primary px-4 first:border-0"><b>{k}</b><br />{v}</div>)}
      </div>
      <div>
        <h2 className="mt-0 mb-3 text-[14px]">{t('success.details')}</h2>
        <OrderSummary {...order} />
        {order.status === 'confirmed' && (
          <>
            <p className="text-center text-[13px] leading-5 text-muted-foreground">{t('success.confirmed')}</p>
            <a href={order.explorerUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants(), 'mx-auto flex h-10 w-fit rounded-[6px] px-6 text-[15px] font-bold no-underline')}>{t('success.etherscan')}</a>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
