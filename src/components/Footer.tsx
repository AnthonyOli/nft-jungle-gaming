import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { tList } from '../lib/i18n'
import { unavailable } from '../lib/unavailable'
import Button from './Button'
const heading = 'my-0 mb-3 text-[20px]'

const social = [
  <path key="f" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  <g key="ig"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><path d="M17.5 6.5h.01" /></g>,
  <path key="tw" d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />,
  <g key="in"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></g>,
  <g key="yt"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" /><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" /></g>,
]

export default function Footer() {
  const { t } = useTranslation()
  const features = tList<{ icon: string; title: string; text: string }>(t, 'footer.features')
  const cols = tList<{ title: string; links: string[] }>(t, 'footer.cols')
  const names = tList<string>(t, 'footer.socialNames')
  return (
    <footer className="mt-24 max-[800px]:mt-12 [&_button]:cursor-pointer">
      <div className="bg-card">
        <div className="grid grid-cols-4 gap-y-8 px-12 pt-8 pb-4 max-[1100px]:px-6 max-[800px]:grid-cols-1">
          {features.map((f, i) => (
            <div key={f.title} className={`${i ? 'border-l border-primary pl-[16px]' : ''} pr-2 max-[800px]:border-0 max-[800px]:pl-0`}>
              <b className="grid size-[74px] place-items-center rounded-full bg-primary text-[28px] text-primary-foreground">{f.icon}</b>
              <h2 className="mt-[18px] mb-2 text-[18px]">{f.title}</h2>
              <p className="m-0 text-[15px] leading-[22px] text-muted-foreground">{f.text}</p>
            </div>
          ))}
          <div className="border-l border-primary pl-[16px] max-[800px]:border-0 max-[800px]:pl-0">
            <h2 className="mt-0 mb-3 text-[16px] leading-4">{t('footer.newsletterTitle')}</h2>
            <form className="flex" onSubmit={(e) => { e.preventDefault(); unavailable() }}>
              <Input type="email" className="h-10 flex-1 rounded-none border-0 bg-secondary px-3 text-[11px]" placeholder={t('footer.emailPh')} aria-label={t('common.email')} />
              <Button type="submit" className="h-10 rounded-[4px] px-4 text-[15px] normal-case">{t('common.send')}</Button>
            </form>
            <p className="mt-4 mb-0 text-[14px] leading-[22px] text-muted-foreground">{t('footer.newsletterText')}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 items-center gap-y-3 bg-secondary px-12 py-7 text-[15px] leading-[22px] max-[1100px]:px-6 max-[800px]:grid-cols-1">
          <b className="tracking-[1px]">KURIO</b><span>{t('footer.tagline')}</span><span>contato@email.com</span><span>{t('footer.phone')}</span>
        </div>
        <div className="grid grid-cols-4 gap-y-8 px-12 pt-6 pb-9 max-[1100px]:px-6 max-[800px]:grid-cols-2">
          {cols.map((c, ci) => (
            <div key={c.title}>
              <h2 className={heading}>{c.title}</h2>
              {c.links.map((x, li) => (ci === 0 && li === 0
                ? <Link key={x} to="/perfil" className="block min-h-[30px] text-[15px] leading-[30px] no-underline">{x}</Link>
                : <button type="button" key={x} aria-disabled="true" onClick={unavailable} className="block min-h-[30px] py-0.5 text-left text-[15px]">{x}</button>))}
            </div>
          ))}
          <div>
            <h2 className={heading}>{t('footer.social')}</h2>
            <div className="mb-6 flex gap-2">
              {social.map((s, i) => <button key={names[i]} type="button" aria-disabled="true" onClick={unavailable} className="grid size-8 place-items-center rounded-[4px] border border-primary text-[13px] font-bold text-primary"><span className="sr-only">{names[i]}</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">{s}</svg></button>)}
            </div>
            <h2 className={heading}>{t('footer.wallets')}</h2>
            <p className="m-0 rounded-[4px] border border-[#3f2319] bg-background/30 px-3 py-1.5 text-center text-[10px] font-bold tracking-[0.5px] text-brand">{t('footer.walletBadges')}</p>
          </div>
        </div>
      </div>
      <p className="my-4 text-center text-[15px]">{t('footer.copyright')}</p>
    </footer>
  )
}
