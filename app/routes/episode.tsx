import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import type { Episode, Season, Series } from '../types'
import type { Route } from './+types/episode'
import 'dayjs/locale/en'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import VideoPlayer from '~/components/player/VideoPlayer'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { getApiBaseUrl } from '../lib/config'

dayjs.extend(relativeTime)
dayjs.locale('ja')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function clientLoader({ params }: Route.LoaderArgs) {
  const episodeId = params.episodeId
  try {
    const baseUrl = await getApiBaseUrl()
    const [episodeData, seasonData, seriesData] = await Promise.all([
      fetchJson<Episode>(`${baseUrl}/v1/episode/${episodeId}`),
      fetchJson<Season>(`${baseUrl}/v1/season/${episodeId.slice(0, episodeId.lastIndexOf('_'))}`),
      fetchJson<Series>(`${baseUrl}/v1/series/${episodeId.slice(0, episodeId.indexOf('_'))}`)
    ])
    return { seasonData, episodeData, seriesData }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function useEpisodeDownloader(episodeData: Episode) {
  const [progress, setProgress] = useState<number | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setProgress(0)
    setError(null)
    setDownloadUrl(null)
    try {
      const res = await fetch(episodeData.video_url, {
        credentials: 'include'
      })
      if (!res.body) throw new Error('Streaming is not supported')
      const contentLength = Number(res.headers.get('Content-Length'))
      const reader = res.body.getReader()
      let receivedLength = 0
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          receivedLength += value.length
          if (contentLength) setProgress(Math.round((receivedLength / contentLength) * 100))
        }
      }
      const blob = new Blob(chunks)
      const url = URL.createObjectURL(blob)
      setDownloadUrl(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setProgress(null)
    }
  }

  // Cleanup
  React.useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  return { progress, download, downloadUrl, error }
}

function Breadcrumbs({
  seriesData,
  seasonData,
  episodeData
}: {
  seriesData: Series
  seasonData: Season
  episodeData: Episode
}) {
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 w-full max-w-10/12 px-3 gap-2'>
      <nav className='flex items-center text-sm text-gray-400 gap-2'>
        <Link to={`/series/${seriesData.series_id}`} className='hover:underline text-blue-500'>
          {seriesData.title}
        </Link>
        <span>&gt;</span>
        <Link
          to={`/series/${seriesData.series_id}?season=${seasonData.season_id}`}
          className='hover:underline text-blue-500'
        >
          {seasonData.season_title}
        </Link>
      </nav>
      <div className='text-xs sm:text-sm font-semibold text-white whitespace-nowrap'>
        {`${dayjs(episodeData.timestamp).format('YYYY/MM/DD HH:mm:ss (zzz)').replace('Japan Standard Time', 'JST')} (${dayjs(episodeData.timestamp).fromNow()})`}
      </div>
    </div>
  )
}

function SeasonTabs({
  seasonList,
  selectedSeasonId,
  setSelectedSeasonId
}: {
  seasonList: Season[]
  selectedSeasonId: string
  setSelectedSeasonId: (id: string) => void
}) {
  return (
    <div className='flex gap-0 mb-1 flex-wrap'>
      {seasonList.map(season => (
        <button
          key={season.season_id}
          className={`px-2 py-2 rounded-t ${
            selectedSeasonId === season.season_id
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-gray-700 text-gray-200'
          }`}
          onClick={() => setSelectedSeasonId(season.season_id)}
        >
          {season.season_title}
        </button>
      ))}
    </div>
  )
}

function EpisodeList({
  episodeList,
  episodeData
}: {
  episodeList: Episode[]
  episodeData: Episode
}) {
  return (
    <div className='overflow-y-auto' style={{ maxHeight: '70vh' }}>
      {episodeList.map(ep => (
        <Link
          to={`/episode/${ep.episode_id}`}
          key={ep.episode_id}
          className={`flex items-center gap-2 p-2 rounded hover:bg-blue-900 transition ${
            ep.episode_id === episodeData.episode_id ? 'bg-blue-800' : ''
          }`}
        >
          <img
            src={ep.thumbnail_url || '/no-thumbnail.png'}
            alt={ep.title}
            // Make the thumbnail larger and keep 16:9 aspect ratio
            className='w-36 h-20 object-cover rounded' // 144x80px (16:9)
            style={{ aspectRatio: '16/9' }}
          />
          <div className='text-base font-semibold text-white truncate'>{ep.title}</div>
        </Link>
      ))}
    </div>
  )
}

// Additional: iPad Pro portrait detection hook
function useIsIpadProPortrait() {
  const [isPortrait, setIsPortrait] = React.useState(false)
  React.useEffect(() => {
    function check() {
      // Portrait mode for iPad Pro 11/12.9 inch
      const match = window.matchMedia(
        '(min-width: 768px) and (max-width: 1024px) and (orientation: portrait)'
      )
      setIsPortrait(match.matches)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isPortrait
}

export default function Episode({
  loaderData
}: {
  loaderData: { seasonData: Season; episodeData: Episode; seriesData: Series } | { error: string }
}) {
  if ('error' in loaderData) {
    return (
      <main className='pt-16 p-4 container mx-auto'>
        <h1>Error</h1>
        <p>{loaderData.error}</p>
      </main>
    )
  }

  const [searchParams, setSearchParams] = React.useState('')
  const navigate = useNavigate()
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchParams.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchParams.trim())}`)
    }
  }

  const { seriesData, seasonData, episodeData } = loaderData as {
    seriesData: Series
    seasonData: Season
    episodeData: Episode
  }

  // Set page title to "title | animatrix-web"
  React.useEffect(() => {
    document.title = `${episodeData.title} | animatrix-web`
  }, [episodeData.title])

  const seasonList: Season[] = seriesData.seasons || []
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string>(seasonData.season_id)
  const selectedSeason = seasonList.find(s => s.season_id === selectedSeasonId)
  const episodeList: Episode[] = selectedSeason?.episodes || []
  const { progress, download, downloadUrl, error } = useEpisodeDownloader(episodeData)

  const isIpadProPortrait = useIsIpadProPortrait()

  return (
    <main className='flex flex-col items-center pt-8 pb-4 min-h-screen bg-black'>
      {/* Search bar */}
      <div className='w-full max-w-xl mx-auto mt-2 mb-2 px-2'>
        <Input
          type='text'
          placeholder='Search by series or episode name'
          value={searchParams}
          onChange={e => setSearchParams(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Breadcrumbs + broadcast date */}
      <Breadcrumbs seriesData={seriesData} seasonData={seasonData} episodeData={episodeData} />

      {/* Layout switch */}
      {isIpadProPortrait ? (
        // Layout for iPad Pro portrait mode
        <div className='w-full max-w-2xl px-2 flex flex-col gap-7 mt-4 flex-1'>
          {/* Video and title */}
          <div className='flex flex-col flex-1 min-w-0 space-y-2'>
            <div className='flex items-center text-sm font-semibold mt-0.5'>
              {seriesData.title} <span className='mx-1'>|</span> {seasonData.season_title}
            </div>
            <div className='flex items-center text-2xl font-bold mt-0.5'>{episodeData.title}</div>
            <div className='mt-3 ipadpro-portrait-player'>
              {episodeData.video_url && <VideoPlayer url={episodeData.video_url} />}
            </div>
            {/* ...ダウンロードボタン等... */}
            <div className='flex flex-col sm:flex-row items-start mt-4 gap-4'>
              <Button
                onClick={download}
                disabled={progress !== null}
                className='ml-0 cursor-pointer transition-colors bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow'
                style={{ pointerEvents: progress !== null ? 'none' : 'auto' }}
              >
                Download Video
              </Button>
              <div className='flex flex-col items-start gap-1 min-w-[180px] self-center'>
                {progress !== null && (
                  <div className='w-44 flex flex-col justify-center mt-2'>
                    <div className='bg-gray-200 rounded-full h-2.5'>
                      <div
                        className='bg-blue-600 h-2.5 rounded-full transition-all'
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className='text-center text-xs mt-0.5'>{progress}%</div>
                  </div>
                )}
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={`${episodeData.episode_id}__${seriesData.title}__${episodeData.title}.mp4`}
                    className='px-3 py-1 rounded font-semibold bg-blue-600 text-white shadow hover:bg-blue-700 hover:text-white transition-colors cursor-pointer border border-blue-700'
                    style={{ textDecoration: 'none' }}
                  >
                    Download Link (Click to save)
                  </a>
                )}
                {error && <div className='text-red-500'>{error}</div>}
              </div>
            </div>
          </div>
          {/* Episode list */}
          <div className='flex flex-col min-w-0 w-full mt-3'>
            <SeasonTabs
              seasonList={seasonList}
              selectedSeasonId={selectedSeasonId}
              setSelectedSeasonId={setSelectedSeasonId}
            />
            <EpisodeList episodeList={episodeList} episodeData={episodeData} />
          </div>
        </div>
      ) : (
        // Desktop / landscape layout (default)
        <div
          className='
            flex flex-col lg:flex-row w-full max-w-10/12 px-2 gap-7 mt-4 flex-1
            tablet-portrait:flex-col tablet-portrait:max-w-2xl
            tablet-portrait:gap-3 tablet-portrait:mt-2
          '
        >
          {/* Video and title */}
          <div
            className='
              flex flex-col min-w-0 space-y-2
              tablet-portrait:w-full
              flex-1 tablet-portrait:flex-none
            '
          >
            <div className='flex items-center text-sm font-semibold mt-0.5'>
              {seriesData.title} <span className='mx-1'>|</span> {seasonData.season_title}
            </div>
            <div className='flex items-center text-2xl font-bold mt-0.5'>{episodeData.title}</div>
            <div className='mt-3 tablet-portrait:mt-1'>
              {episodeData.video_url && (
                <div className='tablet-portrait:w-full'>
                  <VideoPlayer url={episodeData.video_url} />
                </div>
              )}
            </div>
            <div className='flex flex-col sm:flex-row items-start mt-4 gap-4'>
              <Button
                onClick={download}
                disabled={progress !== null}
                className='ml-0 cursor-pointer transition-colors bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow'
                style={{ pointerEvents: progress !== null ? 'none' : 'auto' }}
              >
                Download Video
              </Button>
              <div className='flex flex-col items-start gap-1 min-w-[180px] self-center'>
                {progress !== null && (
                  <div className='w-44 flex flex-col justify-center mt-2'>
                    <div className='bg-gray-200 rounded-full h-2.5'>
                      <div
                        className='bg-blue-600 h-2.5 rounded-full transition-all'
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className='text-center text-xs mt-0.5'>{progress}%</div>
                  </div>
                )}
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download={`${episodeData.episode_id}__${seriesData.title}__${episodeData.title}.mp4`}
                    className='px-3 py-1 rounded font-semibold bg-blue-600 text-white shadow hover:bg-blue-700 hover:text-white transition-colors cursor-pointer border border-blue-700'
                    style={{ textDecoration: 'none' }}
                  >
                    Download Link (Click to save)
                  </a>
                )}
                {error && <div className='text-red-500'>{error}</div>}
              </div>
            </div>
          </div>

          {/* Right: season tabs + episode list */}
          <div
            className='
              flex flex-col min-w-0 max-w-md w-full mt-3
              tablet-portrait:max-w-full tablet-portrait:w-full tablet-portrait:mt-2
            '
          >
            <SeasonTabs
              seasonList={seasonList}
              selectedSeasonId={selectedSeasonId}
              setSelectedSeasonId={setSelectedSeasonId}
            />
            <EpisodeList episodeList={episodeList} episodeData={episodeData} />
          </div>
        </div>
      )}
    </main>
  )
}
