import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef, useState, type FormEvent } from 'react'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { createOrder, getProfile, getWallets } from '../api'
import { keys } from '../api/queryKeys'
import type { OrderWallet, Profile, Wallets } from '../api/types'
import { useAuth } from '../auth'
import { useCart, useQuote } from '../cart'
import { Breadcrumb, Button, EnsField, Field, OrderSummary, Skeleton } from '../components'
import { useCoupon } from '../coupon'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { errorCode, errorText } from '../lib/errors'
import { ADDRESS, NETWORKS, WALLET_TYPES, shortAddress } from '../lib/wallets'
import { unavailable } from '../lib/unavailable'
import { connectWallet } from '../lib/walletConnect'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

const text = z.string().trim()
const required = text.min(1, 'required')
const schema = z.object({
  displayName: required, username: required, network: required, profileName: required,
  address: required.regex(ADDRESS, 'invalid_address'), walletType: required, referralCode: required,
  email: required.email('invalid_email'), ens: text.optional(), note: z.string().optional(),
})
type Conn = 'idle' | 'connecting' | 'connected' | 'refused'

type WalletChoice = { key: 'main' | 'secondary'; wallet: OrderWallet }

const choicesOf = (w: Wallets): WalletChoice[] => [
  ...(w.main.address ? [{ key: 'main' as const, wallet: { type: w.main.walletType, network: w.main.network, address: w.main.address } }] : []),
  ...(w.secondary ? [{ key: 'secondary' as const, wallet: { type: w.secondary.walletType, network: w.secondary.network, address: w.secondary.address } }] : []),
]

function CheckoutForm({ profile, wallets }: { profile: Profile; wallets: Wallets }) {
  const { t } = useTranslation()
  const userId = useAuth().user!.id
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { lines, pending } = useCart()
  const [coupon, setCoupon] = useCoupon()
  const quoteQuery = useQuote(lines, coupon)
  const quote = lines.length ? quoteQuery.data : undefined
  const draft = loadDraft(userId)
  const choices = choicesOf(wallets)
  const [choice, setChoice] = useState(choices.find((c) => c.key === draft.walletChoice)?.key ?? choices[0]?.key)
  const attempt = useRef(crypto.randomUUID())
  const [alert, setAlert] = useState<string>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [review, setReview] = useState<z.infer<typeof schema>>()
  const [reviewedTotal, setReviewedTotal] = useState<string>()
  const [changed, setChanged] = useState(false)
  const [conn, setConn] = useState<{ key?: string; status: Conn }>({ status: 'idle' })
  const order = useMutation({
    mutationFn: (input: Parameters<typeof createOrder>[0]) => createOrder(input, attempt.current),
    onSuccess: (o) => {
      attempt.current = crypto.randomUUID()
      clearDraft(userId)
      setCoupon(null)
      qc.invalidateQueries({ queryKey: keys.cart(userId) })
      navigate({ to: '/pedido/$id', params: { id: o.id } })
    },
    onError: (e) => {
      const code = errorCode(e)
      if (code === 'quote_changed' || code === 'sold_out') {
        attempt.current = crypto.randomUUID()
        qc.invalidateQueries({ queryKey: ['quote'] })
        if (code === 'quote_changed') { setChanged(true); setAlert(t('checkout.quoteChanged')) } else setAlert(t('errors.sold_out'))
      } else setAlert(errorText(e))
    },
  })
  const picked = choices.find((c) => c.key === choice)
  const status: Conn = conn.key === choice ? conn.status : 'idle'
  const connect = () => {
    if (!picked) return
    setConn({ key: picked.key, status: 'connecting' })
    connectWallet(picked.wallet).then(
      () => setConn((c) => (c.key === picked.key ? { key: picked.key, status: 'connected' } : c)),
      () => setConn((c) => (c.key === picked.key ? { key: picked.key, status: 'refused' } : c)),
    )
  }
  const toReview = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)))
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]).reverse()))
      return
    }
    setErrors({})
    setAlert(undefined)
    setChanged(false)
    setReviewedTotal(quote?.total)
    setReview(parsed.data)
  }
  const confirm = () => {
    if (!quote || !picked || !review) return
    setAlert(undefined)
    order.mutate({
      quoteId: quote.quoteId, items: lines, coupon: quote.coupon?.status === 'applied' ? quote.coupon.code : undefined,
      wallet: picked.wallet, note: review.note ?? '',
    })
  }
  const needsAck = !!review && (changed || (!!quote && quote.total !== reviewedTotal))
  const blocked = !quote || quote.issues.length > 0 || !choice || order.isPending || quoteQuery.isFetching
  const reviewing = !!review
  const d = (name: string, fallback?: string) => draft[name] ?? fallback
  return (
    <div className="grid grid-cols-[1fr_400px] gap-12 max-[800px]:grid-cols-1">
      <div>
      <form noValidate hidden={reviewing} onSubmit={toReview} onChange={(e) => {
        saveDraft(userId, Object.fromEntries(new FormData(e.currentTarget)))
        const name = (e.target as unknown as HTMLInputElement).name
        if (errors[name]) setErrors((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => k !== name)))
      }}>
        <h2 className="text-[1.17em]">{t('common.collectorProfile')}</h2>
        <div className="grid grid-cols-2 gap-x-6 max-[800px]:grid-cols-1">
          <Field req name="displayName" label={t('common.displayName')} defaultValue={d('displayName', profile.displayName)} error={errors.displayName} />
          <Field req name="username" label={t('common.username')} defaultValue={d('username', profile.username)} error={errors.username} />
          <Field req as="select" name="network" label={t('common.network')} defaultValue={d('network', wallets.main.network)} options={NETWORKS} placeholder={t('common.selectNetwork')} error={errors.network} />
          <Field req name="profileName" label={t('common.profileName')} defaultValue={d('profileName', wallets.main.profileName)} error={errors.profileName} />
          <Field req name="address" label={t('common.walletAddress')} placeholder={t('common.walletAddressPh')} defaultValue={d('address', wallets.main.address)} error={errors.address} />
          <Field req as="select" name="walletType" label={t('common.walletType')} defaultValue={d('walletType', wallets.main.walletType)} options={WALLET_TYPES} placeholder={t('common.selectWallet')} error={errors.walletType} />
          <Field req name="referralCode" label={t('common.referralCode')} defaultValue={d('referralCode', wallets.main.referralCode)} error={errors.referralCode} />
          <Field req name="email" label={t('common.email')} type="email" defaultValue={d('email', wallets.main.email)} error={errors.email} />
          <EnsField defaultValue={d('ens', wallets.main.ens)} />
        </div>
        <label className="flex cursor-not-allowed items-center gap-2 opacity-60" onClick={unavailable}><Checkbox disabled /> {t('checkout.otherWallet')}</label>
        <Field as="textarea" className="max-w-[370px]" name="note" rows={7} label={t('checkout.note')} defaultValue={d('note')} />
        <Button type="submit" disabled={!quote || quote.issues.length > 0 || !choice}>{t('checkout.review')}</Button>
      </form>
      {review && (
        <section aria-labelledby="review-title">
          <h2 id="review-title" className="text-[1.17em]">{t('checkout.reviewTitle')}</h2>
          <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
            <dt className="text-muted-foreground">{t('checkout.reviewBuyer')}</dt><dd>{review.displayName} (@{review.username}) · {review.email}</dd>
            <dt className="text-muted-foreground">{t('checkout.reviewWallet')}</dt>
            <dd>{picked && t('checkout.walletOption', { type: picked.wallet.type, network: picked.wallet.network, address: shortAddress(picked.wallet.address) })}</dd>
            {review.note && <><dt className="text-muted-foreground">{t('checkout.reviewNote')}</dt><dd>{review.note}</dd></>}
          </dl>
          {alert && <p role="alert" className="text-destructive">{alert}</p>}
          {needsAck && !alert && <p role="alert" className="text-destructive">{t('checkout.expiredQuote')}</p>}
          {status !== 'connected' && !needsAck && <p className="text-muted-foreground">{t('checkout.connectRequired')}</p>}
          <div className="flex flex-wrap gap-3">
            <Button type="button" ghost onClick={() => setReview(undefined)} disabled={order.isPending}>{t('checkout.back')}</Button>
            {needsAck
              ? <Button type="button" disabled={quoteQuery.isFetching} onClick={() => { setReviewedTotal(quote?.total); setChanged(false); setAlert(undefined) }}>{t('checkout.acceptChanges')}</Button>
              : <Button type="button" onClick={confirm} disabled={blocked || status !== 'connected'}>{order.isPending ? t('checkout.submitting') : t('checkout.confirm')}</Button>}
          </div>
        </section>
      )}
      </div>
      <aside>
        <h2 className="text-[1.17em]">{t('checkout.yourNfts')}</h2>
        {quote ? <OrderSummary items={quote.lines} subtotal={quote.subtotal} discount={quote.discount} networkFee={quote.networkFee} total={quote.total} /> : pending ? <Skeleton h={120} /> : <p className="text-muted-foreground">{t('checkout.emptyCart')}</p>}
        <h3 className="my-[1.33em] text-center text-[1em]">{t('checkout.walletNetwork')}</h3>
        {choices.length === 0 && <p role="alert" className="text-destructive">{t('checkout.noWallet')}</p>}
        <RadioGroup value={choice ?? ''} onValueChange={(v) => { setChoice(v as 'main' | 'secondary'); saveDraft(userId, { walletChoice: v as string }) }}>
          {choices.map((c) => (
            <label key={c.key} className={cn('mb-3 flex items-center gap-2 border p-3', c.key === choice && 'border-foreground')}>
              <RadioGroupItem value={c.key} />
              <span><b>{t(c.key === 'main' ? 'checkout.mainWallet' : 'checkout.secondaryWallet')}</b><br />
                <small>{t('checkout.walletOption', { type: c.wallet.type, network: c.wallet.network, address: shortAddress(c.wallet.address) })}</small></span>
            </label>
          ))}
        </RadioGroup>
        {picked && (
          <div className="mt-3">
            <p role="status" className={cn('mb-2 text-xs', status === 'refused' ? 'text-destructive' : 'text-muted-foreground')}>
              {status === 'refused' ? t('checkout.refused') : status === 'connecting' ? t('checkout.connecting') : status === 'connected' ? t('checkout.connected') : ''}
            </p>
            {status === 'connected'
              ? <Button type="button" ghost onClick={() => setConn({ status: 'idle' })}>{t('checkout.disconnect')}</Button>
              : <Button type="button" onClick={connect} disabled={status === 'connecting'}>{t('checkout.connect')}</Button>}
          </div>
        )}
      </aside>
    </div>
  )
}

export default function Checkout() {
  const { t } = useTranslation()
  const userId = useAuth().user?.id
  const profile = useQuery({ queryKey: keys.profile(userId), queryFn: getProfile, enabled: !!userId })
  const wallets = useQuery({ queryKey: keys.wallets(userId), queryFn: getWallets, enabled: !!userId })
  const error = profile.error || wallets.error
  return (
    <>
      <Breadcrumb trail={['home', 'market', 'checkout']} />
      <h1 className="sr-only">{t('crumb.checkout')}</h1>
      {error && <p role="alert" className="mb-3 text-xs text-destructive">{errorText(error)}</p>}
      {!(profile.data && wallets.data) && !error && (
        <div aria-busy="true" aria-label={t('checkout.loading')} className="grid grid-cols-[1fr_400px] gap-12 max-[800px]:grid-cols-1">
          <div><Skeleton w={200} h={20} /><Skeleton h={36} mt={16} count={8} /><Skeleton h={140} mt={16} /></div>
          <div><Skeleton w={160} h={20} /><Skeleton h={160} mt={16} /><Skeleton h={60} mt={16} count={2} /></div>
        </div>
      )}
      {profile.data && wallets.data && <CheckoutForm profile={profile.data} wallets={wallets.data} />}
    </>
  )
}
