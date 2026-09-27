import { useCallback, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Season, SeasonMetadata } from '../types'
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
  setSeasons,
  setEditSeasonTitle,
  setEditing,
  setMoveModalOpen,
  setDeleteDialogOpen
}: {
  seriesId: string
  title: string
  moveSeasonId: string | null
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

  const updateSeasonInfo = useCallback(
    async (seasonId: string, changes: SeasonMetadata) => {
      const baseUrl = await getApiBaseUrl()
      await patchJson(`${baseUrl}/v1/season/${seasonId}`, changes)
      setEditSeasonTitle(changes.season_title)
      setSeasons(previous =>
        previous.map(season => (season.season_id === seasonId ? { ...season, ...changes } : season))
      )
    },
    [setEditSeasonTitle, setSeasons]
  )

  return {
    editLoading,
    moveLoading,
    deleteLoading,
    saveTitle,
    moveSeason,
    deleteSeries,
    updateSeasonInfo
  }
}
