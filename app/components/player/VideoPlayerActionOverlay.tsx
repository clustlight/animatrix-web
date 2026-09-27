import type { ReactNode } from 'react'

// Action overlay (centered icon/text)
export function ActionOverlay({ icon, text }: { icon: ReactNode | null; text: string | null }) {
  if (!icon && !text) return null
  return (
    <div
      className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 rounded-xl border border-white/15 bg-black/55 px-6 py-4 text-xl font-semibold tracking-tight text-white shadow-xl shadow-black/25 backdrop-blur-md pointer-events-none select-none'
      style={{
        fontVariantNumeric: 'tabular-nums'
      }}
    >
      {icon}
      {text && <span>{text}</span>}
    </div>
  )
}
