import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
const square = 'grid size-[35px] cursor-pointer place-items-center rounded-[4px] border border-[#3f2319] text-[18px] disabled:cursor-default disabled:opacity-40'


export default function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (n: number) => void }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('home.pagination')} className="flex flex-wrap justify-end gap-2">
      <button type="button" aria-label={t('home.prevPage')} disabled={page <= 1} onClick={() => onChange(page - 1)} className={square}>
        <ChevronLeftIcon aria-hidden="true" className="size-5" />
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}
          className={cn(square, n === page && 'border-primary bg-primary font-bold text-primary-foreground')}>{n}</button>
      ))}
      <button type="button" aria-label={t('home.nextPage')} disabled={page >= pages} onClick={() => onChange(page + 1)} className={square}>
        <ChevronRightIcon aria-hidden="true" className="size-5" />
      </button>
    </nav>
  )
}
