import React from 'react'
import { MdEdit, MdCheck, MdClose, MdDelete } from 'react-icons/md'
import { PortraitImage } from '~/components/PortraitImage'

type SeriesHeaderProps = {
  editing: boolean
  title: string
  setTitle: (t: string) => void
  editLoading: boolean
  setEditing: (v: boolean) => void
  handleTitleSave: () => void
  totalSeasons: number
  totalEpisodes: number
  onDeleteClick: () => void
  deleteLoading: boolean
  portraitUrl: string
  originalTitle: string
}

export function SeriesHeader({
  editing,
  title,
  setTitle,
  editLoading,
  setEditing,
  handleTitleSave,
  totalSeasons,
  totalEpisodes,
  onDeleteClick,
  deleteLoading,
  portraitUrl,
  originalTitle
}: SeriesHeaderProps) {
  return (
    <div className='flex items-center gap-12'>
      <div className='w-40 h-60 relative flex-shrink-0'>
        <PortraitImage src={portraitUrl} alt={title} />
      </div>
      <div>
        <h1 className='text-2xl font-bold flex items-center gap-2'>
          {editing ? (
            <>
              <input
                type='text'
                value={title}
                onChange={e => setTitle(e.target.value)}
                className='bg-gray-800 text-white px-2 py-1 rounded'
                disabled={editLoading}
              />
              <button
                onClick={handleTitleSave}
                disabled={editLoading}
                className='ml-2 text-green-400'
                aria-label='保存'
              >
                <MdCheck size={24} />
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setTitle(originalTitle)
                }}
                disabled={editLoading}
                className='ml-1 text-red-400'
                aria-label='キャンセル'
              >
                <MdClose size={24} />
              </button>
            </>
          ) : (
            <>
              {title}
              <button
                onClick={() => setEditing(true)}
                className='ml-2 text-blue-400'
                aria-label='編集'
              >
                <MdEdit size={22} />
              </button>
            </>
          )}
        </h1>
        <div className='text-gray-400 text-sm mt-1'>
          {`シーズン数: ${totalSeasons}　全${totalEpisodes}話`}
        </div>
        <button
          className='mt-4 px-3 py-1 bg-red-700 text-white rounded flex items-center gap-2 cursor-pointer'
          onClick={onDeleteClick}
          disabled={deleteLoading}
        >
          <MdDelete size={20} />
          シリーズを削除
        </button>
      </div>
    </div>
  )
}
