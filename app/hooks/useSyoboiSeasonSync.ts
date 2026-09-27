import { useCallback, useEffect, useState } from 'react'
import type { Episode, Season } from '../types'
import { useToast } from '../components/providers/ToastProvider'
import {
  appendSyoboiTitle,
  applySyoboiTitle,
  searchSyoboiTitles,
  syncSyoboiEpisodeSchedule
} from '../lib/syoboiSeasonSyncApi'
import type { TitleResult } from '../lib/syoboiSeasonSync'

export function useSyoboiSeasonSync({
  open,
  seasonId,
  initialTitle,
  episodes,
  shoboiTid,
  onSeasonSynced,
  onTitleChange
}: {
  open: boolean
  seasonId: string
  initialTitle: string
  episodes: Episode[]
  shoboiTid?: number
  onSeasonSynced?: (seasonId: string, updatedSeason: Season) => void
  onTitleChange: (title: string) => void
}) {
  const [query, setQuery] = useState(initialTitle)
  const [results, setResults] = useState<TitleResult[]>([])
  const [selected, setSelected] = useState<TitleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [appendLoading, setAppendLoading] = useState(false)
  const [episodeLoading, setEpisodeLoading] = useState(false)
  const [episodeProgress, setEpisodeProgress] = useState(0)
  const [startEpisodeNumber, setStartEpisodeNumber] = useState(1)
  const { showToast } = useToast()

  useEffect(() => {
    setQuery(initialTitle)
    setResults([])
    setSelected(null)
    setError(null)
    setSearched(false)
  }, [initialTitle, open])

  const search = useCallback(
    async (value?: string) => {
      const keyword = (value ?? query).trim()
      if (!keyword) {
        setSearched(false)
        return
      }
      setSearched(true)
      setLoading(true)
      setError(null)
      setResults([])
      setSelected(null)
      try {
        const items = await searchSyoboiTitles(keyword)
        setResults(items)
        setSelected(items[0] ?? null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : '検索に失敗しました')
      } finally {
        setLoading(false)
      }
    },
    [query]
  )

  const applyEpisodeSchedule = useCallback(async () => {
    const tid = selected?.tid ?? shoboiTid
    if (!tid || !episodes.length) {
      const message = !tid
        ? 'しょぼいカレンダーIDが選択されていません'
        : '更新対象のエピソードがありません'
      setError(message)
      showToast(message, 'error')
      return
    }
    setEpisodeLoading(true)
    setEpisodeProgress(0)
    setError(null)
    try {
      const result = await syncSyoboiEpisodeSchedule({
        tid,
        seasonId,
        episodes,
        startEpisodeNumber,
        onProgress: setEpisodeProgress
      })
      if (result.season) onSeasonSynced?.(seasonId, result.season)
      if (result.updatedCount === 0) {
        setError(result.summary)
        showToast(result.summary, 'error')
      } else {
        showToast(result.summary, 'success')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '各話情報の更新に失敗しました'
      setError(message)
      showToast(message, 'error')
    } finally {
      setEpisodeLoading(false)
      setEpisodeProgress(0)
    }
  }, [episodes, onSeasonSynced, seasonId, selected, shoboiTid, showToast, startEpisodeNumber])

  const applySelected = useCallback(async () => {
    if (!selected) return
    setApplyLoading(true)
    setError(null)
    try {
      const season = await applySyoboiTitle(seasonId, selected)
      onSeasonSynced?.(seasonId, season)
      onTitleChange(season.season_title)
      showToast('しょぼいカレンダーから情報を反映しました', 'success')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '情報の反映に失敗しました'
      setError(message)
      showToast(message, 'error')
    } finally {
      setApplyLoading(false)
    }
  }, [onSeasonSynced, onTitleChange, seasonId, selected, showToast])

  const appendSelected = useCallback(async () => {
    if (!selected) return
    setAppendLoading(true)
    setError(null)
    try {
      const season = await appendSyoboiTitle(seasonId, selected)
      onSeasonSynced?.(seasonId, season)
      onTitleChange(season.season_title)
      showToast('追記しました', 'success')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '追記に失敗しました'
      setError(message)
      showToast(message, 'error')
    } finally {
      setAppendLoading(false)
    }
  }, [onSeasonSynced, onTitleChange, seasonId, selected, showToast])

  return {
    query,
    setQuery,
    results,
    selected,
    setSelected,
    loading,
    error,
    searched,
    applyLoading,
    appendLoading,
    episodeLoading,
    episodeProgress,
    startEpisodeNumber,
    setStartEpisodeNumber,
    search,
    applyEpisodeSchedule,
    applySelected,
    appendSelected
  }
}
