import React from 'react'

type DeleteDialogProps = {
  open: boolean
  onDelete: () => void
  onCancel: () => void
  loading: boolean
}

export function DeleteDialog({ open, onDelete, onCancel, loading }: DeleteDialogProps) {
  if (!open) return null
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50'
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div className='bg-gray-900 p-6 rounded shadow-lg flex flex-col' style={{ width: 400 }}>
        <h2 className='text-lg font-bold mb-2'>シリーズを削除しますか？</h2>
        <div className='mb-4 text-gray-300'>この操作は元に戻せません。</div>
        <div className='flex gap-4'>
          <button
            className='px-4 py-2 bg-red-700 text-white rounded cursor-pointer'
            onClick={onDelete}
            disabled={loading}
          >
            削除する
          </button>
          <button
            className='px-4 py-2 bg-gray-700 text-white rounded cursor-pointer'
            onClick={onCancel}
            disabled={loading}
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
