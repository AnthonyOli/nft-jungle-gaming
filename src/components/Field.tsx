import type { ComponentProps } from 'react'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
export const controlClass = 'h-10 rounded-[4px] border-[#3f2319] bg-transparent px-3 py-0 text-[14px] placeholder:text-[#a48b6d]'


type Common = { label: string; req?: boolean; className?: string; error?: string }
type SelectProps = {
  as: 'select'; options: string[]; placeholder: string; name: string; required?: boolean
  defaultValue?: string; value?: string; onValueChange?: (v: string) => void
}
type Props =
  | (Common & { as?: 'input' } & ComponentProps<'input'>)
  | (Common & { as: 'textarea' } & ComponentProps<'textarea'>)
  | (Common & SelectProps)

export default function Field(props: Props) {
  const { t } = useTranslation()
  const errId = useId()
  const { label, req, className, error } = props
  const a11y = { 'aria-invalid': !!error || undefined, 'aria-describedby': error ? errId : undefined }
  let control
  if (props.as === 'select') {
    const { options, placeholder, name, defaultValue, value, onValueChange, required } = props
    control = (
      <Select name={name} {...(value !== undefined ? { value: value || null } : { defaultValue: defaultValue || null })}
        onValueChange={(v) => onValueChange?.(v as string)} required={required}>
        <SelectTrigger className={cn(controlClass, 'w-full')} {...a11y}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    )
  } else if (props.as === 'textarea') {
    const { as: _as, label: _l, req: _r, className: _c, error: _e, ...rest } = props
    control = <textarea className={cn('h-auto min-h-[150px] w-full border border-input py-2 outline-none focus-visible:border-ring aria-invalid:border-destructive', controlClass)} {...a11y} {...rest} />
  } else {
    const { as: _as, label: _l, req: _r, className: _c, error: _e, ...rest } = props
    control = <Input className={controlClass} {...a11y} {...rest} />
  }
  return (
    <Label className={cn('mb-[18px] grid gap-2 text-[15px] font-normal', className)}>
      <span>{label}{req && <span className="text-destructive">*</span>}</span>
      {control}
      {error && <span id={errId} role="alert" className="text-xs text-destructive">{t(`fieldErrors.${error}`, { defaultValue: t('fieldErrors.invalid_data') })}</span>}
    </Label>
  )
}
