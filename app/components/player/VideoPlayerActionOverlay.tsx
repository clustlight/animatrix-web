import type { ReactNode } from 'react'

// Action overlay (centered icon/text)
export function ActionOverlay({ icon, text }: { icon: ReactNode | null; text: string | null }) {
  if (!icon && !text) return null
  return (
    <div
      className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/70 text-foreground border border-border px-10 py-6 rounded-2xl text-2xl font-bold z-20 pointer-events-none select-none shadow-lg flex flex-col items-center gap-2'
      style={{
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial'
      }}
    >
      {icon}
      {text && <span>{text}</span>}
    </div>
  )
}
