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
    return <div className='text-center text-muted-foreground'>No episodes available</div>
  }

  return (
    <div className='flex flex-col gap-3 pb-6'>
      {episodes.map(ep => (
        <Link
          key={ep.episode_id}
          to={`/episode/${ep.episode_id}`}
          className='flex items-center gap-3 bg-card/70 hover:bg-card border border-border rounded-lg px-3 py-3 transition-colors shadow-sm'
          style={{ maxWidth: '100%' }}
        >
          <div className='relative w-36 h-22 flex-shrink-0'>
            {imgErrorMap[ep.episode_id] || !ep.thumbnail_url ? (
              <NoImage width='w-36' height='h-22' />
            ) : (
              <img
                src={ep.thumbnail_url}
                alt={ep.title}
                className='w-36 h-22 object-cover rounded'
                onError={() => handleImgError(ep.episode_id)}
              />
            )}
            <span className='absolute bottom-1 right-1 bg-background/80 text-xs text-foreground px-2 py-0.5 rounded border border-border'>
              {ep.duration_string}
            </span>
          </div>
          <div className='flex flex-col min-w-0'>
            <div className='text-sm font-semibold text-foreground break-words leading-snug'>
              {ep.title}
            </div>
            <div className='text-xs text-muted-foreground mt-1 break-words'>
              {`${dayjs(ep.timestamp).format('YYYY/MM/DD HH:mm:ss (zzz)').replace('Japan Standard Time', 'JST')} (${dayjs(ep.timestamp).fromNow()})`}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
