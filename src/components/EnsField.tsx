import type { ComponentProps } from 'react'
import { controlClass } from './Field'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function EnsField(props: ComponentProps<'input'>) {
  const { t } = useTranslation()
  return (
    <Label className="mb-[18px] grid gap-2 text-[15px] font-normal">
      <span>{t('common.ensName')}<span className="text-destructive">*</span></span>
      <div className="flex gap-2">
        <Select disabled defaultValue=".eth">
          <SelectTrigger aria-label=".eth" className={controlClass}><SelectValue /></SelectTrigger>
        </Select>
        <Input name="ens" className={`${controlClass} flex-1`} {...props} />
      </div>
    </Label>
  )
}
