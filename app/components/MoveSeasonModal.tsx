import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Series } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { NoImage } from './NoImage'

const normalize = (str: string) =>
  str.toLowerCase().replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))

type MoveSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  onMove: (targetSeriesId: string) => void
  seasonTitle?: string // 追加: シーズン名を受け取る
}

export function MoveSeasonModal({ open, onClose, onMove, seasonTitle }: MoveSeasonModalProps) {
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [imgErrorMap, setImgErrorMap] = useState<{ [id: string]: boolean }>({})
  const [search, setSearch] = useState('')

  // モーダル表示中はbodyスクロール禁止
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setLoading(true)
      getApiBaseUrl().then(baseUrl =>
        fetch(`${baseUrl}/v1/series`)
          .then(res => res.json())
          .then(setSeriesList)
          .catch(() => setError('取得失敗'))
          .finally(() => setLoading(false))
      )
    }
  }, [open])

  const handleImgError = useCallback((id: string) => {
    setImgErrorMap(prev => ({ ...prev, [id]: true }))
  }, [])

  const filteredList = useMemo(
    () => seriesList.filter(s => normalize(s.title).includes(normalize(search))),
    [seriesList, search]
  )

  const handleMove = useCallback(
    (targetSeriesId: string) => {
      onMove(targetSeriesId)
      onClose()
    },
    [onMove, onClose]
  )

  if (!open) return null
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50'
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div className='bg-card text-card-foreground border border-border p-5 sm:p-6 rounded shadow-lg flex flex-col w-[96vw] sm:w-[520px] max-w-[96vw] sm:max-w-[520px] min-w-0 h-[90vh] sm:h-[820px] max-h-[90vh] sm:min-h-[180px]'>
        {seasonTitle && (
          <div className='mb-2 text-base text-primary font-semibold text-center'>{seasonTitle}</div>
        )}
        <h2 className='text-lg font-bold mb-2'>移動先を選択</h2>
        <input
          type='text'
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='タイトルで検索'
          className='mb-2 px-3 py-1 rounded bg-background text-foreground border border-border'
        />
        <div className='overflow-y-auto flex-1 mb-2 mt-4 max-h-[70vh]'>
          <style>
            {`
              .overflow-y-auto::-webkit-scrollbar { width: 8px; background: var(--scrollbar-track); }
              .overflow-y-auto::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
              .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }
              .overflow-y-auto::-webkit-scrollbar-track { background: var(--scrollbar-track); }
            `}
          </style>
          {loading ? (
            <div>読み込み中...</div>
          ) : error ? (
            <div className='text-red-500'>{error}</div>
          ) : (
            <ul>
              {filteredList.map(s => (
                <li key={s.series_id} className='mb-1'>
                  <button
                    className='flex items-center gap-3 w-full text-left px-2 py-1 rounded hover:bg-muted/60 cursor-pointer transition'
                    onClick={() => handleMove(s.series_id)}
                  >
                    {imgErrorMap[s.series_id] || !s.thumbnail_url ? (
                      <NoImage width='w-24' height='h-16' />
                    ) : (
                      <img
                        src={s.thumbnail_url}
                        alt={s.title}
                        className='w-24 h-16 object-cover rounded shadow'
                        style={{ minWidth: 96, minHeight: 64 }}
                        onError={() => handleImgError(s.series_id)}
                      />
                    )}
                    <span className='flex-1 flex flex-col'>
                      <span>{s.title}</span>
                      <span className='text-xs text-muted-foreground'>ID: {s.series_id}</span>
                    </span>
                  </button>
                </li>
              ))}
              {!filteredList.length && (
                <li className='text-muted-foreground text-center py-4'>
                  該当するシリーズがありません
                </li>
              )}
            </ul>
          )}
        </div>
        <button
          className='mt-1 text-muted-foreground px-4 py-2 rounded hover:bg-muted/60 cursor-pointer transition'
          onClick={onClose}
          type='button'
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
