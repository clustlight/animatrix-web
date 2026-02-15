import type { Episode, Season, Series } from '../types'
import type { Route } from './+types/episode'
import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import VideoPlayer from '~/components/player/VideoPlayer'
import { getApiBaseUrl } from '../lib/config'
import { EpisodeTimestamp, EpisodeList, SeasonTabs } from '../components/lists/Episode'
import { MdDownload, MdShare } from 'react-icons/md'
import { useToast } from '../components/providers/ToastProvider'
import { ShareDialog } from '../components/dialogs/ShareDialog'

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

type DownloaderResult = {
  progress: number | null
  download: () => Promise<void>
  error: string | null
}

function useEpisodeDownloader(episodeData: Episode): DownloaderResult {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async () => {
    setProgress(0)
    setError(null)
    try {
      const res = await fetch(episodeData.video_url, { credentials: 'include' })
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
      // Merge received Uint8Array chunks into one contiguous buffer
      const merged = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        merged.set(chunk, position)
        position += chunk.length
      }
      const blob = new Blob([merged])
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `${episodeData.episode_id}__${episodeData.title}.mp4`
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setProgress(null)
    }
  }, [episodeData.video_url, episodeData.episode_id, episodeData.title])

  return { progress, download, error }
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

  const pageTitle = `${currentEpisodeData.title} | animatrix`

  // selectedSeasonIdが変わったらseasonとseriesを再取得
  useEffect(() => {
    if (!selectedSeasonId) return
    getApiBaseUrl().then(async baseUrl => {
      try {
        const season = await fetchJson<Season>(`${baseUrl}/v1/season/${selectedSeasonId}`)
        setEpisodeList(season.episodes || [])
        // seasonのseries_idからseriesを再取得
        const series = await fetchJson<Series>(`${baseUrl}/v1/series/${season.series_id}`)
        setSeasonList(series.seasons || [])
      } catch {
        setEpisodeList([])
        setSeasonList([])
      }
    })
  }, [selectedSeasonId])

  const { progress, download, error } = useEpisodeDownloader(episodeData)
  const navigate = useNavigate()
  const [autoPlay, setAutoPlay] = useState(false)
  const [startFullscreen, setStartFullscreen] = useState(false)

  // 次のエピソード・シーズン判定ロジック
  const getNextEpisode = () => {
    if (!episodeList.length) return null
    const currentIdx = episodeList.findIndex(e => e.episode_id === currentEpisodeData.episode_id)
    if (currentIdx < 0) return null

    // 次の話が同じシーズンにある場合
    if (currentIdx + 1 < episodeList.length) {
      return {
        seasonId: selectedSeasonId,
        episodeId: episodeList[currentIdx + 1].episode_id
      }
    }

    // 次のシーズンがある場合
    const nextSeasonIdx = seasonList.findIndex(s => s.season_id === selectedSeasonId) + 1
    if (nextSeasonIdx < seasonList.length) {
      const nextSeason = seasonList[nextSeasonIdx]
      if (nextSeason.season_id) {
        return {
          seasonId: nextSeason.season_id,
          episodeId: nextSeason.episodes?.[0]?.episode_id
        }
      }
    }
    return null
  }

  // Load another episode *in-place* (do not unmount VideoPlayer) so fullscreen can be preserved
  const loadEpisodeInPlace = async (
    episodeId: string,
    opts?: { keepFullscreen?: boolean; autoPlay?: boolean }
  ) => {
    try {
      const baseUrl = await getApiBaseUrl()
      const [ep, season] = await Promise.all([
        fetchJson<Episode>(`${baseUrl}/v1/episode/${episodeId}`),
        fetchJson<Season>(`${baseUrl}/v1/season/${episodeId.slice(0, episodeId.lastIndexOf('_'))}`)
      ])
      const series = await fetchJson<Series>(`${baseUrl}/v1/series/${season.series_id}`)

      // update state in-place (VideoPlayer remains mounted)
      setCurrentEpisodeData(ep)
      setCurrentSeasonData(season)
      setCurrentSeriesData(series)
      setSelectedSeasonId(season.season_id)
      setEpisodeList(season.episodes || [])
      setSeasonList(series.seasons || [])

      // update URL/history so back/forward work and pass flags
      const usr = { autoPlay: !!opts?.autoPlay, keepFullscreen: !!opts?.keepFullscreen }
      const newState = { ...window.history.state, usr }
      window.history.pushState(newState, '', `/episode/${ep.episode_id}`)

      // update local playback flags
      setAutoPlay(!!opts?.autoPlay)
      setStartFullscreen(!!opts?.keepFullscreen)

      // update document title
      if (typeof document !== 'undefined') document.title = `${ep.title} | animatrix`
    } catch {
      // fallback to full navigation if something goes wrong
      const next = getNextEpisode()
      if (next && next.episodeId)
        navigate(`/episode/${next.episodeId}`, {
          state: { autoPlay: true, keepFullscreen: !!opts?.keepFullscreen }
        })
    }
  }

  // 動画終了時のコールバック
  const handleVideoEnded = (opts?: { keepFullscreen?: boolean }) => {
    const next = getNextEpisode()
    if (next && next.episodeId) {
      // load next episode in-place so the player DOM stays mounted and fullscreen is preserved
      loadEpisodeInPlace(next.episodeId, { keepFullscreen: !!opts?.keepFullscreen, autoPlay: true })
    }
  }

  // ページ遷移後に自動再生する
  useEffect(() => {
    // location.state から autoPlay と keepFullscreen を取得
    const state = window.history.state && window.history.state.usr
    setAutoPlay(state && state.autoPlay === true)
    setStartFullscreen(state && state.keepFullscreen === true)

    // 再生フラグと keepFullscreen を消す（1回だけ有効にする）
    if (state && (state.autoPlay || state.keepFullscreen)) {
      const newUsr = { ...state, autoPlay: false, keepFullscreen: false }
      const newState = { ...window.history.state, usr: newUsr }
      window.history.replaceState(newState, '')
    }
  }, [currentEpisodeData.episode_id])

  const { showToast } = useToast()

  // --- 共有リンクダイアログ用state ---
  const [shareOpen, setShareOpen] = useState(false)
  const [shareIncludeTime, setShareIncludeTime] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)

  // VideoPlayerの再生位置を取得するためのコールバック
  const handleTimeUpdate = useCallback((sec: number) => {
    setCurrentTime(sec)
  }, [])

  // 共有リンク生成
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const episodeUrl = `/episode/${currentEpisodeData.episode_id}`
  let shareUrl = baseUrl + episodeUrl
  if (shareIncludeTime && currentTime > 0) {
    // t=1m30s形式で
    const min = Math.floor(currentTime / 60)
    const sec = Math.floor(currentTime % 60)
    shareUrl += `?t=${min > 0 ? `${min}m` : ''}${sec}s`
  }

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
