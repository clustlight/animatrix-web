import { useEffect, useState } from 'react'
import { getApiBaseUrl } from '../lib/config'
import type { Episode, Series } from '../types'
import { SeriesGrid } from '../components/lists/SeriesGrid'

// Fetch Series information by seriesId
async function fetchSeries(seriesId: string): Promise<Series | null> {
  try {
    const baseUrl = await getApiBaseUrl()
    const res = await fetch(`${baseUrl}/v1/series/${seriesId}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function getLatestSeriesList(episodes: Episode[], seriesMap: Record<string, Series>) {
  const seriesLatestEpisodes: { episode: Episode; series: Series }[] = []
  const seenSeries = new Set<string>()
  for (const ep of episodes) {
    const seriesId = ep.episode_id.split('_')[0]
    if (!seenSeries.has(seriesId) && seriesMap[seriesId]) {
      seriesLatestEpisodes.push({ episode: ep, series: seriesMap[seriesId] })
      seenSeries.add(seriesId)
    }
  }
  return seriesLatestEpisodes.map(({ series }) => series)
}

export default function Home() {
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([])
  const [seriesMap, setSeriesMap] = useState<Record<string, Series>>({})

  // Fetch the latest episodes (up to 20, sorted by timestamp descending)
  useEffect(() => {
    let ignore = false
    ;(async () => {
      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/episode`)
      const data: Episode[] = await res.json()
      const sorted = [...data].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      if (!ignore) setRecentEpisodes(sorted.slice(0, 20))
    })()
    return () => {
      ignore = true
    }
  }, [])

  // Fetch series information for each episode (fetch each series only once)
  useEffect(() => {
    const uniqueSeriesIds = Array.from(
      new Set(recentEpisodes.map(ep => ep.episode_id.split('_')[0]))
    )
    Promise.all(
      uniqueSeriesIds.map(async seriesId => {
        if (!seriesMap[seriesId]) {
          const series = await fetchSeries(seriesId)
          return { seriesId, series }
        }
        return null
      })
    ).then(results => {
      const newMap = { ...seriesMap }
      results.forEach(item => {
        if (item && item.series) {
          newMap[item.seriesId] = item.series
        }
      })
      setSeriesMap(newMap)
    })
  }, [recentEpisodes])

  const latestSeriesList = getLatestSeriesList(recentEpisodes, seriesMap)

  return (
    <main className='flex items-center justify-center pt-1 pb-4'>
      <title>animatrix</title>
      <div className='flex-1 flex flex-col items-center gap-16 min-h-0'>
        <SeriesGrid
          seriesList={latestSeriesList}
          title='Latest Episodes'
          loading={recentEpisodes.length === 0}
        />
      </div>
    </main>
  )
}
