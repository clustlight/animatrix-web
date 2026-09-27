import { useCallback, useEffect, useState } from 'react'
import type { Episode, Season } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { useToast } from '../components/providers/ToastProvider'

import {
  fetchSyoboi,
  findProgram,
  mergeDescriptions,
  titleScore,
  toNumber
} from '../lib/syoboiSeasonSync'
import type { Program, ProgramResponse, TitleResponse, TitleResult } from '../lib/syoboiSeasonSync'

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
        const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodeURIComponent(keyword)}&Limit=30`
        const data = await fetchSyoboi<TitleResponse>(url)
        const items = Object.values(data.Titles ?? {}).map(item => {
          const result: TitleResult = {
            tid: Number(item.TID),
            title: item.Title ?? '',
            titleYomi: item.TitleYomi ?? '',
            titleEn: item.TitleEN ?? '',
            firstYear: toNumber(item.FirstYear),
            firstMonth: toNumber(item.FirstMonth),
            firstEndYear: toNumber(item.FirstEndYear),
            firstEndMonth: toNumber(item.FirstEndMonth),
            firstCh: item.FirstCh ?? '',
            score: 0
          }
          return { ...result, score: titleScore(keyword, result) }
        })
        const sorted = items
          .filter(item => Number.isFinite(item.tid))
          .sort((a, b) => b.score - a.score || b.firstYear - a.firstYear)
        setResults(sorted)
        setSelected(sorted[0] ?? null)
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '検索に失敗しました'
        setError(message)
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
      const baseUrl = await getApiBaseUrl()
      let updatedCount = 0
      let missingProgramCount = 0
      let failedUpdateCount = 0
      const missingMappings: string[] = []
      const eligibleEpisodes = episodes.filter(
        episode => episode.episode_number >= startEpisodeNumber && episode.episode_number > 0
      )
      if (eligibleEpisodes.length === 0) {
        const message = '指定した開始話数以降に転写できるエピソードがありません'
        setError(message)
        showToast(message, 'error')
        return
      }
      for (const [index, episode] of eligibleEpisodes.entries()) {
        setEpisodeProgress(Math.round(((index + 1) / eligibleEpisodes.length) * 100))
        const relativeSyoboiCount = episode.episode_number - startEpisodeNumber + 1
        const syoboiCounts = [...new Set([episode.episode_number, relativeSyoboiCount])]
        let program: Program | null = null
        for (const syoboiCount of syoboiCounts) {
          const programData = await fetchSyoboi<ProgramResponse>(
            `https://cal.syoboi.jp/json.php?Req=ProgramByCount&TID=${tid}&Count=${syoboiCount}`
          )
          program = findProgram(programData, syoboiCount)
          if (program?.StTime) break
        }
        if (!program?.StTime) {
          missingProgramCount += 1
          missingMappings.push(`${episode.episode_number}→${syoboiCounts.join('/')}`)
          continue
        }
        const payload: { timestamp: string; description?: string } = {
          timestamp: new Date(Number(program.StTime) * 1000).toISOString()
        }
        const description = (program.ProgComment ?? '').trim() || (program.SubTitle ?? '').trim()
        if (description) payload.description = description
        const response = await fetch(`${baseUrl}/v1/episode/${episode.episode_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (response.ok) updatedCount += 1
        else failedUpdateCount += 1
      }
      const refreshed = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (refreshed.ok) onSeasonSynced?.(seasonId, (await refreshed.json()) as Season)
      const unavailableCountLabel = missingMappings.length
        ? `, 取得できなかった内部話数→照会Count: ${missingMappings.join(', ')}`
        : ''
      const summary = `対象${eligibleEpisodes.length}話中${updatedCount}件を転写しました（放送情報なし: ${missingProgramCount}件、更新失敗: ${failedUpdateCount}件。TID: ${tid}、内部開始話数: ${startEpisodeNumber}${unavailableCountLabel}）`
      if (updatedCount === 0) {
        setError(summary)
        showToast(summary, 'error')
      } else {
        showToast(summary, 'success')
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
      const detail = await fetchSyoboi<TitleResponse>(
        `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${selected.tid}`
      )
      const item = detail.Titles?.[String(selected.tid)]
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          season_title: selected.title,
          shoboi_tid: selected.tid,
          description: item?.Comment ?? '',
          first_year: toNumber(item?.FirstYear) || selected.firstYear,
          first_month: toNumber(item?.FirstMonth) || selected.firstMonth,
          first_end_year: toNumber(item?.FirstEndYear) || selected.firstEndYear,
          first_end_month: toNumber(item?.FirstEndMonth) || selected.firstEndMonth
        })
      })
      if (!response.ok) throw new Error('情報の反映に失敗しました')
      const updated = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (updated.ok) {
        const season = (await updated.json()) as Season
        onSeasonSynced?.(seasonId, season)
        onTitleChange(season.season_title)
      }
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
      const detail = await fetchSyoboi<TitleResponse>(
        `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${selected.tid}`
      )
      const item = detail.Titles?.[String(selected.tid)]
      const baseUrl = await getApiBaseUrl()
      const currentResponse = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (!currentResponse.ok) throw new Error('シーズン取得に失敗しました')
      const current = (await currentResponse.json()) as Season
      const payload = {
        description:
          mergeDescriptions(current.description ?? '', (item?.Comment ?? '').trim()) || undefined,
        first_end_year: toNumber(item?.FirstEndYear) || selected.firstEndYear || undefined,
        first_end_month: toNumber(item?.FirstEndMonth) || selected.firstEndMonth || undefined
      }
      const response = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('追記に失敗しました')
      const updated = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (updated.ok) {
        const season = (await updated.json()) as Season
        onSeasonSynced?.(seasonId, season)
        onTitleChange(season.season_title)
      }
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
    setQuery: (value: string) => setQuery(value),
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
