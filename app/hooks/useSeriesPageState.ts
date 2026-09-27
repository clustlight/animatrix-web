import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { Series } from '../types'

function buildPortraitUrl(inputUrl?: string) {
  if (!inputUrl) return inputUrl ?? ''
  if (inputUrl.includes('%2F')) return inputUrl.replace(/%2F[^%/]+$/, '%2Fportrait.png')
  return inputUrl.replace(/\/[^/]+$/, '/portrait.png')
}

export function useSeriesPageState(series: Series) {
  const [seasons, setSeasons] = useState(series.seasons ?? [])
  const [searchParams, setSearchParams] = useSearchParams()
  const seasonParam = searchParams.get('season')
  const initialSeasonIndex = useMemo(
    () => (seasonParam ? seasons.findIndex(season => season.season_id === seasonParam) : 0),
    [seasonParam, seasons]
  )
  const [activeSeason, setActiveSeason] = useState(initialSeasonIndex >= 0 ? initialSeasonIndex : 0)
  const [moveModalOpen, setMoveModalOpen] = useState(false)
  const [moveSeasonId, setMoveSeasonId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editSeasonModalOpen, setEditSeasonModalOpen] = useState(false)
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null)
  const [editSeasonTitle, setEditSeasonTitle] = useState('')

  useEffect(() => {
    if (!seasonParam) return
    const index = seasons.findIndex(season => season.season_id === seasonParam)
    if (index !== -1) setActiveSeason(index)
  }, [seasonParam, seasons])

  const handleTabClick = useCallback(
    (_index: number, seasonId: string) => {
      setSearchParams(
        previous => {
          const next = new URLSearchParams(previous)
          next.set('season', seasonId)
          return next
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

  const activeSeasonData = seasons[activeSeason]
  const totalEpisodes = useMemo(
    () => seasons.reduce((total, season) => total + (season.episodes?.length ?? 0), 0),
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
  const activePortraitUrl = buildPortraitUrl(activeSeasonData?.thumbnail_url || series.portrait_url)

  return {
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
    setMoveSeasonId,
    deleteDialogOpen,
    setDeleteDialogOpen,
    editSeasonModalOpen,
    setEditSeasonModalOpen,
    editSeasonId,
    setEditSeasonId,
    editSeasonTitle,
    setEditSeasonTitle
  }
}
