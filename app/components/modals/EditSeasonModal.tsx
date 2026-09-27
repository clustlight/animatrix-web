import { useState, useEffect } from 'react'
import { useToast } from '../providers/ToastProvider'
import type { Episode, Season } from '../../types'
import { MdEdit, MdCheck, MdClose } from 'react-icons/md'
import { useSyoboiSeasonSync } from '../../hooks/useSyoboiSeasonSync'

type EditSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  initialTitle: string
  seriesTitle: string
  onSave: (seasonId: string, newTitle: string) => Promise<void>
  episodes?: Episode[]
  onDeleteEpisode?: (episodeId: string, episodeTitle?: string) => Promise<void>
  onUpdateEpisode?: (
    episodeId: string,
    changes: { title: string; timestamp: string }
  ) => Promise<void>
  onSeasonSynced?: (seasonId: string, updatedSeason: Season) => void
  shoboiTid?: number
}

export function EditSeasonModal({
  open,
  onClose,
  seasonId,
  initialTitle,
  seriesTitle,
  onSave,
  episodes = [],
  onDeleteEpisode,
  onUpdateEpisode,
  onSeasonSynced,
  shoboiTid
}: EditSeasonModalProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [loading, setLoading] = useState(false)
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null)
  const { showToast } = useToast()
  const {
    query: syoboiQuery,
    setQuery: setSyoboiQuery,
    results: syoboiResults,
    selected: syoboiSelected,
    setSelected: setSyoboiSelected,
    loading: syoboiLoading,
    error: syoboiError,
    searched: syoboiSearched,
    applyLoading: syoboiApplyLoading,
    appendLoading: syoboiAppendLoading,
    episodeLoading: syoboiEpisodeLoading,
    episodeProgress: syoboiEpisodeProgress,
    startEpisodeNumber,
    setStartEpisodeNumber,
    search: handleSyoboiSearch,
    applyEpisodeSchedule: handleSyoboiEpisodeApply,
    applySelected: handleSyoboiApply,
    appendSelected: handleSyoboiAppend
  } = useSyoboiSeasonSync({
    open,
    seasonId,
    initialTitle,
    episodes,
    shoboiTid,
    onSeasonSynced,
    onTitleChange: setTitle
  })

  useEffect(() => {
    setTitle(initialTitle)
    setEditing(false)
  }, [initialTitle, open])

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

  const handleTitleSave = async () => {
    setLoading(true)
    try {
      await onSave(seasonId, title)
      setEditing(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存に失敗しました'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEpisode = async (episodeId: string, episodeTitle?: string) => {
    if (!onDeleteEpisode) return
    setDeletingEpisodeId(episodeId)
    try {
      await onDeleteEpisode(episodeId, episodeTitle)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'エピソード削除に失敗しました'
      showToast(msg, 'error')
    } finally {
      setDeletingEpisodeId(null)
    }
  }

  if (!open) return null
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50'
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div className='bg-card text-card-foreground border border-border p-5 sm:p-6 rounded shadow-lg flex flex-col w-[96vw] sm:w-130 max-w-[96vw] sm:max-w-130 min-w-0 h-[90vh] sm:h-205 max-h-[90vh] sm:min-h-45 overflow-y-auto'>
        <h2 className='text-lg font-bold mb-4'>シーズンを編集</h2>
        <div className='mb-1'>
          <div className='flex items-center gap-2'>
            {editing ? (
              <>
                <input
                  type='text'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className='bg-background text-foreground border border-border px-2 py-1 rounded w-full max-w-[20rem]'
                  disabled={loading}
                />
                <button
                  onClick={handleTitleSave}
                  disabled={loading}
                  className='ml-2 text-green-400 cursor-pointer'
                  aria-label='save'
                >
                  <MdCheck size={24} />
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setTitle(initialTitle)
                  }}
                  disabled={loading}
                  className='ml-1 text-red-400 cursor-pointer'
                  aria-label='cancel'
                >
                  <MdClose size={24} />
                </button>
              </>
            ) : (
              <>
                <span
                  className={`truncate block max-w-[20rem] wrap-break-word whitespace-normal text-lg`}
                >
                  {title}
                </span>
                <button
                  onClick={() => setEditing(true)}
                  className='ml-2 text-blue-400 cursor-pointer'
                  aria-label='edit'
                >
                  <MdEdit size={22} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className='mt-4 border-t border-border pt-4'>
          <div className='text-sm font-semibold mb-2'>しょぼいカレンダー連携</div>
          <div className='flex gap-2 mb-2'>
            <input
              type='text'
              value={syoboiQuery}
              onChange={e => setSyoboiQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSyoboiSearch()
                }
              }}
              className='flex-1 bg-background text-foreground border border-border px-2 py-1 rounded'
              placeholder='タイトルで検索'
              disabled={syoboiLoading || syoboiApplyLoading}
            />
            <button
              className='px-2 py-1 text-xs text-muted-foreground border border-border rounded hover:text-foreground transition-colors'
              onClick={() => {
                setSyoboiQuery(seriesTitle)
                handleSyoboiSearch(seriesTitle)
              }}
              disabled={!seriesTitle || syoboiLoading || syoboiApplyLoading}
              type='button'
            >
              シリーズ名
            </button>
            <button
              className='px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded disabled:opacity-60'
              onClick={() => handleSyoboiSearch()}
              disabled={syoboiLoading || syoboiApplyLoading}
              type='button'
            >
              {syoboiLoading ? '検索中...' : '検索'}
            </button>
          </div>
          {syoboiError && <div className='text-red-400 text-xs mb-2'>{syoboiError}</div>}
          <div className='max-h-40 overflow-y-auto mb-2 syoboi-scroll'>
            <style>
              {`\n                .syoboi-scroll::-webkit-scrollbar { width: 6px; background: var(--scrollbar-track); }\n                .syoboi-scroll::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }\n                .syoboi-scroll::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }\n                .syoboi-scroll::-webkit-scrollbar-track { background: var(--scrollbar-track); }\n              `}
            </style>
            <ul>
              {syoboiSearched && syoboiResults.length === 0 && !syoboiLoading && (
                <li className='text-muted-foreground text-xs text-center py-2'>検索結果なし</li>
              )}
              {syoboiResults.map(item => (
                <li key={item.tid} className='mb-1'>
                  <button
                    className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                      syoboiSelected?.tid === item.tid
                        ? 'bg-primary text-primary-foreground border border-primary/60 shadow-sm'
                        : 'bg-muted/70 text-foreground border border-border hover:bg-muted'
                    }`}
                    onClick={() => setSyoboiSelected(item)}
                    type='button'
                  >
                    <div className='font-semibold'>{item.title}</div>
                    <div
                      className={`text-[11px] ${
                        syoboiSelected?.tid === item.tid
                          ? 'text-primary-foreground/90'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {item.firstYear ? `${item.firstYear}/${item.firstMonth || ''}` : '不明'}
                      {item.firstEndYear
                        ? ` 〜 ${item.firstEndYear}/${item.firstEndMonth || ''}`
                        : ''}
                      {item.firstCh ? ` ・ ${item.firstCh}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className='flex flex-wrap gap-2'>
            <button
              className='px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-60'
              onClick={handleSyoboiApply}
              disabled={!syoboiSelected || syoboiApplyLoading || syoboiAppendLoading}
              type='button'
            >
              {syoboiApplyLoading ? '転写中...' : '選択した内容を転写'}
            </button>
            <button
              className='px-3 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded disabled:opacity-60'
              onClick={handleSyoboiAppend}
              disabled={!syoboiSelected || syoboiAppendLoading || syoboiApplyLoading}
              type='button'
            >
              {syoboiAppendLoading ? '追記中...' : '内容を追記'}
            </button>
          </div>
          <div className='mt-3 flex flex-wrap items-center gap-3'>
            <label className='flex items-center gap-2 text-xs text-muted-foreground'>
              開始する内部話数
              <input
                type='number'
                min={1}
                step={1}
                value={startEpisodeNumber}
                onChange={event =>
                  setStartEpisodeNumber(Math.max(1, Number(event.target.value) || 1))
                }
                className='w-20 rounded border border-border bg-background px-2 py-1 text-foreground'
                disabled={syoboiEpisodeLoading}
              />
            </label>
            <span className='basis-full text-xs text-muted-foreground'>
              内部話数と同じCountを優先し、放送情報がなければ開始内部話数からの相対Countで転写します
            </span>
            <button
              className='px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded disabled:opacity-60'
              onClick={handleSyoboiEpisodeApply}
              disabled={syoboiEpisodeLoading || episodes.length === 0}
              type='button'
            >
              {syoboiEpisodeLoading ? '各話を転写中...' : '各話の放送日/コメントを転写'}
            </button>
            {syoboiEpisodeLoading && (
              <span className='text-xs text-muted-foreground'>進捗: {syoboiEpisodeProgress}%</span>
            )}
          </div>
        </div>
        <ul className='overflow-y-auto flex-1 mb-2 mt-4 max-h-[70vh]'>
          <style>
            {`\n              .overflow-y-auto::-webkit-scrollbar { width: 8px; background: var(--scrollbar-track); }\n              .overflow-y-auto::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }\n              .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }\n              .overflow-y-auto::-webkit-scrollbar-track { background: var(--scrollbar-track); }\n            `}
          </style>
          {episodes.length === 0 ? (
            <li className='text-muted-foreground text-center py-2'>エピソードがありません</li>
          ) : (
            episodes.map(episode => (
              <li key={episode.episode_id} className='mb-1'>
                <EpisodeMetadataRow
                  episode={episode}
                  onSave={onUpdateEpisode}
                  onDelete={() => handleDeleteEpisode(episode.episode_id, episode.title)}
                  deleting={deletingEpisodeId === episode.episode_id}
                />
              </li>
            ))
          )}
        </ul>
        <div className='flex gap-4'>
          <button
            className='px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded cursor-pointer'
            onClick={onClose}
            disabled={loading}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

function toDateTimeInput(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 19)
}

function EpisodeMetadataRow({
  episode,
  onSave,
  onDelete,
  deleting
}: {
  episode: Episode
  onSave?: (episodeId: string, changes: { title: string; timestamp: string }) => Promise<void>
  onDelete: () => void
  deleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(episode.title)
  const [timestamp, setTimestamp] = useState(() => toDateTimeInput(episode.timestamp))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const beginEditing = () => {
    setTitle(episode.title)
    setTimestamp(toDateTimeInput(episode.timestamp))
    setError(null)
    setEditing(true)
  }

  const save = async () => {
    if (!onSave) return
    const date = new Date(timestamp)
    if (!title.trim() || Number.isNaN(date.getTime())) {
      setError('タイトルと有効な放送開始日時を入力してください')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(episode.episode_id, { title: title.trim(), timestamp: date.toISOString() })
      setEditing(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'エピソードの更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='flex items-center gap-3 w-full px-2 py-1 rounded hover:bg-muted/60'>
      {episode.thumbnail_url ? (
        <img
          src={episode.thumbnail_url}
          alt={episode.title}
          className='w-24 h-16 object-cover rounded shadow min-w-24 min-h-16'
          onError={event => (event.currentTarget.style.display = 'none')}
        />
      ) : (
        <div className='w-24 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs'>
          No Image
        </div>
      )}
      <div className='flex-1 flex min-w-0 flex-col gap-1'>
        {editing ? (
          <>
            <input
              aria-label='エピソードタイトル'
              value={title}
              onChange={event => setTitle(event.target.value)}
              className='w-full rounded border border-border bg-background px-2 py-1 text-sm text-foreground'
              disabled={saving}
            />
            <label className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
              放送開始日時
              <input
                aria-label='放送開始日時'
                type='datetime-local'
                step={1}
                value={timestamp}
                onChange={event => setTimestamp(event.target.value)}
                className='rounded border border-border bg-background px-2 py-1 text-foreground'
                disabled={saving}
              />
            </label>
            {error && <span className='text-xs text-red-500'>{error}</span>}
          </>
        ) : (
          <>
            <span className='break-words'>{episode.title}</span>
            <span className='text-xs text-muted-foreground'>
              {Number.isNaN(new Date(episode.timestamp).getTime())
                ? episode.timestamp
                : new Date(episode.timestamp).toLocaleString('ja-JP')}
            </span>
            <span className='text-xs text-muted-foreground'>ID: {episode.episode_id}</span>
          </>
        )}
      </div>
      {editing ? (
        <div className='flex shrink-0 gap-1'>
          <button
            type='button'
            className='rounded bg-green-700 px-2 py-1 text-xs text-white disabled:opacity-60'
            onClick={() => void save()}
            disabled={saving || !onSave}
          >
            {saving ? '保存中…' : '保存'}
          </button>
          <button
            type='button'
            className='rounded border border-border px-2 py-1 text-xs text-foreground disabled:opacity-60'
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            戻る
          </button>
        </div>
      ) : (
        <div className='flex shrink-0 flex-col gap-1'>
          <button
            type='button'
            className='rounded border border-border px-2 py-1 text-xs text-foreground disabled:opacity-60'
            onClick={beginEditing}
            disabled={!onSave}
          >
            編集
          </button>
          <button
            type='button'
            className='px-2 py-1 bg-red-700 text-white rounded cursor-pointer text-xs disabled:opacity-60'
            onClick={onDelete}
            disabled={deleting || editing}
          >
            {deleting ? '削除中…' : '削除'}
          </button>
        </div>
      )}
    </div>
  )
}
