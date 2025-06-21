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
        <EpisodeListItem
          key={ep.episode_id}
          episode={ep}
          isActive={ep.episode_id === episodeData.episode_id}
        />
      ))}
    </div>
  )
}

function EpisodeListItem({ episode, isActive }: { episode: Episode; isActive: boolean }) {
  return (
    <Link
      to={`/episode/${episode.episode_id}`}
      className={`flex items-center gap-2 px-4 py-3 rounded hover:bg-blue-900 transition ${
        isActive ? 'bg-blue-800' : ''
      }`}
    >
      <img
        src={episode.thumbnail_url || '/no-thumbnail.png'}
        alt={episode.title}
        className='w-12 h-7 sm:w-16 sm:h-9 md:w-20 md:h-11 object-cover rounded'
        style={{ aspectRatio: '16/9' }}
      />
      <div className='text-[11px] sm:text-[15px] lg:text-sm xl:text-sm font-semibold text-white text-wrap'>
        {episode.title}
      </div>
    </Link>
  )
}

function formatTimestamp(timestamp: string) {
  return `${dayjs(timestamp)
    .format('YYYY/MM/DD HH:mm:ss (zzz)')
    .replace('Japan Standard Time', 'JST')} (${dayjs(timestamp).fromNow()})`
}

export function EpisodeTimestamp({ timestamp }: { timestamp: string }) {
  return (
    <div className='text-xs sm:text-sm font-semibold text-gray-400 whitespace-nowrap'>
      {formatTimestamp(timestamp)}
    </div>
  )
}
