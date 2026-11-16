import { useTranslation } from 'react-i18next'
import type { Quote, QuoteLine } from '../api/types'
import { format } from '../lib/eth'
import { cn } from '@/lib/utils'

export const SumRow = ({ label, value, total }: { label: string; value: string; total?: boolean }) => (
  <div className={cn('flex items-baseline justify-between py-1 text-[15px]', total ? 'mt-3 pt-3 text-[18px] font-bold' : '')}><span>{label}</span><span className={cn('text-[17px]', total && 'text-[20px] text-brand')}>{value}</span></div>
)

type Totals = Pick<Quote, 'subtotal' | 'discount' | 'networkFee' | 'total'>

export default function OrderSummary({ items, subtotal, discount, networkFee, total }: { items: QuoteLine[] } & Totals) {
  const { t } = useTranslation()
  return (
    <section>
      {items.map((i) => (
        <div className="mb-1.5 grid grid-cols-[56px_1fr_auto] items-center gap-3 bg-card p-1.5" key={`${i.id}:${i.edition}`}>
          <img src={i.image} alt={i.alt} width={56} height={56} loading="lazy" className="size-14 rounded-md object-cover" />
          <div className="leading-[1.35]"><b className="text-[16px]">{i.name}</b><br /><small className="text-[13px] text-muted-foreground">{t('common.tokenId', { id: i.id })} · {i.edition}</small></div>
          <span className="pr-2 text-right"><small className="mr-2 text-[13px] text-muted-foreground">{t('common.qty', { qty: i.qty })}</small><b className="text-[17px] text-brand">{format(i.total)} ETH</b></span>
        </div>
      ))}
      <div>
        <SumRow label={t('common.subtotal')} value={`${format(subtotal)} ETH`} />
        <SumRow label={t('common.launchDiscount')} value={`(-) ${format(discount)}`} />
        <SumRow label={t('common.networkFee')} value={`${networkFee} ETH`} />
        <SumRow label={t('common.total')} value={`${format(total, 3)} ETH`} total />
      </div>
    </section>
  )
}
