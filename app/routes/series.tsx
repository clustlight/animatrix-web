import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { Series } from '../types'
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
import { MdSwapHoriz } from 'react-icons/md'

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

  const data = loaderData as Series
  const seasons = data.seasons ?? []
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonParam = searchParams.get('season')
  const tabListRef = useRef<HTMLDivElement>(null)

  const initialSeasonIndex = useMemo(
    () => (seasonParam ? seasons.findIndex(s => s.season_id === seasonParam) : 0),
    [seasonParam, seasons]
  )
  const [activeSeason, setActiveSeason] = useState(initialSeasonIndex >= 0 ? initialSeasonIndex : 0)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(data.title)
  const [editLoading, setEditLoading] = useState(false)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveSeasonId, setMoveSeasonId] = useState<string | null>(null)
  const [moveLoading, setMoveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editSeasonModalOpen, setEditSeasonModalOpen] = useState(false)
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null)
  const [editSeasonTitle, setEditSeasonTitle] = useState<string>('')

  const { showToast } = useToast()

  useEffect(() => {
    if (seasonParam) {
      const idx = seasons.findIndex(s => s.season_id === seasonParam)
      if (idx !== -1) setActiveSeason(idx)
    }
  }, [seasonParam, seasons])

  const handleTabClick = useCallback(
    (idx: number, seasonId: string) => {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev)
        newParams.set('season', seasonId)
        return newParams
      })
    },
    [setSearchParams]
  )

  const scrollTabs = useCallback((dir: 'left' | 'right') => {
    if (tabListRef.current) {
      tabListRef.current.scrollBy({
        left: dir === 'left' ? -120 : 120,
        behavior: 'smooth'
      })
    }
  }, [])

  const handleTitleSave = useCallback(async () => {
    setEditLoading(true)
    try {
      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/series/${data.series_id}`, {
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
  }, [title, data.series_id])

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
      const res = await fetch(`${baseUrl}/v1/series/${data.series_id}`, {
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
  }, [data.series_id, showToast])

  // シーズン名保存API
  const handleSaveSeasonTitle = useCallback(async (seasonId: string, newTitle: string) => {
    const baseUrl = await getApiBaseUrl()
    const res = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season_title: newTitle })
    })
    if (!res.ok) throw new Error('保存に失敗しました')
    window.location.reload()
  }, [])

  useEffect(() => {
    document.title = `${data.title} | animatrix`
  }, [data.title])

  const totalEpisodes = useMemo(
    () => seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0),
    [seasons]
  )

  return (
    <main className='flex items-center justify-center pt-4 pb-4'>
      <div className='flex-1 flex flex-col items-center gap-8 min-h-0'>
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
          portraitUrl={
            seasons[activeSeason]
              ? data.portrait_url.replace(
                  /\/([^/]+)\/portrait\.png$/,
                  `/${seasons[activeSeason].season_id.replace(/_[^_]+$/, '')}/portrait.png`
                )
              : data.portrait_url
          }
          originalTitle={data.title}
        />
        <div className='w-full max-w-2xl px-2'>
          <div className='flex items-center'>
            <div className='flex-1'>
              <SeasonTabs
                seasons={seasons}
                activeSeason={activeSeason}
                onTabClick={handleTabClick}
                tabListRef={tabListRef}
                scrollTabs={scrollTabs}
                setEditSeasonId={setEditSeasonId}
                setEditSeasonTitle={setEditSeasonTitle}
                setEditSeasonModalOpen={setEditSeasonModalOpen}
              />
            </div>
            <button
              className='flex items-center justify-center w-10 h-10 ml-2 bg-blue-700 hover:bg-blue-800 text-white rounded-full shadow transition-colors cursor-pointer'
              onClick={() => handleMoveClick(seasons[activeSeason]?.season_id)}
              disabled={moveLoading}
              type='button'
              style={{ alignSelf: 'flex-start' }}
            >
              <MdSwapHoriz size={24} />
            </button>
          </div>
          <MoveSeasonModal
            open={moveModalOpen}
            onClose={() => setMoveModalOpen(false)}
            seasonId={moveSeasonId ?? ''}
            onMove={handleMoveSeason}
            seasonTitle={seasons.find(s => s.season_id === moveSeasonId)?.season_title}
          />
          <div className='flex flex-col gap-4'>
            <EpisodeList episodes={seasons[activeSeason]?.episodes ?? []} />
          </div>
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
          onSave={handleSaveSeasonTitle}
        />
      </div>
    </main>
  )
}
