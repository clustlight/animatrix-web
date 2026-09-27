import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Episode, Season, Series } from '../types'
import { getApiBaseUrl } from '../lib/config'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

async function fetchEpisodeContext(episodeId: string) {
  const baseUrl = await getApiBaseUrl()
  const [episode, season] = await Promise.all([
    fetchJson<Episode>(`${baseUrl}/v1/episode/${episodeId}`),
    fetchJson<Season>(`${baseUrl}/v1/season/${episodeId.slice(0, episodeId.lastIndexOf('_'))}`)
  ])
  const series = await fetchJson<Series>(`${baseUrl}/v1/series/${season.series_id}`)
  return { episode, season, series }
}

type UseEpisodeNavigationOptions = {
  currentEpisodeId: string
  episodeList: Episode[]
  seasonList: Season[]
  selectedSeasonId: string
  setCurrentEpisode: (episode: Episode) => void
  setCurrentSeason: (season: Season) => void
  setCurrentSeries: (series: Series) => void
  setSelectedSeasonId: (id: string) => void
  setEpisodeList: (episodes: Episode[]) => void
  setSeasonList: (seasons: Season[]) => void
}

export function useEpisodeNavigation({
  currentEpisodeId,
  episodeList,
  seasonList,
  selectedSeasonId,
  setCurrentEpisode,
  setCurrentSeason,
  setCurrentSeries,
  setSelectedSeasonId,
  setEpisodeList,
  setSeasonList
}: UseEpisodeNavigationOptions) {
  const navigate = useNavigate()
  const [autoPlay, setAutoPlay] = useState(false)
  const [startFullscreen, setStartFullscreen] = useState(false)
  const advancingEpisodeRef = useRef(false)

  useEffect(() => {
    if (!selectedSeasonId) return
    let cancelled = false
    void (async () => {
      try {
        const baseUrl = await getApiBaseUrl()
        const season = await fetchJson<Season>(`${baseUrl}/v1/season/${selectedSeasonId}`)
        const series = await fetchJson<Series>(`${baseUrl}/v1/series/${season.series_id}`)
        if (cancelled) return
        setEpisodeList(season.episodes || [])
        setSeasonList(series.seasons || [])
      } catch {
        if (cancelled) return
        setEpisodeList([])
        setSeasonList([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedSeasonId, setEpisodeList, setSeasonList])

  const getNextEpisode = useCallback(() => {
    if (!episodeList.length) return null
    const currentIndex = episodeList.findIndex(episode => episode.episode_id === currentEpisodeId)
    if (currentIndex < 0) return null
    if (currentIndex + 1 < episodeList.length) {
      return { episodeId: episodeList[currentIndex + 1].episode_id }
    }
    const nextSeasonIndex =
      seasonList.findIndex(season => season.season_id === selectedSeasonId) + 1
    if (nextSeasonIndex < seasonList.length) {
      const nextSeason = seasonList[nextSeasonIndex]
      const episodeId = nextSeason.episodes?.[0]?.episode_id
      if (episodeId) return { episodeId }
    }
    return null
  }, [currentEpisodeId, episodeList, seasonList, selectedSeasonId])

  const loadEpisodeInPlace = useCallback(
    async (episodeId: string, options?: { keepFullscreen?: boolean; autoPlay?: boolean }) => {
      try {
        const { episode, season, series } = await fetchEpisodeContext(episodeId)
        setCurrentEpisode(episode)
        setCurrentSeason(season)
        setCurrentSeries(series)
        setSelectedSeasonId(season.season_id)
        setEpisodeList(season.episodes || [])
        setSeasonList(series.seasons || [])

        const usr = { autoPlay: !!options?.autoPlay, keepFullscreen: !!options?.keepFullscreen }
        window.history.pushState(
          { ...window.history.state, usr },
          '',
          `/episode/${episode.episode_id}`
        )
        setAutoPlay(usr.autoPlay)
        setStartFullscreen(usr.keepFullscreen)
        document.title = `${episode.title} | animatrix`
      } catch {
        const next = getNextEpisode()
        if (next) {
          navigate(`/episode/${next.episodeId}`, {
            state: { autoPlay: true, keepFullscreen: !!options?.keepFullscreen }
          })
        }
      }
    },
    [
      getNextEpisode,
      navigate,
      setCurrentEpisode,
      setCurrentSeason,
      setCurrentSeries,
      setEpisodeList,
      setSeasonList,
      setSelectedSeasonId
    ]
  )

  const handleVideoEnded = useCallback(
    (options?: { keepFullscreen?: boolean }) => {
      if (advancingEpisodeRef.current) return
      const next = getNextEpisode()
      if (!next) return
      advancingEpisodeRef.current = true
      void loadEpisodeInPlace(next.episodeId, {
        keepFullscreen: !!options?.keepFullscreen,
        autoPlay: true
      })
    },
    [getNextEpisode, loadEpisodeInPlace]
  )

  useEffect(() => {
    advancingEpisodeRef.current = false
    const state = window.history.state?.usr
    setAutoPlay(state?.autoPlay === true)
    setStartFullscreen(state?.keepFullscreen === true)
    if (state?.autoPlay || state?.keepFullscreen) {
      window.history.replaceState(
        { ...window.history.state, usr: { ...state, autoPlay: false, keepFullscreen: false } },
        ''
      )
    }
  }, [currentEpisodeId])

  return { autoPlay, startFullscreen, loadEpisodeInPlace, handleVideoEnded }
}
