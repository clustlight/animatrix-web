import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Series } from '../types'
import type { Route } from './+types/series'
import 'dayjs/locale/ja'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { getApiBaseUrl } from '../lib/config'
import { MoveSeasonModal } from '../components/modals/MoveSeasonModal'
import { EpisodeList } from '../components/lists/EpisodeList'
import { EditSeasonModal } from '../components/modals/EditSeasonModal'
import { SeasonTabs } from '../components/tabs/SeasonTabs'
import { DeleteDialog } from '../components/dialogs/DeleteDialog'
import { SeriesHeader } from '../components/headers/SeriesHeader'
import { SeasonDescription } from '../components/series/SeasonDescription'
import { useSeriesActions } from '../hooks/useSeriesActions'

dayjs.extend(relativeTime)
dayjs.locale('ja')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)

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
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveSeasonId, setMoveSeasonId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editSeasonModalOpen, setEditSeasonModalOpen] = useState(false)
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null)
  const [editSeasonTitle, setEditSeasonTitle] = useState<string>('')

  const activeSeasonData = seasons[activeSeason]
  const {
    editLoading,
    moveLoading,
    deleteLoading,
    saveTitle: handleTitleSave,
    moveSeason: handleMoveSeason,
    deleteSeries: handleDeleteSeries,
    updateSeasonTitle,
    deleteEpisode,
    updateEpisode,
    seasonSynced: handleSeasonSynced
  } = useSeriesActions({
    seriesId: seriesData.series_id,
    title,
    moveSeasonId,
    editSeasonId,
    setSeasons,
    setEditSeasonTitle,
    setEditing,
    setMoveModalOpen,
    setDeleteDialogOpen
  })

  useEffect(() => {
    if (!seasonParam) return
    const index = seasons.findIndex(season => season.season_id === seasonParam)
    if (index !== -1) setActiveSeason(index)
  }, [seasonParam, seasons])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
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

  const handleMoveClick = useCallback((seasonId: string) => {
    setMoveSeasonId(seasonId)
    setMoveModalOpen(true)
  }, [])
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
                <SeasonDescription
                  seasonId={activeSeasonData.season_id}
                  title={activeSeasonData.season_title}
                  description={activeSeasonData.description ?? ''}
                  period={seasonPeriod}
                  shoboiTid={activeSeasonData.shoboi_tid}
                />
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
          onUpdateEpisode={updateEpisode}
          onSeasonSynced={handleSeasonSynced}
          shoboiTid={seasons.find(s => s.season_id === editSeasonId)?.shoboi_tid}
        />
      </div>
    </main>
  )
}
