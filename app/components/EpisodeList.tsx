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
          className='group relative flex items-center gap-4 bg-card/70 rounded-lg px-3 py-3 transition-transform transform hover:-translate-y-0.5 hover:shadow-lg hover:z-10 border border-transparent hover:border-primary/30'
          style={{ maxWidth: '100%' }}
        >
          <div className='relative w-40 h-24 flex-shrink-0 overflow-hidden rounded-md'>
            {imgErrorMap[ep.episode_id] || !ep.thumbnail_url ? (
              <NoImage width='w-40' height='h-24' />
            ) : (
              <img
                src={ep.thumbnail_url}
                alt={ep.title}
                className='w-40 h-24 object-cover rounded-md transition-transform group-hover:scale-105'
                onError={() => handleImgError(ep.episode_id)}
              />
            )}

            <span
              className='absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded border'
              style={{
                backgroundColor: 'rgba(0,0,0,0.65)',
                color: '#ffffff',
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.18)'
              }}
            >
              {ep.duration_string}
            </span>
          </div>

          <div className='flex flex-col min-w-0'>
            <div className='text-sm sm:text-base font-semibold text-foreground break-words leading-tight'>
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
