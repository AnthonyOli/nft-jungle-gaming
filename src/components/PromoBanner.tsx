import { ArrowRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import Button from './Button'

export default function PromoBanner({ image, title, text, className }: { image: string; title: string; text: string; className?: string }) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex h-[250px] overflow-hidden rounded-lg bg-card max-[800px]:h-auto max-[800px]:flex-col', className)}>
      <img src={image} alt="" width={288} height={250} loading="lazy" decoding="async" className="h-full w-[288px] shrink-0 rounded-[28px] object-cover max-[800px]:h-[200px] max-[800px]:w-full" />
      <div className="flex flex-1 flex-col items-end justify-center py-4 pr-[30px] pl-4 text-right max-[800px]:items-start max-[800px]:text-left">
        <h3 className="m-0 text-[20px] leading-6">{title}</h3>
        <p className="my-3 text-[14px] leading-6 text-muted-foreground">{text}</p>
        <Button className="h-10 w-[140px] gap-1.5 rounded-[6px] px-0 text-[15px] font-medium normal-case">{t('common.explore')}<ArrowRightIcon aria-hidden="true" className="size-4" /></Button>
      </div>
    </div>
  )
}
