import type { Episode, Season, Series } from '../types'
import type { Route } from './+types/episode'
import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import VideoPlayer from '~/components/player/VideoPlayer'
import { getApiBaseUrl } from '../lib/config'
import { EpisodeTimestamp, EpisodeList, SeasonTabs } from '../components/lists/Episode'
import { MdDownload, MdShare } from 'react-icons/md'
import { useToast } from '../components/providers/ToastProvider'
import { ShareDialog } from '../components/dialogs/ShareDialog'
import { useEpisodeDownloader } from '../hooks/useEpisodeDownloader'
import { useEpisodeNavigation } from '../hooks/useEpisodeNavigation'
import { useEpisodeShare } from '../hooks/useEpisodeShare'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function clientLoader({ params }: Route.LoaderArgs) {
  const episodeId = params.episodeId
  try {
    const baseUrl = await getApiBaseUrl()
    const [episodeData, seasonData] = await Promise.all([
      fetchJson<Episode>(`${baseUrl}/v1/episode/${episodeId}`),
      fetchJson<Season>(`${baseUrl}/v1/season/${episodeId.slice(0, episodeId.lastIndexOf('_'))}`)
    ])
    const seriesData = await fetchJson<Series>(`${baseUrl}/v1/series/${seasonData.series_id}`)
    return { seasonData, episodeData, seriesData }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function Breadcrumbs({ seriesData, seasonData }: { seriesData: Series; seasonData: Season }) {
  return (
    <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mt-2 w-full max-w-10/12 px-3 gap-2'>
      <nav className='flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-card/70 border border-border rounded-full px-3 py-1.5'>
        <Link
          to={`/series/${seasonData.series_id}`}
          className='hover:text-primary transition-colors'
        >
          {seriesData.title}
        </Link>
        <span className='text-muted-foreground'>/</span>
        <Link
          to={`/series/${seasonData.series_id}?season=${seasonData.season_id}`}
          className='hover:text-primary transition-colors'
        >
          {seasonData.season_title}
        </Link>
      </nav>
    </div>
  )
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

  // Keep the currently-displayed data in state so we can update in-place
  const [currentSeriesData, setCurrentSeriesData] = useState(seriesData)
  const [currentSeasonData, setCurrentSeasonData] = useState(seasonData)
  const [currentEpisodeData, setCurrentEpisodeData] = useState(episodeData)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(min-width: 1024px) and (orientation: landscape)')
    const apply = () => {
      document.body.style.overflow = media.matches ? 'hidden' : ''
    }
    apply()
    if (media.addEventListener) {
      media.addEventListener('change', apply)
      return () => {
        media.removeEventListener('change', apply)
        document.body.style.overflow = ''
      }
    }
    media.addListener(apply)
    return () => {
      media.removeListener(apply)
      document.body.style.overflow = ''
    }
  }, [])

  // --- クエリパラメータt= をパースして初期シーク位置を渡す ---
  const location = useLocation()
  const [initialSeek, setInitialSeek] = useState<number | null>(null)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('t')
    if (!t) {
      setInitialSeek(null)
      return
    }
    let seconds = 0
    const match = t.match(/^(?:(\d+)m)?(\d+)?s?$/)
    if (match) {
      const min = match[1] ? parseInt(match[1], 10) : 0
      const sec = match[2] ? parseInt(match[2], 10) : 0
      seconds = min * 60 + sec
    } else if (!isNaN(Number(t))) {
      seconds = Number(t)
    }
    setInitialSeek(seconds)
  }, [location.search, currentEpisodeData.episode_id])

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(currentSeasonData.season_id)
  const [episodeList, setEpisodeList] = useState<Episode[]>(currentSeasonData.episodes || [])
  const [seasonList, setSeasonList] = useState<Season[]>(currentSeriesData.seasons || [])
  const { autoPlay, startFullscreen, loadEpisodeInPlace, handleVideoEnded } = useEpisodeNavigation({
    currentEpisodeId: currentEpisodeData.episode_id,
    episodeList,
    seasonList,
    selectedSeasonId,
    setCurrentEpisode: setCurrentEpisodeData,
    setCurrentSeason: setCurrentSeasonData,
    setCurrentSeries: setCurrentSeriesData,
    setSelectedSeasonId,
    setEpisodeList,
    setSeasonList
  })
  const { progress, download, error } = useEpisodeDownloader(currentEpisodeData)
  const pageTitle = `${currentEpisodeData.title} | animatrix`
  const { showToast } = useToast()

  // --- 共有リンクダイアログ用state ---
  const {
    open: shareOpen,
    setOpen: setShareOpen,
    includeTime: shareIncludeTime,
    setIncludeTime: setShareIncludeTime,
    url: shareUrl,
    handleTimeUpdate
  } = useEpisodeShare(currentEpisodeData.episode_id)
  return (
    <main className='flex flex-col items-center pt-2 pb-4 min-h-screen bg-background text-foreground'>
      <title>{pageTitle}</title>
      <Breadcrumbs seriesData={seriesData} seasonData={seasonData} />
      <div className='flex flex-col tablet-landscape:flex-row lg:flex-row tablet-portrait:flex-col! w-full max-w-none px-0 sm:max-w-10/12 sm:px-2 gap-4 mt-4'>
        <div className='flex flex-col min-w-0 space-y-2 flex-1'>
          <div className='flex flex-col w-full'>
            <div className='flex flex-col items-center sm:flex-row sm:items-center sm:justify-between w-full'>
              <div className='flex items-center justify-center text-xl sm:text-2xl font-bold mt-0.5 mb-2 text-center sm:text-left w-full sm:w-auto'>
                {currentEpisodeData.title}
              </div>
              <div className='flex-col items-end gap-1 ml-4 hidden xl:flex'>
                <div className='flex items-center gap-2'>
                  <button
                    onClick={download}
                    disabled={progress !== null}
                    className='flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold cursor-pointer'
                    style={{ pointerEvents: progress !== null ? 'none' : 'auto' }}
                    title='ダウンロード'
                  >
                    <MdDownload size={18} />
                  </button>
                  <button
                    className='flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold cursor-pointer'
                    onClick={() => setShareOpen(true)}
                    title='共有'
                  >
                    <MdShare size={18} />
                  </button>
                  <span className='w-2' />
                  <EpisodeTimestamp timestamp={currentEpisodeData.timestamp} />
                </div>
                {progress !== null && (
                  <div className='w-44 flex flex-col justify-center'>
                    <div className='bg-muted rounded-full h-2.5'>
                      <div
                        className='bg-blue-600 h-2.5 rounded-full transition-all'
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className='text-center text-xs mt-0.5'>{progress}%</div>
                  </div>
                )}
                {error && <div className='text-red-500'>{error}</div>}
              </div>
            </div>
          </div>
          {currentEpisodeData.video_url && (
            <div className='w-full'>
              <VideoPlayer
                url={currentEpisodeData.video_url}
                title={currentEpisodeData.title}
                season={currentSeasonData.season_title}
                onEnded={handleVideoEnded}
                autoPlay={autoPlay}
                startFullscreen={startFullscreen}
                initialSeek={initialSeek ?? undefined}
                onTimeUpdate={handleTimeUpdate}
              />
            </div>
          )}
        </div>
        <div className='flex flex-col min-w-0 w-full max-w-none tablet-landscape:max-w-md lg:max-w-md tablet-landscape:w-2/3 lg:w-2/3 tablet-portrait:w-full! tablet-portrait:max-w-none!'>
          <SeasonTabs
            seasonList={seasonList}
            selectedSeasonId={selectedSeasonId}
            setSelectedSeasonId={setSelectedSeasonId}
          />
          <EpisodeList
            episodeList={episodeList}
            episodeData={currentEpisodeData}
            onSelect={id =>
              loadEpisodeInPlace(id, {
                keepFullscreen: !!document.fullscreenElement,
                autoPlay: true
              })
            }
          />
        </div>
      </div>
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        url={shareUrl}
        onCopy={() => showToast('リンクをコピーしました', 'success')}
        includeTime={shareIncludeTime}
        setIncludeTime={setShareIncludeTime}
      />
    </main>
  )
}
