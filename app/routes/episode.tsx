import type { Episode, Season, Series } from '../types'
import type { Route } from './+types/episode'
import { useState, useCallback, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import VideoPlayer from '~/components/player/VideoPlayer'
import { getApiBaseUrl } from '../lib/config'
import { EpisodeTimestamp, EpisodeList, SeasonTabs } from '~/components/Episode'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
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

type DownloaderResult = {
  progress: number | null
  download: () => Promise<void>
  downloadUrl: string | null
  error: string | null
}

function useEpisodeDownloader(videoUrl: string): DownloaderResult {
  const [progress, setProgress] = useState<number | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async () => {
    setProgress(0)
    setError(null)
    setDownloadUrl(null)
    try {
      const res = await fetch(videoUrl, { credentials: 'include' })
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
  }, [videoUrl])

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [downloadUrl])

  return { progress, download, downloadUrl, error }
}

function Breadcrumbs({ seriesData, seasonData }: { seriesData: Series; seasonData: Season }) {
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 w-full max-w-10/12 px-3 gap-2'>
      <nav className='flex items-center gap-2 text-xs sm:text-sm text-gray-400'>
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
    </div>
  )
}

function DownloadSection({
  episodeData,
  seriesData,
  progress,
  download,
  downloadUrl,
  error
}: {
  episodeData: Episode
  seriesData: Series
  progress: number | null
  download: () => Promise<void>
  downloadUrl: string | null
  error: string | null
}) {
  return (
    <div className='flex flex-col sm:flex-row items-start mt-2 gap-4'>
      <button
        onClick={download}
        disabled={progress !== null}
        className='ml-0 cursor-pointer transition-colors bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow'
        style={{ pointerEvents: progress !== null ? 'none' : 'auto' }}
      >
        Download Video
      </button>
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
  )
}

function getNextEpisode(
  episodeList: Episode[],
  seasonList: Season[],
  episodeData: Episode,
  selectedSeasonId: string
): Episode | null {
  if (!episodeList || episodeList.length === 0) return null
  const idx = episodeList.findIndex(ep => ep.episode_id === episodeData.episode_id)
  if (idx >= 0 && idx < episodeList.length - 1) {
    return episodeList[idx + 1]
  }
  const currentSeasonIdx = seasonList.findIndex(s => s.season_id === selectedSeasonId)
  if (currentSeasonIdx >= 0 && currentSeasonIdx < seasonList.length - 1) {
    const nextSeason = seasonList[currentSeasonIdx + 1]
    if (nextSeason.episodes && nextSeason.episodes.length > 0) {
      return nextSeason.episodes[0]
    }
  }
  return null
}

type LoaderData =
  | { seasonData: Season; episodeData: Episode; seriesData: Series }
  | { error: string }

export default function Episode({ loaderData }: { loaderData: LoaderData }) {
  if ('error' in loaderData) {
    return (
      <main className='pt-16 p-4 container mx-auto'>
        <h1>Error</h1>
        <p>{loaderData.error}</p>
      </main>
    )
  }

  const { seriesData, seasonData, episodeData } = loaderData
  const navigate = useNavigate()
  useEffect(() => {
    document.title = `${episodeData.title} | animatrix`
  }, [episodeData.title])

  const seasonList = seriesData.seasons || []
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasonData.season_id)
  const selectedSeason = useMemo(
    () => seasonList.find(s => s.season_id === selectedSeasonId),
    [seasonList, selectedSeasonId]
  )
  const episodeList = selectedSeason?.episodes || []
  const { progress, download, downloadUrl, error } = useEpisodeDownloader(episodeData.video_url)

  const nextEpisode = useMemo(
    () => getNextEpisode(episodeList, seasonList, episodeData, selectedSeasonId),
    [episodeList, seasonList, episodeData, selectedSeasonId]
  )

  return (
    <main className='flex flex-col items-center pt-2 pb-4 min-h-screen bg-black'>
      <Breadcrumbs seriesData={seriesData} seasonData={seasonData} />
      <div className='flex flex-col lg:flex-row w-full max-w-10/12 px-2 gap-4 mt-4'>
        <div className='flex flex-col min-w-0 space-y-2 tablet-portrait:w-full flex-1 tablet-portrait:flex-none'>
          <div className='flex items-center text-sm font-semibold mt-0.5'>
            {seriesData.title} <span className='mx-1'>|</span> {seasonData.season_title}
          </div>
          <div className='flex flex-col w-full'>
            <div className='flex items-center justify-between w-full'>
              <div className='flex items-center text-xl sm:text-2xl font-bold mt-0.5 mb-2'>
                {episodeData.title}
              </div>
              <div className='ml-4 hidden xl:block'>
                <EpisodeTimestamp timestamp={episodeData.timestamp} />
              </div>
            </div>
          </div>
          {episodeData.video_url && (
            <div className='tablet-portrait:w-full'>
              <VideoPlayer
                videoKey={episodeData.episode_id}
                url={episodeData.video_url}
                autoPlay={true}
                onEnded={() => {
                  if (nextEpisode) {
                    const idx = episodeList.findIndex(
                      ep => ep.episode_id === episodeData.episode_id
                    )
                    if (idx >= 0 && idx < episodeList.length - 1) {
                      navigate(`/episode/${nextEpisode.episode_id}`)
                    } else {
                      const currentSeasonIdx = seasonList.findIndex(
                        s => s.season_id === selectedSeasonId
                      )
                      if (currentSeasonIdx >= 0 && currentSeasonIdx < seasonList.length - 1) {
                        setSelectedSeasonId(seasonList[currentSeasonIdx + 1].season_id)
                      }
                      navigate(`/episode/${nextEpisode.episode_id}`)
                    }
                  }
                }}
              />
            </div>
          )}
          <DownloadSection
            episodeData={episodeData}
            seriesData={seriesData}
            progress={progress}
            download={download}
            downloadUrl={downloadUrl}
            error={error}
          />
        </div>
        <div className='flex flex-col min-w-0 max-w-md md:w-2/3 w-full'>
          <SeasonTabs
            seasonList={seasonList}
            selectedSeasonId={selectedSeasonId}
            setSelectedSeasonId={setSelectedSeasonId}
          />
          <EpisodeList episodeList={episodeList} episodeData={episodeData} />
        </div>
      </div>
    </main>
  )
}
