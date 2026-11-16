import type { ComponentProps } from 'react'
import { Button as UiButton } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = ComponentProps<typeof UiButton> & { ghost?: boolean }
export default function Button({ ghost, className, ...p }: Props) {
  return (
    <UiButton
      variant={ghost ? 'outline' : 'default'}
      className={cn(
        'h-auto rounded-[6px] px-4 py-2 text-[15px] font-bold',
        ghost && 'border-border bg-transparent text-foreground hover:bg-transparent',
        className,
      )}
      {...p}
    />
  )
}
