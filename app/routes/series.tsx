import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link, useSearchParams } from 'react-router'
import type { Episode, Season, Series } from '../types'
import type { Route } from './+types/series'
import 'dayjs/locale/ja'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { getApiBaseUrl } from '../lib/config'

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

type SeasonTabsProps = {
  seasons: Season[]
  activeSeason: number
  onTabClick: (idx: number, seasonId: string) => void
  tabListRef: RefObject<HTMLDivElement | null>
  scrollTabs: (dir: 'left' | 'right') => void
}

function SeasonTabs({
  seasons,
  activeSeason,
  onTabClick,
  tabListRef,
  scrollTabs
}: SeasonTabsProps) {
  return (
    <div className='relative mb-6'>
      {seasons.length > 3 && (
        <button
          type='button'
          className='absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow transition-colors'
          onClick={() => scrollTabs('left')}
          aria-label='scroll left'
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
      )}
      <div
        ref={tabListRef}
        className='flex gap-2 border-b overflow-x-auto scrollbar-hide px-8'
        style={{ scrollBehavior: 'smooth' }}
      >
        {seasons.map((season, idx) => {
          let fontSizeClass = 'text-lg'
          if (season.season_title.length > 16) fontSizeClass = 'text-sm'
          else if (season.season_title.length > 10) fontSizeClass = 'text-base'
          return (
            <button
              key={season.season_id}
              className={`px-4 py-2 font-semibold border-b-2 max-w-[8rem] break-words text-center whitespace-pre-line ${fontSizeClass} ${
                idx === activeSeason
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500'
              }`}
              onClick={() => onTabClick(idx, season.season_id)}
              title={season.season_title}
            >
              {season.season_title}
            </button>
          )
        })}
      </div>
      {seasons.length > 3 && (
        <button
          type='button'
          className='absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow transition-colors'
          onClick={() => scrollTabs('right')}
          aria-label='scroll right'
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
      )}
    </div>
  )
}

type EpisodeListProps = {
  episodes: Episode[]
}

function EpisodeList({ episodes }: EpisodeListProps) {
  const [imgErrorMap, setImgErrorMap] = useState<{ [id: string]: boolean }>({})

  if (!episodes || episodes.length === 0) {
    return <div className='text-center text-gray-400'>No episodes available</div>
  }

  const handleImgError = (id: string) => {
    setImgErrorMap(prev => ({ ...prev, [id]: true }))
  }

  return (
    <>
      {episodes.map(ep => (
        <Link
          key={ep.episode_id}
          to={`/episode/${ep.episode_id}`}
          className='flex items-center bg-gray-900 hover:bg-gray-800 rounded-lg shadow px-3 py-3 transition-colors'
          style={{ maxWidth: '100%' }}
        >
          <div className='relative w-40 h-24 mr-5 flex-shrink-0'>
            {imgErrorMap[ep.episode_id] || !ep.thumbnail_url ? (
              <div className='w-40 h-24 bg-gray-700 flex items-center justify-center rounded'>
                <span className='text-gray-400 text-xs'>No Image</span>
              </div>
            ) : (
              <img
                src={ep.thumbnail_url}
                alt={ep.title}
                className='w-40 h-24 object-cover rounded'
                onError={() => handleImgError(ep.episode_id)}
              />
            )}
            <span className='absolute bottom-1 right-1 bg-gray-700 bg text-xs text-white px-2 py-0.5 rounded'>
              {ep.duration_string}
            </span>
          </div>
          <div className='flex flex-col min-w-0'>
            <div className='text-base font-medium text-gray-100 break-words'>{ep.title}</div>
            <div className='text-sm text-gray-400 mt-1 break-words'>
              {`${dayjs(ep.timestamp).format('YYYY/MM/DD HH:mm:ss (zzz)').replace('Japan Standard Time', 'JST')} (${dayjs(ep.timestamp).fromNow()})`}
            </div>
          </div>
        </Link>
      ))}
    </>
  )
}

function PortraitImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false)
  if (!src || src === '' || error) {
    return (
      <div className='w-36 h-52 bg-gray-700 flex items-center justify-center rounded shadow'>
        <span className='text-gray-400 text-xs'>No Image</span>
      </div>
    )
  }
  return (
    <img
      src={src}
      alt={alt}
      className='w-36 h-52 object-cover rounded shadow'
      onError={() => setError(true)}
    />
  )
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

  const initialSeasonIndex = seasonParam ? seasons.findIndex(s => s.season_id === seasonParam) : 0
  const [activeSeason, setActiveSeason] = useState(initialSeasonIndex >= 0 ? initialSeasonIndex : 0)

  useEffect(() => {
    if (seasonParam) {
      const idx = seasons.findIndex(s => s.season_id === seasonParam)
      if (idx !== -1 && idx !== activeSeason) {
        setActiveSeason(idx)
      }
    }
  }, [seasonParam, seasons, activeSeason])

  const handleTabClick = (idx: number, seasonId: string) => {
    setActiveSeason(idx)
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev)
      newParams.set('season', seasonId)
      return newParams
    })
  }

  const scrollTabs = (dir: 'left' | 'right') => {
    if (tabListRef.current) {
      const scrollAmount = 120
      tabListRef.current.scrollBy({
        left: dir === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  useEffect(() => {
    document.title = `${data.title} | animatrix`
  }, [data.title])

  return (
    <main className='flex items-center justify-center pt-4 pb-4'>
      <div className='flex-1 flex flex-col items-center gap-8 min-h-0'>
        <div className='flex items-center gap-12'>
          <div className='w-36 h-52 relative flex-shrink-0'>
            <PortraitImage src={data.portrait_url} alt={data.title} />
          </div>
          <div>
            <h1 className='text-2xl font-bold'>{data.title}</h1>
            {/* シーズン数・全話数 */}
            <div className='text-gray-400 text-sm mt-1'>
              {`シーズン数: ${seasons.length}　全${seasons.reduce((acc, s) => acc + (s.episodes?.length ?? 0), 0)}話`}
            </div>
          </div>
        </div>
        <div className='w-full max-w-2xl px-2'>
          <SeasonTabs
            seasons={seasons}
            activeSeason={activeSeason}
            onTabClick={handleTabClick}
            tabListRef={tabListRef}
            scrollTabs={scrollTabs}
          />
          <div className='flex flex-col gap-4'>
            <EpisodeList episodes={seasons[activeSeason]?.episodes ?? []} />
          </div>
        </div>
      </div>
    </main>
  )
}
