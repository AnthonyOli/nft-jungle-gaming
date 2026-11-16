import { useTranslation } from 'react-i18next'
import Button from './Button'

export default function Hero({ image }: { image: string }) {
  const { t } = useTranslation()
  return (
    <section className="relative grid grid-cols-[1fr_450px] items-start gap-10 pt-8 pb-24 max-[1100px]:grid-cols-[1fr_300px] max-[800px]:grid-cols-1 max-[800px]:pb-14">
      <div className="pt-10 pl-10 max-[800px]:pt-0 max-[800px]:pl-0">
        <small className="text-[13px] tracking-[1.5px]">{t('hero.welcome')}</small>
        <h1 className="mt-4 mb-2 text-[43px] leading-[70px] max-[800px]:text-[28px] max-[800px]:leading-[1.4]">{t('hero.titleLine1')}<br />{t('hero.titleLine2')}</h1>
        <p className="mt-0 mb-6 max-w-[560px] text-[14px] leading-6 text-muted-foreground">{t('hero.text')}</p>
        <Button className="h-10 w-[140px] px-0 text-[16px] uppercase">{t('hero.cta')}</Button>
      </div>
      <img src={image} alt="" width={450} height={450} fetchPriority="high" decoding="async" className="h-auto w-full rounded-[28px] max-[800px]:mx-auto max-[800px]:w-[250px]" />
      <div className="absolute bottom-[46px] left-[600px] flex gap-2.5 max-[1100px]:left-[40%] max-[800px]:left-1/2 max-[800px]:bottom-4 max-[800px]:-translate-x-1/2" aria-hidden="true">
        {[0, 1, 2].map((i) => <i key={i} className="size-2 rounded-full bg-primary" />)}
      </div>
    </section>
  )
}
