import { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'
import type { Episode } from '../types'
import { MdEdit, MdCheck, MdClose } from 'react-icons/md'

type EditSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  initialTitle: string
  onSave: (seasonId: string, newTitle: string) => Promise<void>
  episodes?: Episode[]
  onDeleteEpisode?: (episodeId: string, episodeTitle?: string) => Promise<void>
}

export function EditSeasonModal({
  open,
  onClose,
  seasonId,
  initialTitle,
  onSave,
  episodes = [],
  onDeleteEpisode
}: EditSeasonModalProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [loading, setLoading] = useState(false)
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null)
  const { showToast } = useToast()

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
      <div className='bg-gray-900 p-6 rounded shadow-lg flex flex-col w-[520px] max-w-[90vw] min-w-[520px] h-[820px] max-h-[90vh] min-h-[180px] overflow-y-auto'>
        <h2 className='text-lg font-bold mb-4'>シーズンを編集</h2>
        <div className='mb-1'>
          <div className='flex items-center gap-2'>
            {editing ? (
              <>
                <input
                  type='text'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className='bg-gray-800 text-white px-2 py-1 rounded w-full max-w-[20rem]'
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
                  className={`truncate block max-w-[20rem] break-words whitespace-normal text-lg`}
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
        <ul className='overflow-y-auto flex-1 mb-2 mt-4 max-h-[70vh]'>
          <style>
            {`
              .overflow-y-auto::-webkit-scrollbar { width: 8px; background: #1e293b; }
              .overflow-y-auto::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 4px; }
              .overflow-y-auto::-webkit-scrollbar-track { background: #1e293b; }
            `}
          </style>
          {episodes.length === 0 ? (
            <li className='text-gray-400 text-center py-2'>エピソードがありません</li>
          ) : (
            episodes.map(ep => (
              <li key={ep.episode_id} className='mb-1'>
                <div className='flex items-center gap-3 w-full px-2 py-1 rounded hover:bg-gray-800'>
                  {ep.thumbnail_url ? (
                    <img
                      src={ep.thumbnail_url}
                      alt={ep.title}
                      className='w-24 h-16 object-cover rounded shadow min-w-[96px] min-h-[64px]'
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className='w-24 h-16 bg-gray-700 rounded flex items-center justify-center text-gray-400 text-xs'>
                      No Image
                    </div>
                  )}
                  <span className='flex-1 flex flex-col'>
                    <span>{ep.title}</span>
                    <span className='text-xs text-gray-400'>ID: {ep.episode_id}</span>
                  </span>
                  <button
                    className='px-2 py-1 bg-red-700 text-white rounded cursor-pointer text-xs'
                    onClick={() => handleDeleteEpisode(ep.episode_id, ep.title)}
                    disabled={deletingEpisodeId === ep.episode_id}
                  >
                    {deletingEpisodeId === ep.episode_id ? '削除中...' : '削除'}
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className='flex gap-4'>
          <button
            className='px-4 py-2 bg-gray-700 text-white rounded cursor-pointer'
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
