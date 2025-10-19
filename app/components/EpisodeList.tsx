import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import type { Episode } from '../types'
import dayjs from 'dayjs'
import { NoImage } from './NoImage'

type EpisodeListProps = {
  episodes: Episode[]
}

export function EpisodeList({ episodes }: EpisodeListProps) {
  const [imgErrorMap, setImgErrorMap] = useState<{ [id: string]: boolean }>({})

  const handleImgError = useCallback((id: string) => {
    setImgErrorMap(prev => ({ ...prev, [id]: true }))
  }, [])

  if (!episodes?.length) {
    return <div className='text-center text-gray-400'>No episodes available</div>
  }

  return (
    <>
      {episodes.map(ep => (
        <Link
          key={ep.episode_id}
          to={`/episode/${ep.episode_id}`}
          className='flex items-center bg-gray-900 hover:bg-gray-800 rounded-lg shadow px-3 py-3 transition-colors'
          style={{ maxWidth: '100%' }}
        >
          <div className='relative w-40 h-24 mr-5 flex-shrink-0'>
            {imgErrorMap[ep.episode_id] || !ep.thumbnail_url ? (
              <NoImage />
            ) : (
              <img
                src={ep.thumbnail_url}
                alt={ep.title}
                className='w-40 h-24 object-cover rounded'
                onError={() => handleImgError(ep.episode_id)}
              />
            )}
            <span className='absolute bottom-1 right-1 bg-gray-700 text-xs text-white px-2 py-0.5 rounded'>
              {ep.duration_string}
            </span>
          </div>
          <div className='flex flex-col min-w-0 ml-6'>
            <div className='text-base font-medium text-gray-100 break-words'>{ep.title}</div>
            <div className='text-sm text-gray-400 mt-1 break-words'>
              {`${dayjs(ep.timestamp).format('YYYY/MM/DD HH:mm:ss (zzz)').replace('Japan Standard Time', 'JST')} (${dayjs(ep.timestamp).fromNow()})`}
            </div>
          </div>
        </Link>
      ))}
    </>
  )
}
