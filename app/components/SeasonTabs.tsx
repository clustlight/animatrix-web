import type { Season } from '../types'
import { MdEdit, MdChevronLeft, MdChevronRight } from 'react-icons/md'
import { useEffect, useRef, useState } from 'react'

type SeasonTabsProps = {
  seasons: Season[]
  activeSeason: number
  onTabClick: (idx: number, seasonId: string) => void
  setEditSeasonId: (id: string) => void
  setEditSeasonTitle: (title: string) => void
  setEditSeasonModalOpen: (open: boolean) => void
  portraitUrl: string
}

function getSeasonPortraitUrl(seriesPortraitUrl: string, seasonId: string) {
  const seasonPrefix = seasonId.replace(/_[^_]+$/, '')
  return seriesPortraitUrl.replace(/\/([^/]+)\/portrait\.png$/, `/${seasonPrefix}/portrait.png`)
}

export function SeasonTabs({
  seasons,
  activeSeason,
  onTabClick,
  setEditSeasonId,
  setEditSeasonTitle,
  setEditSeasonModalOpen,
  portraitUrl
}: SeasonTabsProps) {
  const [isMobile, setIsMobile] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: dir === 'left' ? -120 : 120,
        behavior: 'smooth'
      })
    }
  }

  if (isMobile) {
    return (
      <div className='flex flex-col gap-2 mb-6 items-center w-full'>
        <div className='flex w-full max-w-[220px]'>
          <select
            className='flex-1 px-2 py-2 rounded font-semibold text-base bg-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400'
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
            className='ml-2 text-gray-400 hover:text-blue-500 flex items-center'
            title='シーズン名編集'
            onClick={() => {
              setEditSeasonId(seasons[activeSeason]?.season_id)
              setEditSeasonTitle(seasons[activeSeason]?.season_title)
              setEditSeasonModalOpen(true)
            }}
            type='button'
          >
            <MdEdit size={18} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex items-center gap-2 mb-6 w-full justify-center'>
      <button
        className='p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center cursor-pointer'
        onClick={() => scroll('left')}
        type='button'
      >
        <MdChevronLeft size={28} />
      </button>
      <div
        ref={scrollRef}
        className='flex gap-3 overflow-x-auto px-2'
        style={{
          scrollBehavior: 'smooth',
          maxWidth: '600px',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        <style>
          {`
            div[ref]::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        {seasons.map((season, idx) => {
          const seasonPortraitUrl = getSeasonPortraitUrl(portraitUrl, season.season_id)
          return (
            <div key={season.season_id} className='flex flex-col items-center'>
              <div className='relative'>
                <button
                  className={`px-2 py-1 rounded font-semibold flex flex-col items-center gap-1 cursor-pointer relative ${
                    idx === activeSeason
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                  onClick={() => onTabClick(idx, season.season_id)}
                  title={season.season_title}
                  type='button'
                  style={{ minWidth: '5rem', maxWidth: '10rem' }}
                >
                  <img
                    src={seasonPortraitUrl}
                    alt={season.season_title}
                    className='w-20 h-28 object-cover rounded blur-xs'
                    style={{ minWidth: '5rem', minHeight: '7rem' }}
                  />
                  <span
                    className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs font-bold max-w-[7rem] text-center pointer-events-none'
                    style={{
                      textShadow: '0 0 32px #000, 0 0 24px #000, 0 2px 12px #000, 0 0 2px #000'
                    }}
                  >
                    {season.season_title}
                  </span>
                </button>
              </div>
              <button
                className='mt-1 text-blue-400 hover:text-blue-600 flex items-center cursor-pointer'
                title='シーズン名編集'
                onClick={() => {
                  setEditSeasonId(season.season_id)
                  setEditSeasonTitle(season.season_title)
                  setEditSeasonModalOpen(true)
                }}
                type='button'
              >
                <MdEdit size={15} />
              </button>
            </div>
          )
        })}
      </div>
      <button
        className='p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center cursor-pointer'
        onClick={() => scroll('right')}
        type='button'
      >
        <MdChevronRight size={28} />
      </button>
    </div>
  )
}
