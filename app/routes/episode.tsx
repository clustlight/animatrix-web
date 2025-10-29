import type { Episode, Season, Series } from '../types'
import type { Route } from './+types/episode'
import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router'
import VideoPlayer from '~/components/player/VideoPlayer'
import { getApiBaseUrl } from '../lib/config'
import { EpisodeTimestamp, EpisodeList, SeasonTabs } from '~/components/Episode'
import { MdEdit, MdCheck, MdClose, MdDownload } from 'react-icons/md'
import { useToast } from '../components/ToastProvider'

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
      const blob = new Blob(chunks)
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
      <nav className='flex items-center gap-2 text-xs sm:text-sm text-gray-400'>
        <Link to={`/series/${seasonData.series_id}`} className='hover:underline text-blue-500'>
          {seriesData.title}
        </Link>
        <span>&gt;</span>
        <Link
          to={`/series/${seasonData.series_id}?season=${seasonData.season_id}`}
          className='hover:underline text-blue-500'
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

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(seasonData.season_id)
  const [episodeList, setEpisodeList] = useState<Episode[]>(seasonData.episodes || [])
  const [seasonList, setSeasonList] = useState<Season[]>(seriesData.seasons || [])

  const pageTitle = `${episodeData.title} | animatrix`

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

  // 次のエピソード・シーズン判定ロジック
  const getNextEpisode = () => {
    if (!episodeList.length) return null
    const currentIdx = episodeList.findIndex(e => e.episode_id === episodeData.episode_id)
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

  // 動画終了時のコールバック
  const handleVideoEnded = () => {
    const next = getNextEpisode()
    if (next) {
      setSelectedSeasonId(next.seasonId)
      navigate(`/episode/${next.episodeId}`, { state: { autoPlay: true } }) // stateで渡す
    }
  }

  // ページ遷移後に自動再生する
  useEffect(() => {
    // location.state から autoPlay を取得
    const state = window.history.state && window.history.state.usr
    setAutoPlay(state && state.autoPlay === true)

    // 再生フラグを消す（1回だけ有効にする）
    if (state && state.autoPlay) {
      const newState = { ...window.history.state, usr: { ...state, autoPlay: false } }
      window.history.replaceState(newState, '')
    }
  }, [episodeData.episode_id])

  const [editingDesc, setEditingDesc] = useState(false)
  const [description, setDescription] = useState(episodeData.description ?? '')
  const [descLoading, setDescLoading] = useState(false)

  useEffect(() => {
    setDescription(episodeData.description ?? '')
    setEditingDesc(false)
  }, [episodeData.episode_id])

  const { showToast } = useToast()

  const handleSaveDesc = useCallback(async () => {
    setDescLoading(true)
    try {
      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/episode/${episodeData.episode_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description })
      })
      if (!res.ok) throw new Error('保存に失敗しました')
      setEditingDesc(false)
      showToast('説明文を更新しました', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : '保存に失敗しました', 'error')
    } finally {
      setDescLoading(false)
    }
  }, [description, episodeData.episode_id])

  return (
    <main className='flex flex-col items-center pt-2 pb-4 min-h-screen bg-black'>
      <title>{pageTitle}</title>
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
            <div className='mt-2 text-gray-300 text-sm whitespace-pre-line'>
              {editingDesc ? (
                <div className='flex flex-col gap-2'>
                  <textarea
                    className='bg-gray-800 text-white px-2 py-1 rounded resize-vertical min-h-[60px]'
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    disabled={descLoading}
                  />
                  <div className='flex gap-2'>
                    <button
                      onClick={handleSaveDesc}
                      disabled={descLoading}
                      className='px-3 py-1 bg-blue-700 text-white rounded flex items-center gap-1'
                    >
                      <MdCheck size={20} />
                      保存
                    </button>
                    <button
                      onClick={() => {
                        setEditingDesc(false)
                        setDescription(episodeData.description ?? '')
                      }}
                      disabled={descLoading}
                      className='px-3 py-1 bg-gray-700 text-white rounded flex items-center gap-1'
                    >
                      <MdClose size={20} />
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <div className='flex items-start gap-2'>
                  <span>{description}</span>
                  <button
                    className='ml-2 text-gray-400 hover:text-blue-500'
                    title='説明文編集'
                    onClick={() => setEditingDesc(true)}
                  >
                    <MdEdit size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
          {episodeData.video_url && (
            <div className='tablet-portrait:w-full'>
              <VideoPlayer
                key={episodeData.episode_id}
                url={episodeData.video_url}
                onEnded={handleVideoEnded}
                autoPlay={autoPlay}
              />
            </div>
          )}
          <div className='flex flex-col sm:flex-row items-start mt-2 gap-4'>
            <button
              onClick={download}
              disabled={progress !== null}
              className='ml-0 cursor-pointer transition-colors bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow'
              style={{ pointerEvents: progress !== null ? 'none' : 'auto' }}
            >
              <MdDownload size={22} />
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
              {error && <div className='text-red-500'>{error}</div>}
            </div>
          </div>
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
