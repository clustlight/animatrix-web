import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Input } from '../components/ui/input'
import { getApiBaseUrl } from '../lib/config'
import type { Episode, Series } from '../types'
import type { Route } from './+types/home'

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

export function meta({}: Route.MetaArgs) {
  return [{ title: 'animatrix-web' }, { name: 'description', content: 'ABM archive-player web' }]
}

// Carousel for latest episodes
function EpisodeCarousel({
  episodes,
  seriesMap,
  scrollCarousel,
  carouselRef
}: {
  episodes: Episode[]
  seriesMap: Record<string, Series>
  scrollCarousel: (dir: 'left' | 'right') => void
  carouselRef: React.RefObject<HTMLDivElement | null>
}) {
  // Only show the latest episode for each series
  const seriesLatestEpisodes: { episode: Episode; series: Series }[] = []
  const seenSeries = new Set<string>()
  for (const ep of episodes) {
    const seriesId = ep.episode_id.split('_')[0]
    if (!seenSeries.has(seriesId) && seriesMap[seriesId]) {
      seriesLatestEpisodes.push({ episode: ep, series: seriesMap[seriesId] })
      seenSeries.add(seriesId)
    }
  }

  return (
    <section className='mt-8'>
      <div className='flex items-center mb-3'>
        <h2 className='text-lg font-bold mr-4'>Latest Episodes</h2>
        <button
          type='button'
          className='p-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors mr-2'
          onClick={() => scrollCarousel('left')}
          aria-label='Scroll left'
        >
          <svg width={24} height={24} fill='none' viewBox='0 0 24 24'>
            <path
              d='M15 6l-6 6 6 6'
              stroke='#fff'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>
        <button
          type='button'
          className='p-1 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors'
          onClick={() => scrollCarousel('right')}
          aria-label='Scroll right'
        >
          <svg width={24} height={24} fill='none' viewBox='0 0 24 24'>
            <path
              d='M9 6l6 6-6 6'
              stroke='#fff'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>
      </div>
      <div
        ref={carouselRef}
        className='flex gap-6 overflow-x-auto scrollbar-hide px-1'
        style={{ scrollBehavior: 'smooth' }}
      >
        {seriesLatestEpisodes.map(({ series }) => (
          <Link
            key={series.series_id}
            to={`/series/${series.series_id}`}
            className='flex flex-col items-center min-w-[140px] max-w-[140px]'
            title={series.title}
          >
            <img
              src={series.portrait_url}
              alt={series.title}
              className='w-32 h-44 object-cover rounded shadow mb-2'
            />
            <span className='text-xs text-gray-200 text-center line-clamp-2'>{series.title}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useState('')
  const [recentEpisodes, setRecentEpisodes] = useState<Episode[]>([])
  const [seriesMap, setSeriesMap] = useState<Record<string, Series>>({})
  const carouselRef = useRef<HTMLDivElement>(null)

  // Handle Enter key in the search box
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchParams.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchParams.trim())}`)
    }
  }

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

  // Scroll the carousel left or right
  const scrollCarousel = useCallback((dir: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = 180
      carouselRef.current.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }, [])

  return (
    <main className='flex items-center justify-center pt-16 pb-4'>
      <div className='flex-1 flex flex-col items-center gap-16 min-h-0'>
        <header className='flex flex-col items-center gap-9'>
          <h1 className='text-2xl font-bold'>animatrix-web</h1>
        </header>
        <div className='max-w-[1200px] w-full space-y-6 px-4'>
          <Input
            type='text'
            placeholder='Search by series or episode name'
            value={searchParams}
            onChange={e => setSearchParams(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <EpisodeCarousel
          episodes={recentEpisodes}
          seriesMap={seriesMap}
          scrollCarousel={scrollCarousel}
          carouselRef={carouselRef}
        />
      </div>
    </main>
  )
}
