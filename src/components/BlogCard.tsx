import { useTranslation } from 'react-i18next'
import { unavailable } from '../lib/unavailable'

export default function BlogCard({ image, date, readTime, title, text }: { image: string; date: string; readTime: string; title: string; text: string }) {
  const { t } = useTranslation()
  return (
    <article className="overflow-hidden rounded-lg bg-card">
      <img src={image} alt="" width={257} height={261} loading="lazy" decoding="async" className="block h-[195px] w-full object-cover" />
      <div className="px-4 pt-3.5 pb-4">
        <small className="text-[12px] text-muted-foreground">{date} &nbsp;|&nbsp; {readTime}</small>
        <h3 className="mt-3 mb-2 text-[16px] leading-[21px]">{title}</h3>
        <p className="my-0 text-[13px] leading-[17px] text-muted-foreground">{text}</p>
        <button type="button" aria-disabled="true" onClick={unavailable} className="mt-3 cursor-pointer text-[12px] font-bold text-brand">{t('home.readMore')}</button>
      </div>
    </article>
  )
}
