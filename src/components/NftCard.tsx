import { useTranslation } from 'react-i18next'
import type { Nft } from '../api/types'

export default function NftCard({ image, alt, name, price, oldPrice, badge, available }: Nft) {
  const { t } = useTranslation()
  return (
    <article className="w-full">
      <div className="relative rounded-[4px] bg-card px-1 pt-7 pb-[22px]">
        <img src={image} alt={alt} width={257} height={261} loading="lazy" decoding="async" className="mx-auto h-auto w-[96%] rounded-[22px]" />
        {!available && <span className="absolute top-2 right-2 rounded-xs bg-destructive px-1.5 text-[10px] text-primary-foreground">ESGOTADO</span>}
        {badge && <span className="absolute top-2 left-2 rounded-xs bg-primary px-1.5 text-[10px] text-primary-foreground">{badge}</span>}
      </div>
      <h3 className="mt-3 mb-0 text-[16px] leading-[26px] font-normal">{name}</h3>
      <p className="mt-0.5 mb-0 leading-[26px]">
        <span className="text-[18px] font-bold text-brand">{price} ETH</span>
        {oldPrice && <span className="ml-2 text-[17px] text-[#a48b6d]"><span className="sr-only">{t('common.previousPrice')} </span>{oldPrice} ETH</span>}
      </p>
    </article>
  )
}
