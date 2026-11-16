import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { getPromotion } from '../api'
import { keys } from '../api/queryKeys'
import Skeleton from './Skeleton'

export default function LimitedOffer() {
  const { t } = useTranslation()
  const { data: nft, isLoading } = useQuery({ queryKey: keys.promotion, queryFn: ({ signal }) => getPromotion(signal), retry: false })
  if (!isLoading && !nft) return null
  return (
    <div className="overflow-hidden bg-[#261910] pt-[26px]">
      <h2 className="m-0 px-5 text-[18px] text-brand">{t('home.featured')}</h2>
      {nft ? (
        <Link to="/produto/$id" params={{ id: nft.id }} className="block animate-fade">
          <p className="my-2.5 text-center text-[20px] font-bold">{t('home.limitedOffer')}</p>
          <img src={nft.image} alt={nft.alt} width={258} height={261} loading="lazy" decoding="async" className="h-[366px] w-full rounded-[28px] object-cover" />
          <p className="m-0 px-5 py-3 text-center">
            <span className="font-bold">{nft.name}</span>{' '}
            <span className="font-bold text-brand">{nft.price} ETH</span>
            {nft.oldPrice && <span className="ml-2 text-[#a48b6d]"><span className="sr-only">{t('common.previousPrice')} </span>{nft.oldPrice} ETH</span>}
          </p>
        </Link>
      ) : (
        <Skeleton h={466} mt={10} />
      )}
    </div>
  )
}
