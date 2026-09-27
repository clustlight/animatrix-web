import { useState } from 'react'
import type { Episode } from '../../types'

function toDateTimeInput(timestamp: string) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ''
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 19)
}

export function EpisodeMetadataRow({
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
