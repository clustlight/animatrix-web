import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEffect, useState } from 'react'
import type { Series } from '../types'
import type { Route } from './+types/series'
import 'dayjs/locale/ja'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { getApiBaseUrl } from '../lib/config'
import { MoveSeasonModal } from '../components/modals/MoveSeasonModal'
import { EditSeasonModal } from '../components/modals/EditSeasonModal'
import { DeleteDialog } from '../components/dialogs/DeleteDialog'
import { SeriesPageContent } from '../components/series/SeriesPageContent'
import { useSeriesActions } from '../hooks/useSeriesActions'
import { useSeriesPageState } from '../hooks/useSeriesPageState'
import { useEpisodeActions } from '../hooks/useEpisodeActions'

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
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(seriesData.title)
  const {
    seasons,
    setSeasons,
    activeSeason,
    activeSeasonData,
    totalEpisodes,
    seasonPeriod,
    activePortraitUrl,
    handleTabClick,
    handleMoveClick,
    moveModalOpen,
    setMoveModalOpen,
    moveSeasonId,
    deleteDialogOpen,
    setDeleteDialogOpen,
    editSeasonModalOpen,
    setEditSeasonModalOpen,
    editSeasonId,
    setEditSeasonId,
    editSeasonTitle,
    setEditSeasonTitle
  } = useSeriesPageState(seriesData)

  const {
    editLoading,
    moveLoading,
    deleteLoading,
    saveTitle: handleTitleSave,
    moveSeason: handleMoveSeason,
    deleteSeries: handleDeleteSeries,
    updateSeasonInfo
  } = useSeriesActions({
    seriesId: seriesData.series_id,
    title,
    moveSeasonId,
    setSeasons,
    setEditSeasonTitle,
    setEditing,
    setMoveModalOpen,
    setDeleteDialogOpen
  })
  const {
    deleteEpisode,
    updateEpisode,
    seasonSynced: handleSeasonSynced
  } = useEpisodeActions({ editSeasonId, setSeasons })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])
  const pageTitle = `${seriesData.title} | animatrix`
  const editingSeason = seasons.find(season => season.season_id === editSeasonId)
  return (
    <main className='flex items-center justify-center pt-4 pb-4 min-h-[calc(100vh-5rem)]'>
      <title>{pageTitle}</title>
      <div className='flex-1 flex flex-col items-center min-h-0'>
        <SeriesPageContent
          seasons={seasons}
          activeSeason={activeSeason}
          activeSeasonData={activeSeasonData}
          totalEpisodes={totalEpisodes}
          seasonPeriod={seasonPeriod}
          activePortraitUrl={activePortraitUrl}
          seriesTitle={seriesData.title}
          seriesPortraitUrl={seriesData.portrait_url}
          editing={editing}
          title={title}
          setTitle={setTitle}
          editLoading={editLoading}
          setEditing={setEditing}
          onTitleSave={handleTitleSave}
          onDeleteClick={() => setDeleteDialogOpen(true)}
          deleteLoading={deleteLoading}
          onMoveClick={() => handleMoveClick(seasons[activeSeason]?.season_id)}
          moveLoading={moveLoading}
          onTabClick={handleTabClick}
          onEditSeason={season => {
            setEditSeasonId(season.season_id)
            setEditSeasonTitle(season.season_title)
            setEditSeasonModalOpen(true)
          }}
        />
        <MoveSeasonModal
          open={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          seasonId={moveSeasonId ?? ''}
          onMove={handleMoveSeason}
          seasonTitle={seasons.find(s => s.season_id === moveSeasonId)?.season_title}
        />
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
          initialSeason={editingSeason}
          seriesTitle={seriesData.title}
          onSave={updateSeasonInfo}
          episodes={editingSeason?.episodes ?? []}
          onDeleteEpisode={deleteEpisode}
          onUpdateEpisode={updateEpisode}
          onSeasonSynced={handleSeasonSynced}
          shoboiTid={editingSeason?.shoboi_tid}
        />
      </div>
    </main>
  )
}
