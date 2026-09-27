import type { DescriptionLink, DescriptionSection } from '../../lib/seasonDescription'

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
      {links.map((link, index) => {
        const faviconUrl = getFaviconUrl(link.url)
        return (
          <a
            key={`${link.url}-${index}`}
            href={link.url}
            target='_blank'
            rel='noreferrer'
            className={`${compact ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2 py-1'} bg-secondary/80 hover:bg-secondary text-secondary-foreground rounded-full border border-border transition-colors`}
          >
            <span className='inline-flex items-center gap-1.5'>
              {faviconUrl && (
                <img
                  src={faviconUrl}
                  alt=''
                  aria-hidden='true'
                  className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} rounded-sm`}
                />
              )}
              {link.label || link.url}
            </span>
          </a>
        )
      })}
    </div>
  )
}

export function SeasonDescriptionContent({
  description,
  sections,
  compact = false
}: {
  description: string
  sections: DescriptionSection[]
  compact?: boolean
}) {
  const structured = sections.some(
    section => section.title || section.links.length || section.staff.length
  )
  if (compact) {
    return <DescriptionLinks links={sections.flatMap(section => section.links)} compact />
  }
  if (!structured) return <div className='whitespace-pre-wrap'>{description}</div>

  return (
    <div className='grid gap-3'>
      {sections.map((section, index) => (
        <DescriptionSectionView key={`${section.title ?? 'section'}-${index}`} section={section} />
      ))}
    </div>
  )
}

function DescriptionSectionView({ section }: { section: DescriptionSection }) {
  return (
    <section className='rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-3'>
      {section.title && (
        <div className='text-sm font-semibold text-foreground mb-2'>{section.title}</div>
      )}
      {section.links.length > 0 && <DescriptionLinks links={section.links} />}
      {section.notes.length > 0 && (
        <div className='space-y-3 text-sm text-muted-foreground'>
          {section.notes.map((note, index) => (
            <div key={`${note.subtitle ?? 'note'}-${index}`}>
              {note.subtitle && (
                <div className='text-sm font-semibold text-foreground'>{note.subtitle}</div>
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
          {section.text.map((text, index) => (
            <p key={`${text}-${index}`}>{text}</p>
          ))}
        </div>
      )}
      {section.staff.length > 0 && (
        <dl className='grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-4 gap-y-2 text-xs text-foreground max-h-60 overflow-y-auto pr-1 leading-relaxed'>
          {section.staff.map((entry, index) => (
            <div key={`${entry.role}-${index}`} className='contents'>
              <dt className='text-muted-foreground'>{entry.role}</dt>
              <dd className='text-foreground'>{entry.name}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  )
}
