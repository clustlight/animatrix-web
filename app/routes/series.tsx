import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Season, Series } from '../types'
import type { Route } from './+types/series'
import 'dayjs/locale/ja'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { getApiBaseUrl } from '../lib/config'
import { MoveSeasonModal } from '../components/MoveSeasonModal'
import { EpisodeList } from '../components/EpisodeList'
import { EditSeasonModal } from '../components/EditSeasonModal'
import { useToast } from '../components/ToastProvider'
import { SeasonTabs } from '../components/SeasonTabs'
import { DeleteDialog } from '../components/DeleteDialog'
import { SeriesHeader } from '../components/SeriesHeader'

dayjs.extend(relativeTime)
dayjs.locale('ja')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)

type DescriptionLink = {
  label: string
  url: string
}

type DescriptionStaff = {
  role: string
  name: string
}

type DescriptionSection = {
  title: string | null
  links: DescriptionLink[]
  staff: DescriptionStaff[]
  text: string[]
  notes: { subtitle: string | null; items: string[] }[]
}

const linkPattern = /^-\[\[(.+?)\s+(https?:\/\/[^\]]+)\]\]$/

const getFaviconUrl = (url: string) => {
  try {
    const hostname = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
  } catch {
    return ''
  }
}

const parseDescription = (value: string): DescriptionSection[] => {
  const sections: DescriptionSection[] = []
  let current: DescriptionSection = {
    title: null,
    links: [],
    staff: [],
    text: [],
    notes: []
  }
  let currentNote: { subtitle: string | null; items: string[] } | null = null

  const pushCurrent = () => {
    if (
      current.title ||
      current.links.length > 0 ||
      current.staff.length > 0 ||
      current.text.length > 0
    ) {
      sections.push(current)
    }
  }

  const lines = value.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    if (line.startsWith('**')) {
      const subtitle = line.slice(2).trim()
      currentNote = { subtitle: subtitle || null, items: [] }
      current.notes.push(currentNote)
      continue
    }

    if (line.startsWith('*')) {
      pushCurrent()
      current = {
        title: line.slice(1).trim() || null,
        links: [],
        staff: [],
        text: [],
        notes: []
      }
      currentNote = null
      continue
    }

    const linkMatch = line.match(linkPattern)
    if (linkMatch) {
      const [, label, url] = linkMatch
      current.links.push({ label: label.trim(), url: url.trim() })
      continue
    }

    if (line.startsWith(':')) {
      const content = line.slice(1)
      const [role, ...rest] = content.split(':')
      const name = rest.join(':').trim()
      const roleText = (role ?? '').trim()
      if (roleText || name) {
        current.staff.push({ role: roleText, name })
      }
      continue
    }

    if (line.startsWith('-')) {
      const item = line.slice(1).trim()
      if (currentNote) {
        currentNote.items.push(item)
      } else {
        current.text.push(item)
      }
      continue
    }

    if (currentNote) {
      currentNote.items.push(line)
    } else {
      current.text.push(line)
    }
  }

  pushCurrent()
  return sections
}

const isStructuredDescription = (sections: DescriptionSection[]) =>
  sections.some(section => section.title || section.links.length > 0 || section.staff.length > 0)

export async function clientLoader({ params }: Route.LoaderArgs) {
  const seriesId = params.seriesId
  try {
    const baseUrl = await getApiBaseUrl()
    const res = await fetch(`${baseUrl}/v1/series/${seriesId}`, {
      headers: { 'Content-Type': 'application/json' }
    })
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    return await res.json()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export default function Series({ loaderData }: Route.ComponentProps) {
  if (loaderData.error) {
    return (
      <main className='flex items-center justify-center pt-16 pb-4'>
        <div className='text-red-500'>{loaderData.error}</div>
      </main>
    )
  }

  const seriesData = loaderData as Series
  const [seasons, setSeasons] = useState(seriesData.seasons ?? [])
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonParam = searchParams.get('season')

  const initialSeasonIndex = useMemo(
    () => (seasonParam ? seasons.findIndex(s => s.season_id === seasonParam) : 0),
    [seasonParam, seasons]
  )
  const [activeSeason, setActiveSeason] = useState(initialSeasonIndex >= 0 ? initialSeasonIndex : 0)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(seriesData.title)
  const [editLoading, setEditLoading] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveSeasonId, setMoveSeasonId] = useState<string | null>(null)
  const [moveLoading, setMoveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editSeasonModalOpen, setEditSeasonModalOpen] = useState(false)
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null)
  const [editSeasonTitle, setEditSeasonTitle] = useState<string>('')
  const [descriptionOpen, setDescriptionOpen] = useState(true)
  const activeSeasonData = seasons[activeSeason]

  const descriptionSections = useMemo(
    () => parseDescription(activeSeasonData?.description ?? ''),
    [activeSeasonData?.description]
  )
  const hasStructuredDescription = useMemo(
    () => isStructuredDescription(descriptionSections),
    [descriptionSections]
  )
  const descriptionLinks = useMemo(
    () => descriptionSections.flatMap(section => section.links),
    [descriptionSections]
  )

  const { showToast } = useToast()

  useEffect(() => {
    if (seasonParam) {
      const idx = seasons.findIndex(s => s.season_id === seasonParam)
      if (idx !== -1) setActiveSeason(idx)
    }
  }, [seasonParam, seasons])

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  useEffect(() => {
    const isPortrait =
      typeof window !== 'undefined' &&
      (window.matchMedia
        ? window.matchMedia('(orientation: portrait)').matches
        : window.innerHeight > window.innerWidth)
    // On portrait (vertical) hide the description pane by default
    setDescriptionOpen(!isPortrait)
  }, [activeSeasonData?.season_id])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(orientation: portrait)')
    const onChange = (e: MediaQueryListEvent) => {
      // When portrait (e.matches === true) hide description
      setDescriptionOpen(!e.matches)
    }
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange)
    } else {
      const mqLegacy = mq as MediaQueryList & {
        addListener?: (listener: (e: MediaQueryListEvent) => void) => void
      }
      mqLegacy.addListener?.(onChange)
    }
    return () => {
      if (mq.removeEventListener) {
        mq.removeEventListener('change', onChange)
      } else {
        const mqLegacy = mq as MediaQueryList & {
          removeListener?: (listener: (e: MediaQueryListEvent) => void) => void
        }
        mqLegacy.removeListener?.(onChange)
      }
    }
  }, [])

  const handleTabClick = useCallback(
    (idx: number, seasonId: string) => {
      setSearchParams(
        prev => {
          const newParams = new URLSearchParams(prev)
          newParams.set('season', seasonId)
          return newParams
        },
        { replace: true }
      )
    },
    [setSearchParams]
  )

  const handleTitleSave = useCallback(async () => {
    setEditLoading(true)
    try {
      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/series/${seriesData.series_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      setEditing(false)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '更新に失敗しました', 'error')
    } finally {
      setEditLoading(false)
    }
  }, [title, seriesData.series_id])

  const handleMoveClick = useCallback((seasonId: string) => {
    setMoveSeasonId(seasonId)
    setMoveModalOpen(true)
  }, [])

  const handleMoveSeason = useCallback(
    async (targetSeriesId: string) => {
      if (!moveSeasonId) return
      setMoveLoading(true)
      try {
        const baseUrl = await getApiBaseUrl()
        const res = await fetch(`${baseUrl}/v1/season/${moveSeasonId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ series_id: targetSeriesId })
        })
        if (!res.ok) throw new Error('移動失敗')
        setMoveModalOpen(false)
        showToast('シリーズを移動しました', 'success')
        setTimeout(() => {
          window.location.reload()
        }, 800)
      } catch (e) {
        showToast(e instanceof Error ? e.message : '移動失敗', 'error')
      } finally {
        setMoveLoading(false)
      }
    },
    [moveSeasonId, showToast]
  )

  const handleDeleteSeries = useCallback(async () => {
    setDeleteLoading(true)
    try {
      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/series/${seriesData.series_id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.status === 409) {
        const msg = 'このシリーズにはシーズンが存在するため削除できません'
        showToast(msg, 'error')
        return
      }
      if (!res.ok) throw new Error('削除失敗')
      showToast('シリーズを削除しました', 'success')
      setTimeout(() => {
        window.location.href = '/'
      }, 800)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '削除失敗'
      showToast(msg, 'error')
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [seriesData.series_id, showToast])

  const pageTitle = `${seriesData.title} | animatrix`

  const totalEpisodes = useMemo(
    () => seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0),
    [seasons]
  )

  const seasonPeriod = useMemo(() => {
    if (!activeSeasonData) return ''
    const startYear = activeSeasonData.first_year
    const startMonth = activeSeasonData.first_month
    const endYear = activeSeasonData.first_end_year
    const endMonth = activeSeasonData.first_end_month

    const start = startYear
      ? startMonth
        ? `${startYear}/${String(startMonth).padStart(2, '0')}`
        : `${startYear}`
      : ''
    const end = endYear
      ? endMonth
        ? `${endYear}/${String(endMonth).padStart(2, '0')}`
        : `${endYear}`
      : ''

    if (start && end) return `${start} 〜 ${end}`
    return start || end || ''
  }, [activeSeasonData])

  const updateSeasonTitle = useCallback(async (seasonId: string, newTitle: string) => {
    const baseUrl = await getApiBaseUrl()
    const res = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season_title: newTitle })
    })
    if (!res.ok) throw new Error('保存に失敗しました')
    setEditSeasonTitle(newTitle)
    setSeasons(prev =>
      prev.map(s => (s.season_id === seasonId ? { ...s, season_title: newTitle } : s))
    )
  }, [])

  const deleteEpisode = useCallback(
    async (episodeId: string, episodeTitle?: string) => {
      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/episode/${episodeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!res.ok) showToast('エピソード削除に失敗しました', 'error')
      setSeasons(prev =>
        prev.map(s =>
          s.season_id === editSeasonId
            ? {
                ...s,
                episodes: s.episodes?.filter(ep => ep.episode_id !== episodeId) ?? []
              }
            : s
        )
      )
      showToast(`${episodeTitle ?? ''} を削除しました`, 'success')
    },
    [editSeasonId, showToast]
  )

  const handleSeasonSynced = useCallback((seasonId: string, updatedSeason: Season) => {
    setSeasons(prev =>
      prev.map(season =>
        season.season_id === seasonId
          ? { ...season, ...updatedSeason, episodes: updatedSeason.episodes ?? season.episodes }
          : season
      )
    )
  }, [])

  const buildPortraitUrl = (inputUrl?: string) => {
    if (!inputUrl) return inputUrl ?? ''
    if (inputUrl.includes('%2F')) {
      return inputUrl.replace(/%2F[^%/]+$/, '%2Fportrait.png')
    }
    return inputUrl.replace(/\/[^/]+$/, '/portrait.png')
  }

  const activePortraitUrl = buildPortraitUrl(
    activeSeasonData?.thumbnail_url || seriesData.portrait_url
  )

  return (
    <main className='flex items-center justify-center pt-4 pb-4 min-h-[calc(100vh-5rem)]'>
      <title>{pageTitle}</title>
      <div className='flex-1 flex flex-col items-center min-h-0'>
        <div className='w-full max-w-none px-4 sm:px-6 lg:px-12 xl:px-16 h-[calc(100vh-7rem)] overflow-hidden'>
          <div className='grid h-full gap-5 md:gap-8 lg:gap-10 lg:grid-cols-[0.9fr_1.1fr] overflow-y-auto'>
            <div className='flex flex-col gap-4 lg:overflow-y-auto lg:pr-6 min-w-0'>
              <SeriesHeader
                editing={editing}
                title={title}
                setTitle={setTitle}
                editLoading={editLoading}
                setEditing={setEditing}
                handleTitleSave={handleTitleSave}
                totalSeasons={seasons.length}
                totalEpisodes={totalEpisodes}
                onDeleteClick={() => setDeleteDialogOpen(true)}
                deleteLoading={deleteLoading}
                onMoveClick={() => handleMoveClick(seasons[activeSeason]?.season_id)}
                moveLoading={moveLoading}
                portraitUrl={activePortraitUrl}
                originalTitle={seriesData.title}
              />
              <div className='w-full'>
                <SeasonTabs
                  seasons={seasons}
                  activeSeason={activeSeason}
                  onTabClick={handleTabClick}
                  setEditSeasonId={setEditSeasonId}
                  setEditSeasonTitle={setEditSeasonTitle}
                  setEditSeasonModalOpen={setEditSeasonModalOpen}
                  seriesPortraitUrl={seriesData.portrait_url}
                />
              </div>
              {activeSeasonData && (
                <div className='w-full rounded-lg border border-border bg-card/70 p-4 text-sm text-card-foreground'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='text-base font-semibold'>{activeSeasonData.season_title}</div>
                    {activeSeasonData.description && (
                      <button
                        type='button'
                        onClick={() => setDescriptionOpen(prev => !prev)}
                        className='text-xs text-muted-foreground hover:text-foreground border border-border rounded-full px-2 py-1 transition-colors'
                      >
                        {descriptionOpen ? '説明を隠す' : '説明を表示'}
                      </button>
                    )}
                  </div>
                  <div className='mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground'>
                    {seasonPeriod && <span>{`放送期間: ${seasonPeriod}`}</span>}
                    {activeSeasonData.shoboi_tid > 0 && (
                      <span>{`しょぼいTID: ${activeSeasonData.shoboi_tid}`}</span>
                    )}
                  </div>
                  {activeSeasonData.description && !descriptionOpen && (
                    <div className='mt-3 flex flex-col gap-2'>
                      {descriptionLinks.length > 0 && (
                        <div className='flex flex-wrap gap-1.5'>
                          {descriptionLinks.map((link, linkIndex) => (
                            <a
                              key={`${link.url}-${linkIndex}`}
                              href={link.url}
                              target='_blank'
                              rel='noreferrer'
                              className='text-[11px] bg-secondary/70 hover:bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full border border-border transition-colors'
                            >
                              <span className='inline-flex items-center gap-1.5'>
                                {getFaviconUrl(link.url) && (
                                  <img
                                    src={getFaviconUrl(link.url)}
                                    alt=''
                                    aria-hidden='true'
                                    className='w-3 h-3 rounded-sm'
                                  />
                                )}
                                {link.label || link.url}
                              </span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {activeSeasonData.description && descriptionOpen && (
                    <div className='mt-3 text-muted-foreground'>
                      {hasStructuredDescription ? (
                        <div className='grid gap-3'>
                          {descriptionSections.map((section, index) => (
                            <section
                              key={`${section.title ?? 'section'}-${index}`}
                              className='rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-3'
                            >
                              {section.title && (
                                <div className='text-sm font-semibold text-foreground mb-2'>
                                  {section.title}
                                </div>
                              )}
                              {section.links.length > 0 && (
                                <div className='flex flex-wrap gap-2'>
                                  {section.links.map((link, linkIndex) => (
                                    <a
                                      key={`${link.url}-${linkIndex}`}
                                      href={link.url}
                                      target='_blank'
                                      rel='noreferrer'
                                      className='text-xs bg-secondary/80 hover:bg-secondary text-secondary-foreground px-2 py-1 rounded-full border border-border transition-colors'
                                    >
                                      <span className='inline-flex items-center gap-1.5'>
                                        {getFaviconUrl(link.url) && (
                                          <img
                                            src={getFaviconUrl(link.url)}
                                            alt=''
                                            aria-hidden='true'
                                            className='w-3.5 h-3.5 rounded-sm'
                                          />
                                        )}
                                        {link.label || link.url}
                                      </span>
                                    </a>
                                  ))}
                                </div>
                              )}
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
                        <div className='whitespace-pre-wrap text-muted-foreground'>
                          {activeSeasonData.description}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className='flex flex-col min-h-0 mt-6 md:mt-0 md:pl-6 min-w-0'>
              <div className='w-full'>
                <div className='flex items-center justify-between pb-3 mb-3 border-b border-border'>
                  <div className='text-sm uppercase tracking-[0.25em] text-muted-foreground'>
                    Episodes
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {seasons[activeSeason]?.episodes?.length ?? 0} 件
                  </div>
                </div>
              </div>
              <div className='w-full lg:h-full lg:overflow-y-auto pr-2 min-w-0s'>
                <EpisodeList episodes={seasons[activeSeason]?.episodes ?? []} />
              </div>
            </div>
          </div>
          <MoveSeasonModal
            open={moveModalOpen}
            onClose={() => setMoveModalOpen(false)}
            seasonId={moveSeasonId ?? ''}
            onMove={handleMoveSeason}
            seasonTitle={seasons.find(s => s.season_id === moveSeasonId)?.season_title}
          />
        </div>
        <DeleteDialog
          open={deleteDialogOpen}
          onDelete={handleDeleteSeries}
          onCancel={() => setDeleteDialogOpen(false)}
          loading={deleteLoading}
        />
        <EditSeasonModal
          open={editSeasonModalOpen}
          onClose={() => setEditSeasonModalOpen(false)}
          seasonId={editSeasonId ?? ''}
          initialTitle={editSeasonTitle}
          seriesTitle={seriesData.title}
          onSave={updateSeasonTitle}
          episodes={seasons.find(s => s.season_id === editSeasonId)?.episodes ?? []}
          onDeleteEpisode={deleteEpisode}
          onSeasonSynced={handleSeasonSynced}
          shoboiTid={seasons.find(s => s.season_id === editSeasonId)?.shoboi_tid}
        />
      </div>
    </main>
  )
}
