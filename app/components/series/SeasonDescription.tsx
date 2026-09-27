import { useEffect, useMemo, useState } from 'react'

type DescriptionLink = { label: string; url: string }
type DescriptionStaff = { role: string; name: string }
type DescriptionSection = {
  title: string | null
  links: DescriptionLink[]
  staff: DescriptionStaff[]
  text: string[]
  notes: { subtitle: string | null; items: string[] }[]
}

const linkPattern = /^-\[\[(.+?)\s+(https?:\/\/[^\]]+)\]\]$/

function parseDescription(value: string): DescriptionSection[] {
  const sections: DescriptionSection[] = []
  let current: DescriptionSection = { title: null, links: [], staff: [], text: [], notes: [] }
  let currentNote: DescriptionSection['notes'][number] | null = null

  const pushCurrent = () => {
    if (current.title || current.links.length || current.staff.length || current.text.length) {
      sections.push(current)
    }
  }

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('**')) {
      currentNote = { subtitle: line.slice(2).trim() || null, items: [] }
      current.notes.push(currentNote)
      continue
    }
    if (line.startsWith('*')) {
      pushCurrent()
      current = { title: line.slice(1).trim() || null, links: [], staff: [], text: [], notes: [] }
      currentNote = null
      continue
    }
    const linkMatch = line.match(linkPattern)
    if (linkMatch) {
      current.links.push({ label: linkMatch[1].trim(), url: linkMatch[2].trim() })
      continue
    }
    if (line.startsWith(':')) {
      const [role, ...rest] = line.slice(1).split(':')
      const name = rest.join(':').trim()
      const roleText = (role ?? '').trim()
      if (roleText || name) current.staff.push({ role: roleText, name })
      continue
    }
    if (line.startsWith('-')) {
      const item = line.slice(1).trim()
      if (currentNote) currentNote.items.push(item)
      else current.text.push(item)
      continue
    }
    if (currentNote) currentNote.items.push(line)
    else current.text.push(line)
  }
  pushCurrent()
  return sections
}

function getFaviconUrl(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
  } catch {
    return ''
  }
}

function DescriptionLinks({
  links,
  compact = false
}: {
  links: DescriptionLink[]
  compact?: boolean
}) {
  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {links.map((link, index) => (
        <a
          key={`${link.url}-${index}`}
          href={link.url}
          target='_blank'
          rel='noreferrer'
          className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-full border border-border transition-colors`}
        >
          <span className='inline-flex items-center gap-1.5'>
            {getFaviconUrl(link.url) && (
              <img
                src={getFaviconUrl(link.url)}
                alt=''
                aria-hidden='true'
                className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} rounded-sm`}
              />
            )}
            {link.label || link.url}
          </span>
        </a>
      ))}
    </div>
  )
}

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
  const structured = sections.some(
    section => section.title || section.links.length || section.staff.length
  )
  const links = sections.flatMap(section => section.links)

  useEffect(() => {
    if (!window.matchMedia) {
      setOpen(window.innerHeight <= window.innerWidth)
      return
    }
    const media = window.matchMedia('(orientation: portrait)')
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
      {description && !open && links.length > 0 && (
        <div className='mt-3'>
          <DescriptionLinks links={links} compact />
        </div>
      )}
      {description && open && (
        <div className='mt-3 text-muted-foreground'>
          {structured ? (
            <div className='grid gap-3'>
              {sections.map((section, index) => (
                <section
                  key={`${section.title ?? 'section'}-${index}`}
                  className='rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-3'
                >
                  {section.title && (
                    <div className='text-sm font-semibold text-foreground mb-2'>
                      {section.title}
                    </div>
                  )}
                  {section.links.length > 0 && <DescriptionLinks links={section.links} />}
                  {section.notes.length > 0 && (
                    <div className='space-y-3 text-sm text-muted-foreground'>
                      {section.notes.map((note, noteIndex) => (
                        <div key={`${note.subtitle ?? 'note'}-${noteIndex}`}>
                          {note.subtitle && (
                            <div className='text-sm font-semibold text-foreground'>
                              {note.subtitle}
                            </div>
                          )}
                          {note.items.length > 0 && (
                            <ul className='mt-1 list-disc pl-4 space-y-1'>
                              {note.items.map((item, itemIndex) => (
                                <li key={`${item}-${itemIndex}`}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {section.text.length > 0 && (
                    <div className='space-y-2 text-sm text-muted-foreground'>
                      {section.text.map((text, textIndex) => (
                        <p key={`${text}-${textIndex}`}>{text}</p>
                      ))}
                    </div>
                  )}
                  {section.staff.length > 0 && (
                    <dl className='grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-xs text-foreground max-h-60 overflow-y-auto pr-1 leading-relaxed'>
                      {section.staff.map((entry, entryIndex) => (
                        <div key={`${entry.role}-${entryIndex}`} className='contents'>
                          <dt className='text-muted-foreground'>{entry.role}</dt>
                          <dd className='text-foreground'>{entry.name}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </section>
              ))}
            </div>
          ) : (
            <div className='whitespace-pre-wrap text-muted-foreground'>{description}</div>
          )}
        </div>
      )}
    </div>
  )
}
