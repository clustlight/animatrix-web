import { useState, useEffect } from 'react'

type EditSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  initialTitle: string
  onSave: (seasonId: string, newTitle: string) => Promise<void>
}

export function EditSeasonModal({
  open,
  onClose,
  seasonId,
  initialTitle,
  onSave
}: EditSeasonModalProps) {
  const [title, setTitle] = useState(initialTitle)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle, open])

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

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      await onSave(seasonId, title)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50'
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div className='bg-gray-900 p-6 rounded shadow-lg flex flex-col' style={{ width: 400 }}>
        <h2 className='text-lg font-bold mb-2'>シーズン名を編集</h2>
        <input
          type='text'
          value={title}
          onChange={e => setTitle(e.target.value)}
          className='mb-4 px-3 py-2 rounded bg-gray-800 text-white'
          disabled={loading}
        />
        {error && <div className='text-red-500 mb-2'>{error}</div>}
        <div className='flex gap-4'>
          <button
            className='px-4 py-2 bg-blue-700 text-white rounded cursor-pointer'
            onClick={handleSave}
            disabled={loading}
          >
            保存
          </button>
          <button
            className='px-4 py-2 bg-gray-700 text-white rounded cursor-pointer'
            onClick={onClose}
            disabled={loading}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
