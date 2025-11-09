import { MdEdit, MdCheck, MdClose, MdDelete, MdSwapHoriz } from 'react-icons/md'
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
  onMoveClick: () => void
  moveLoading: boolean
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
  onMoveClick,
  moveLoading,
  portraitUrl,
  originalTitle
}: SeriesHeaderProps) {
  return (
    <div className='flex items-center gap-12'>
      <div className='w-40 h-60 relative flex-shrink-0'>
        <PortraitImage src={portraitUrl} alt={title} />
      </div>
      <div>
        <h1
          className={`font-bold flex items-center gap-2 max-w-[22rem] break-words whitespace-normal ${
            title.length > 40 ? 'text-base' : title.length > 24 ? 'text-lg' : 'text-2xl'
          }`}
        >
          {editing ? (
            <>
              <input
                type='text'
                value={title}
                onChange={e => setTitle(e.target.value)}
                className='bg-gray-800 text-white px-2 py-1 rounded w-full max-w-[20rem]'
                disabled={editLoading}
              />
              <button
                onClick={handleTitleSave}
                disabled={editLoading}
                className='ml-2 text-green-400 cursor-pointer'
                aria-label='save'
              >
                <MdCheck size={24} />
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setTitle(originalTitle)
                }}
                disabled={editLoading}
                className='ml-1 text-red-400 cursor-pointer'
                aria-label='cancel'
              >
                <MdClose size={24} />
              </button>
            </>
          ) : (
            <>
              <span
                className={`truncate block max-w-[20rem] break-words whitespace-normal ${
                  title.length > 40 ? 'text-base' : title.length > 24 ? 'text-lg' : 'text-2xl'
                }`}
              >
                {title}
              </span>
              <button
                onClick={() => setEditing(true)}
                className='ml-2 text-blue-400 cursor-pointer'
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
        <div className='mt-4 flex gap-2'>
          <button
            className='px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60'
            onClick={onMoveClick}
            disabled={moveLoading}
            type='button'
          >
            <MdSwapHoriz size={20} />
          </button>
          <button
            className='px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60'
            onClick={onDeleteClick}
            disabled={deleteLoading}
            type='button'
          >
            <MdDelete size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
