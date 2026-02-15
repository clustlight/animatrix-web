import type { Season } from '../../types'
import { MdEdit } from 'react-icons/md'
import { useEffect, useState } from 'react'

type SeasonTabsProps = {
  seasons: Season[]
  activeSeason: number
  onTabClick: (idx: number, seasonId: string) => void
  setEditSeasonId: (id: string) => void
  setEditSeasonTitle: (title: string) => void
  setEditSeasonModalOpen: (open: boolean) => void
  seriesPortraitUrl: string
}

export function SeasonTabs({
  seasons,
  activeSeason,
  onTabClick,
  setEditSeasonId,
  setEditSeasonTitle,
  setEditSeasonModalOpen,
  seriesPortraitUrl
}: SeasonTabsProps) {
  const [isMobile, setIsMobile] = useState(false)

  const buildPortraitUrl = (inputUrl: string) => {
    if (!inputUrl) return inputUrl
    if (inputUrl.includes('%2F')) {
      return inputUrl.replace(/%2F[^%/]+$/, '%2Fportrait.png')
    }
    return inputUrl.replace(/\/[^/]+$/, '/portrait.png')
  }

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (isMobile) {
    return (
      <div className='flex flex-col gap-2 mb-4 w-full'>
        <div className='flex flex-col gap-2 w-full'>
          <select
            className='w-full px-3 py-2 rounded font-semibold text-base bg-card text-card-foreground border border-border focus:outline-none focus:ring-2 focus:ring-ring/60'
            value={seasons[activeSeason]?.season_id}
            onChange={e => {
              const idx = seasons.findIndex(s => s.season_id === e.target.value)
              if (idx !== -1) onTabClick(idx, e.target.value)
            }}
          >
            {seasons.map(season => (
              <option key={season.season_id} value={season.season_id}>
                {season.season_title}
              </option>
            ))}
          </select>
          <button
            className='inline-flex items-center justify-center gap-2 px-3 py-2 rounded bg-secondary/70 text-secondary-foreground hover:bg-secondary transition-colors text-sm'
            title='シーズン名編集'
            onClick={() => {
              setEditSeasonId(seasons[activeSeason]?.season_id)
              setEditSeasonTitle(seasons[activeSeason]?.season_title)
              setEditSeasonModalOpen(true)
            }}
            type='button'
          >
            <MdEdit size={16} />
            編集
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='w-full'>
      <div className='flex items-center justify-between mb-2'>
        <div className='text-xs uppercase tracking-[0.2em] text-muted-foreground'>Seasons</div>
        <button
          className='text-muted-foreground hover:text-foreground flex items-center text-xs cursor-pointer'
          title='シーズン名編集'
          onClick={() => {
            setEditSeasonId(seasons[activeSeason]?.season_id)
            setEditSeasonTitle(seasons[activeSeason]?.season_title)
            setEditSeasonModalOpen(true)
          }}
          type='button'
          aria-label='シーズン名編集'
        >
          <MdEdit size={16} />
        </button>
      </div>
      <div className='flex gap-3 overflow-x-auto pb-1'>
        {seasons.map((season, idx) => {
          const seasonBaseUrl = season.thumbnail_url || seriesPortraitUrl
          const seasonThumbnailUrl = buildPortraitUrl(seasonBaseUrl)
          const isActive = idx === activeSeason
          return (
            <button
              key={season.season_id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm cursor-pointer min-w-45 transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground border-border shadow-sm'
                  : 'bg-card/60 text-muted-foreground border-border hover:bg-card'
              }`}
              onClick={() => onTabClick(idx, season.season_id)}
              title={season.season_title}
              type='button'
            >
              <img
                src={seasonThumbnailUrl}
                alt={season.season_title}
                className='w-10 h-14 object-cover rounded'
              />
              <span className='text-left line-clamp-2'>{season.season_title}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
