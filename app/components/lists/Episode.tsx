import { Link } from 'react-router'
import type { Episode, Season } from '~/types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { useState } from 'react'
import { MdArrowDropDown } from 'react-icons/md'
import { NoImage } from '../images/NoImage'

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
    <div className='mb-2 flex justify-center'>
      <div className='relative inline-flex items-center'>
        <select
          className='appearance-none px-4 py-2 pr-10 rounded-full bg-card text-foreground font-semibold cursor-pointer border border-border shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 hover:border-primary/50 hover:bg-card/80'
          value={selectedSeasonId}
          onChange={e => setSelectedSeasonId(e.target.value)}
          tabIndex={-1}
        >
          {seasonList.map(season => (
            <option
              key={season.season_id}
              value={season.season_id}
              style={{
                backgroundColor: 'var(--card)',
                color: 'var(--card-foreground)',
                fontSize: '1rem',
                padding: '0.5rem 1rem'
              }}
            >
              {season.season_title}
            </option>
          ))}
        </select>
        <MdArrowDropDown
          size={22}
          className='pointer-events-none absolute right-3 text-muted-foreground'
        />
      </div>
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
      className='overflow-y-auto max-h-[70vh] rounded-xl border border-border bg-card/70 p-2 sm:p-3 space-y-2'
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)'
      }}
    >
      <style>
        {`
          .overflow-y-auto::-webkit-scrollbar {
            width: 8px;
            background: var(--scrollbar-track);
          }
          .overflow-y-auto::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
          }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
          }
          .overflow-y-auto::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
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
  const [imgError, setImgError] = useState(false)
  return (
    <Link
      to={`/episode/${episode.episode_id}`}
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
        isActive
          ? 'bg-primary/15 border-primary/40 ring-1 ring-primary/20'
          : 'border-transparent hover:border-primary/40 hover:bg-muted/60'
      }`}
    >
      {imgError || !episode.thumbnail_url ? (
        <NoImage width='w-12 sm:w-16 md:w-20' height='h-7 sm:h-9 md:h-11' />
      ) : (
        <img
          src={episode.thumbnail_url}
          alt={episode.title}
          className='w-12 h-7 sm:w-16 sm:h-9 md:w-20 md:h-11 object-cover rounded-md border border-border shadow-sm'
          style={{ aspectRatio: '16/9' }}
          onError={() => setImgError(true)}
        />
      )}
      <div className='min-w-0 flex-1'>
        <div className='text-[12px] sm:text-[15px] lg:text-sm xl:text-sm font-semibold text-foreground text-wrap leading-snug'>
          {episode.title}
        </div>
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
    <div className='text-xs sm:text-sm font-semibold text-muted-foreground whitespace-nowrap'>
      {formatTimestamp(timestamp)}
    </div>
  )
}
