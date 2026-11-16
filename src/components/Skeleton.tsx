import { Skeleton as UiSkeleton } from '@/components/ui/skeleton'

export default function Skeleton({ w = '100%', h, ratio, mt, count = 1 }: { w?: string | number; h?: number | string; ratio?: string; mt?: number; count?: number }) {
  const style = { width: w, height: h ?? (ratio ? undefined : 14), aspectRatio: ratio, marginTop: mt }
  return Array.from({ length: count }, (_, i) => (
    <UiSkeleton
      key={i}
      style={style}
      className="rounded-lg bg-[linear-gradient(90deg,var(--card)_25%,var(--secondary)_50%,var(--card)_75%)] bg-[length:200%_100%] animate-shimmer motion-reduce:animate-none"
    />
  ))
}
