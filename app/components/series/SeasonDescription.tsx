import { useEffect, useMemo, useState } from 'react'
import { parseDescription } from '../../lib/seasonDescription'
import { SeasonDescriptionContent } from './SeasonDescriptionContent'

export function SeasonDescription({
  seasonId,
  title,
  description,
  period,
  shoboiTid
}: {
  seasonId: string
  title: string
  description: string
  period: string
  shoboiTid: number
}) {
  const [open, setOpen] = useState(true)
  const sections = useMemo(() => parseDescription(description), [description])
  const hasLinks = sections.some(section => section.links.length > 0)

  useEffect(() => {
    const media = window.matchMedia?.('(orientation: portrait)')
    if (!media) {
      setOpen(window.innerHeight <= window.innerWidth)
      return
    }
    const apply = () => setOpen(!media.matches)
    apply()
    media.addEventListener?.('change', apply)
    return () => media.removeEventListener?.('change', apply)
  }, [seasonId])

  return (
    <div className='w-full rounded-lg border border-border bg-card/70 p-4 text-sm text-card-foreground'>
      <div className='flex items-start justify-between gap-3'>
        <div className='text-base font-semibold'>{title}</div>
        {description && (
          <button
            type='button'
            onClick={() => setOpen(value => !value)}
            className='text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-1 transition-colors'
          >
            {open ? '説明を隠す' : '説明を表示'}
          </button>
        )}
      </div>
      <div className='mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground'>
        {period && <span>{`放送期間: ${period}`}</span>}
        {shoboiTid > 0 && <span>{`しょぼいカレンダーID: ${shoboiTid}`}</span>}
      </div>
      {description && !open && hasLinks && (
        <div className='mt-3'>
          <SeasonDescriptionContent description={description} sections={sections} compact />
        </div>
      )}
      {description && open && (
        <div className='mt-3 text-muted-foreground'>
          <SeasonDescriptionContent description={description} sections={sections} />
        </div>
      )}
    </div>
  )
}
