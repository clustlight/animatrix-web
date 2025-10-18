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
    <div className='mb-2 flex justify-center mt-4'>
      <select
        className='px-3 py-2 rounded bg-gray-700 text-white font-semibold outline-none focus:outline-none'
        value={selectedSeasonId}
        onChange={e => setSelectedSeasonId(e.target.value)}
        tabIndex={-1}
        style={{
          fontSize: '1rem',
          backgroundColor: '#374151',
          color: '#fff'
        }}
      >
        {seasonList.map(season => (
          <option
            key={season.season_id}
            value={season.season_id}
            style={{
              backgroundColor: '#1e293b',
              color: '#fff',
              fontSize: '1rem',
              padding: '0.5rem 1rem'
            }}
          >
            {season.season_title}
          </option>
        ))}
      </select>
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
    <div
      className='overflow-y-auto mt-4 max-h-[70vh]'
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#2563eb #1e293b'
      }}
    >
      <style>
        {`
          .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
            background: #1e293b;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: #2563eb;
            border-radius: 4px;
          }
          .overflow-y-auto::-webkit-scrollbar-track {
            background: #1e293b;
          }
        `}
      </style>
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
      className={`flex items-center gap-2 px-4 py-3 rounded hover:bg-blue-900 transition ${isActive ? 'bg-blue-800' : ''}`}
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
