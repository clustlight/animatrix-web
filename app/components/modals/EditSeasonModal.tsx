import { useState, useEffect } from 'react'
import { useToast } from '../providers/ToastProvider'
import type { Episode, Season } from '../../types'
import { MdEdit, MdCheck, MdClose } from 'react-icons/md'
import { useSyoboiSeasonSync } from '../../hooks/useSyoboiSeasonSync'
import { EpisodeMetadataRow } from './EpisodeMetadataRow'
import { SyoboiSeasonSyncPanel } from './SyoboiSeasonSyncPanel'

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
  const syoboiSync = useSyoboiSeasonSync({
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
        <SyoboiSeasonSyncPanel sync={syoboiSync} seriesTitle={seriesTitle} episodes={episodes} />
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
