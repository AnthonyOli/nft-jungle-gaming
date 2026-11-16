import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogClose, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export default function Modal({ onClose, label, className, children }: { onClose: () => void; label: string; className?: string; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        aria-label={label}
        className={cn('block w-[500px] max-w-[92vw] gap-0 rounded-none border-b-10 border-primary bg-popover px-20 pt-10 pb-14 ring-0 sm:max-w-[92vw] max-h-[92vh] overflow-y-auto max-[800px]:px-6', className)}
      >
        <DialogClose aria-label={t('common.close')} className="absolute top-3 right-4 cursor-pointer text-base text-brand">✕</DialogClose>
        {children}
      </DialogContent>
    </Dialog>
  )
}
