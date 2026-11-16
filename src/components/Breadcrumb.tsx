import { useTranslation } from 'react-i18next'
export default function Breadcrumb({ trail }: { trail: ('home' | 'market' | 'cart' | 'checkout')[] }) {
  const { t } = useTranslation()
  return <p className="mt-[30px] mb-3"><b>{trail.map((k) => t(`crumb.${k}`)).join(' / ')}</b></p>
}
