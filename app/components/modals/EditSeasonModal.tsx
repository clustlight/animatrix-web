import { useEffect, useState } from 'react'
import { useToast } from '../providers/ToastProvider'
import type { Episode, Season, SeasonMetadata } from '../../types'
import { useSyoboiSeasonSync } from '../../hooks/useSyoboiSeasonSync'
import { EpisodeMetadataRow } from './EpisodeMetadataRow'
import { SyoboiSeasonSyncPanel } from './SyoboiSeasonSyncPanel'

type EditSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  initialTitle: string
  initialSeason?: Season
  seriesTitle: string
  onSave: (seasonId: string, changes: SeasonMetadata) => Promise<void>
  episodes?: Episode[]
  onDeleteEpisode?: (episodeId: string, episodeTitle?: string) => Promise<void>
  onUpdateEpisode?: (
    episodeId: string,
    changes: { title: string; timestamp: string }
  ) => Promise<void>
  onSeasonSynced?: (seasonId: string, updatedSeason: Season) => void
  shoboiTid?: number
}

type EditPanel = 'season' | 'syoboi'

function getSeasonMetadata(season?: Season): SeasonMetadata {
  return {
    season_title: season?.season_title ?? '',
    season_title_yomi: season?.season_title_yomi ?? '',
    season_number: season?.season_number ?? 0,
    shoboi_tid: season?.shoboi_tid ?? 0,
    description: season?.description ?? '',
    first_year: season?.first_year ?? 0,
    first_month: season?.first_month ?? 0,
    first_end_year: season?.first_end_year ?? 0,
    first_end_month: season?.first_end_month ?? 0
  }
}

export function EditSeasonModal({
  open,
  onClose,
  seasonId,
  initialTitle,
  initialSeason,
  seriesTitle,
  onSave,
  episodes = [],
  onDeleteEpisode,
  onUpdateEpisode,
  onSeasonSynced,
  shoboiTid
}: EditSeasonModalProps) {
  const [activePanel, setActivePanel] = useState<EditPanel>('season')
  const [metadata, setMetadata] = useState(() => getSeasonMetadata(initialSeason))
  const [loading, setLoading] = useState(false)
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    setMetadata(getSeasonMetadata(initialSeason))
  }, [initialSeason, open])

  useEffect(() => {
    if (open) setActivePanel('season')
  }, [open])

  const updateMetadata = <K extends keyof SeasonMetadata>(key: K, value: SeasonMetadata[K]) => {
    setMetadata(previous => ({ ...previous, [key]: value }))
  }

  const syoboiSync = useSyoboiSeasonSync({
    open,
    seasonId,
    initialTitle,
    episodes,
    shoboiTid,
    onSeasonSynced,
    onTitleChange: title => updateMetadata('season_title', title)
  })

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

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(seasonId, metadata)
      showToast('シーズン情報を更新しました', 'success')
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : 'シーズン情報の更新に失敗しました',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEpisode = async (episodeId: string, episodeTitle?: string) => {
    if (!onDeleteEpisode) return
    setDeletingEpisodeId(episodeId)
    try {
      await onDeleteEpisode(episodeId, episodeTitle)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'エピソードの削除に失敗しました'
      showToast(message, 'error')
    } finally {
      setDeletingEpisodeId(null)
    }
  }

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3'
      onMouseDown={event => {
        if (event.target === event.currentTarget && !loading) onClose()
      }}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='edit-season-title'
        className='flex max-h-[92vh] min-h-0 min-w-0 w-full max-w-300 flex-col overflow-hidden rounded border border-border bg-card p-4 text-card-foreground shadow-lg sm:p-6'
      >
        <h2 id='edit-season-title' className='mb-4 shrink-0 text-lg font-bold'>
          シーズン設定
        </h2>

        <div
          role='tablist'
          aria-label='編集パネル'
          className='mb-3 grid shrink-0 grid-cols-2 gap-2 lg:hidden'
        >
          <button
            type='button'
            role='tab'
            aria-selected={activePanel === 'season'}
            onClick={() => setActivePanel('season')}
            className={`rounded border px-3 py-2 text-sm ${
              activePanel === 'season'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary text-secondary-foreground'
            }`}
          >
            シーズン情報
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={activePanel === 'syoboi'}
            onClick={() => setActivePanel('syoboi')}
            className={`rounded border px-3 py-2 text-sm ${
              activePanel === 'syoboi'
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-secondary text-secondary-foreground'
            }`}
          >
            しょぼかる連携
          </button>
        </div>

        <div className='grid min-h-0 flex-1 gap-5 lg:grid-cols-2'>
          <div
            role='tabpanel'
            className={`${activePanel === 'season' ? 'flex' : 'hidden'} min-h-0 flex-col overflow-y-auto lg:flex`}
          >
            <section className='space-y-3 border-b border-border pb-4'>
              <h3 className='text-sm font-semibold'>基本情報</h3>
              <label className='block space-y-1 text-sm'>
                <span>シーズン名</span>
                <input
                  type='text'
                  value={metadata.season_title}
                  onChange={event => updateMetadata('season_title', event.target.value)}
                  disabled={loading}
                  className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
                />
              </label>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <label className='block space-y-1 text-sm'>
                  <span>読み</span>
                  <input
                    type='text'
                    value={metadata.season_title_yomi}
                    onChange={event => updateMetadata('season_title_yomi', event.target.value)}
                    disabled={loading}
                    className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
                  />
                </label>
                <label className='block space-y-1 text-sm'>
                  <span>シーズン番号</span>
                  <input
                    type='number'
                    min={0}
                    value={metadata.season_number || ''}
                    onChange={event =>
                      updateMetadata('season_number', Number(event.target.value) || 0)
                    }
                    disabled={loading}
                    className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
                  />
                </label>
                <label className='block space-y-1 text-sm'>
                  <span>しょぼいカレンダー ID</span>
                  <input
                    type='number'
                    min={0}
                    value={metadata.shoboi_tid || ''}
                    onChange={event =>
                      updateMetadata('shoboi_tid', Number(event.target.value) || 0)
                    }
                    disabled={loading}
                    className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
                  />
                </label>
              </div>
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {(
                  [
                    ['first_year', '開始年'],
                    ['first_month', '開始月'],
                    ['first_end_year', '終了年'],
                    ['first_end_month', '終了月']
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className='block space-y-1 text-sm'>
                    <span>{label}</span>
                    <input
                      type='number'
                      min={0}
                      max={key.endsWith('month') ? 12 : undefined}
                      value={metadata[key] || ''}
                      onChange={event => updateMetadata(key, Number(event.target.value) || 0)}
                      disabled={loading}
                      className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
                    />
                  </label>
                ))}
              </div>
              <label className='block space-y-1 text-sm'>
                <span>説明</span>
                <textarea
                  value={metadata.description}
                  onChange={event => updateMetadata('description', event.target.value)}
                  disabled={loading}
                  rows={8}
                  className='w-full min-h-48 resize-y rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
                />
              </label>
              <div className='flex justify-end'>
                <button
                  type='button'
                  onClick={handleSave}
                  disabled={loading || !metadata.season_title.trim()}
                  className='rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60'
                >
                  {loading ? '保存中…' : 'シーズン情報を保存'}
                </button>
              </div>
            </section>
          </div>

          <div
            role='tabpanel'
            className={`${activePanel === 'syoboi' ? 'block' : 'hidden'} min-h-0 overflow-y-auto lg:block`}
          >
            <SyoboiSeasonSyncPanel
              sync={syoboiSync}
              seriesTitle={seriesTitle}
              episodes={episodes}
            />

            <section className='mt-4 min-h-0'>
              <h3 className='mb-2 text-sm font-semibold'>エピソード情報</h3>
              <ul className='max-h-[32vh] overflow-y-auto pr-1'>
                {episodes.length === 0 ? (
                  <li className='py-2 text-center text-muted-foreground'>エピソードがありません</li>
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
            </section>
          </div>
        </div>

        <div className='mt-4 flex shrink-0 justify-end border-t border-border pt-3'>
          <button
            type='button'
            className='cursor-pointer rounded bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/80'
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
