import { useState } from 'react'
import { controlClass } from './Field'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import type { Facet } from '../api/types'
import Button from './Button'
const title = 'mt-0 mb-2 text-[17px]'

type Group = 'collection' | 'network'
type Props = {
  facets?: { collections: Facet[]; networks: Facet[] }
  selected: { collection: string[]; network: string[] }
  price: { min?: string; max?: string }
  onToggle: (group: Group, name: string) => void
  onPrice: (min?: string, max?: string) => void
  onClear: () => void
  dirty: boolean
}

const PRICE = /^\d+(\.\d{1,18})?$/

const List = ({ title: heading, group, items, selected, onToggle }: { title: string; group: Group; items: Facet[]; selected: string[]; onToggle: Props['onToggle'] }) => (
  <fieldset className="m-0 border-0 p-0">
    <legend className={`${title} float-left w-full`}>{heading}</legend>
    <ul className="clear-both">
      {items.map(({ name, count }) => (
        <li key={name}>
          <label className="group flex h-10 cursor-pointer items-center justify-between rounded-sm px-3 text-[15px] text-muted-foreground has-[:checked]:text-brand has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
            <input type="checkbox" className="sr-only" checked={selected.includes(name)} onChange={() => onToggle(group, name)} />
            <span>{name}</span>
            <span className="font-bold text-foreground group-has-[:checked]:text-brand">({count})</span>
          </label>
        </li>
      ))}
    </ul>
  </fieldset>
)

export default function FilterSidebar({ facets, selected, price, onToggle, onPrice, onClear, dirty }: Props) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  return (
    <aside className="bg-card p-5">
      <List title={t('filters.collections')} group="collection" items={facets?.collections ?? []} selected={selected.collection} onToggle={onToggle} />
      <h2 className={`${title} mt-6`}>{t('filters.priceRange')}</h2>
      <form key={`${price.min}:${price.max}`} noValidate onSubmit={(e) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        const [min, max] = ['min', 'max'].map((k) => String(f.get(k) ?? '').trim())
        if ((min && !PRICE.test(min)) || (max && !PRICE.test(max))) return setError(t('filters.priceInvalid'))
        if (min && max && Number(min) > Number(max)) return setError(t('filters.minOverMax'))
        setError(null)
        onPrice(min || undefined, max || undefined)
      }}>
        <div className="grid grid-cols-2 gap-2">
          <Input name="min" inputMode="decimal" defaultValue={price.min} aria-label={t('filters.min')} placeholder={t('filters.min')} aria-invalid={!!error} className={controlClass} />
          <Input name="max" inputMode="decimal" defaultValue={price.max} aria-label={t('filters.max')} placeholder={t('filters.max')} aria-invalid={!!error} className={controlClass} />
        </div>
        {error && <p role="alert" className="my-1 text-xs text-destructive">{error}</p>}
        <Button type="submit" className="mt-3 h-[30px] rounded-[4px] px-4 py-0 text-[14px] normal-case">{t('common.apply')}</Button>
      </form>
      <div className="mt-6"><List title={t('filters.network')} group="network" items={facets?.networks ?? []} selected={selected.network} onToggle={onToggle} /></div>
      {dirty && <Button ghost type="button" className="mt-4 w-full" onClick={onClear}>{t('filters.clear')}</Button>}
    </aside>
  )
}
