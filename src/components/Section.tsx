import type { ReactNode } from 'react'
export default function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mt-10 mb-4 border-b pb-2 text-[1.17em] text-brand">{title}</h2>
      {children}
    </section>
  )
}
