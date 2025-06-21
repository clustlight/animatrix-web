import { Link } from 'react-router'
import type { Episode, Season } from '~/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(relativeTime)
dayjs.locale('ja')
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(advancedFormat)

export function SeasonTabs({
  seasonList,
  selectedSeasonId,
  setSelectedSeasonId
}: {
  seasonList: Season[]
  selectedSeasonId: string
  setSelectedSeasonId: (id: string) => void
}) {
  return (
    <div className='flex gap-0 mb-1 flex-wrap'>
      {seasonList.map(season => (
        <button
          key={season.season_id}
          className={`px-2 py-2 rounded-t ${
            selectedSeasonId === season.season_id
              ? 'bg-blue-600 text-white font-bold'
              : 'bg-gray-700 text-gray-200'
          }`}
          onClick={() => setSelectedSeasonId(season.season_id)}
        >
          {season.season_title}
        </button>
      ))}
    </div>
  )
}

export function EpisodeList({
  episodeList,
  episodeData
}: {
  episodeList: Episode[]
  episodeData: Episode
}) {
  return (
    <div className='overflow-y-auto' style={{ maxHeight: '70vh' }}>
      {episodeList.map(ep => (
        <Link
          to={`/episode/${ep.episode_id}`}
          key={ep.episode_id}
          className={`flex items-center gap-2 p-2 rounded hover:bg-blue-900 transition ${
            ep.episode_id === episodeData.episode_id ? 'bg-blue-800' : ''
          }`}
        >
          <img
            src={ep.thumbnail_url || '/no-thumbnail.png'}
            alt={ep.title}
            // Make the thumbnail larger and keep 16:9 aspect ratio
            className='w-36 h-20 object-cover rounded' // 144x80px (16:9)
            style={{ aspectRatio: '16/9' }}
          />
          <div className='text-base font-semibold text-white truncate'>{ep.title}</div>
        </Link>
      ))}
    </div>
  )
}

export function EpisodeTimestamp({ timestamp }: { timestamp: string }) {
  return (
    <div className='text-xs sm:text-sm font-semibold text-white whitespace-nowrap'>
      {`${dayjs(timestamp).format('YYYY/MM/DD HH:mm:ss (zzz)').replace('Japan Standard Time', 'JST')} (${dayjs(timestamp).fromNow()})`}
    </div>
  )
}
