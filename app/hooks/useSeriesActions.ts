import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Season } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { useToast } from '../components/providers/ToastProvider'

async function patchJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response
}

export function useSeriesActions({
  seriesId,
  title,
  moveSeasonId,
  editSeasonId,
  setSeasons,
  setEditSeasonTitle,
  setEditing,
  setMoveModalOpen,
  setDeleteDialogOpen
}: {
  seriesId: string
  title: string
  moveSeasonId: string | null
  editSeasonId: string | null
  setSeasons: Dispatch<SetStateAction<Season[]>>
  setEditSeasonTitle: Dispatch<SetStateAction<string>>
  setEditing: Dispatch<SetStateAction<boolean>>
  setMoveModalOpen: Dispatch<SetStateAction<boolean>>
  setDeleteDialogOpen: Dispatch<SetStateAction<boolean>>
}) {
  const [editLoading, setEditLoading] = useState(false)
  const [moveLoading, setMoveLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const { showToast } = useToast()

  const saveTitle = useCallback(async () => {
    setEditLoading(true)
    try {
      const baseUrl = await getApiBaseUrl()
      await patchJson(`${baseUrl}/v1/series/${seriesId}`, { title })
      setEditing(false)
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'シリーズ名の更新に失敗しました', 'error')
    } finally {
      setEditLoading(false)
    }
  }, [seriesId, setEditing, showToast, title])

  const moveSeason = useCallback(
    async (targetSeriesId: string) => {
      if (!moveSeasonId) return
      setMoveLoading(true)
      try {
        const baseUrl = await getApiBaseUrl()
        await patchJson(`${baseUrl}/v1/season/${moveSeasonId}`, { series_id: targetSeriesId })
        setMoveModalOpen(false)
        showToast('シーズンを移動しました', 'success')
        setTimeout(() => window.location.reload(), 800)
      } catch (cause) {
        showToast(cause instanceof Error ? cause.message : '移動に失敗しました', 'error')
      } finally {
        setMoveLoading(false)
      }
    },
    [moveSeasonId, setMoveModalOpen, showToast]
  )

  const deleteSeries = useCallback(async () => {
    setDeleteLoading(true)
    try {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/series/${seriesId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (response.status === 409) {
        showToast('このシリーズにはシーズンがあるため削除できません', 'error')
        return
      }
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      showToast('シリーズを削除しました', 'success')
      setTimeout(() => {
        window.location.href = '/'
      }, 800)
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : '削除に失敗しました', 'error')
    } finally {
      setDeleteLoading(false)
      setDeleteDialogOpen(false)
    }
  }, [seriesId, setDeleteDialogOpen, showToast])

  const updateSeasonTitle = useCallback(
    async (seasonId: string, newTitle: string) => {
      const baseUrl = await getApiBaseUrl()
      await patchJson(`${baseUrl}/v1/season/${seasonId}`, { season_title: newTitle })
      setEditSeasonTitle(newTitle)
      setSeasons(previous =>
        previous.map(season =>
          season.season_id === seasonId ? { ...season, season_title: newTitle } : season
        )
      )
    },
    [setEditSeasonTitle, setSeasons]
  )

  const deleteEpisode = useCallback(
    async (episodeId: string, episodeTitle?: string) => {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/episode/${episodeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) showToast('エピソード削除に失敗しました', 'error')
      setSeasons(previous =>
        previous.map(season =>
          season.season_id === editSeasonId
            ? {
                ...season,
                episodes: season.episodes?.filter(episode => episode.episode_id !== episodeId) ?? []
              }
            : season
        )
      )
      showToast(`${episodeTitle ?? ''} を削除しました`, 'success')
    },
    [editSeasonId, setSeasons, showToast]
  )

  const seasonSynced = useCallback(
    (seasonId: string, updatedSeason: Season) => {
      setSeasons(previous =>
        previous.map(season =>
          season.season_id === seasonId
            ? { ...season, ...updatedSeason, episodes: updatedSeason.episodes ?? season.episodes }
            : season
        )
      )
    },
    [setSeasons]
  )

  const updateEpisode = useCallback(
    async (episodeId: string, changes: { title: string; timestamp: string }) => {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/episode/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      setSeasons(previous =>
        previous.map(season => ({
          ...season,
          episodes: season.episodes?.map(episode =>
            episode.episode_id === episodeId ? { ...episode, ...changes } : episode
          )
        }))
      )
    },
    [setSeasons]
  )

  return {
    editLoading,
    moveLoading,
    deleteLoading,
    saveTitle,
    moveSeason,
    deleteSeries,
    updateSeasonTitle,
    deleteEpisode,
    updateEpisode,
    seasonSynced
  }
}
