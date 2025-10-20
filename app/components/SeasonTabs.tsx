import type { Season } from '../types'
import type { RefObject } from 'react'
import { MdChevronLeft, MdChevronRight, MdEdit } from 'react-icons/md'

type SeasonTabsProps = {
  seasons: Season[]
  activeSeason: number
  onTabClick: (idx: number, seasonId: string) => void
  tabListRef: RefObject<HTMLDivElement | null>
  scrollTabs: (dir: 'left' | 'right') => void
  setEditSeasonId: (id: string) => void
  setEditSeasonTitle: (title: string) => void
  setEditSeasonModalOpen: (open: boolean) => void
}

export function SeasonTabs({
  seasons,
  activeSeason,
  onTabClick,
  tabListRef,
  scrollTabs,
  setEditSeasonId,
  setEditSeasonTitle,
  setEditSeasonModalOpen
}: SeasonTabsProps) {
  return (
    <div className='relative mb-6'>
      {seasons.length > 3 && (
        <button
          type='button'
          className='absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow transition-colors'
          onClick={() => scrollTabs('left')}
          aria-label='scroll left'
        >
          <MdChevronLeft size={24} color='#fff' />
        </button>
      )}
      <div
        ref={tabListRef}
        className='flex gap-1 border-b overflow-x-auto scrollbar-hide px-4'
        style={{ scrollBehavior: 'smooth' }}
      >
        {seasons.map((season, idx) => {
          const len = season.season_title.length
          const fontSizeClass = len > 16 ? 'text-xs' : len > 10 ? 'text-sm' : 'text-base'
          return (
            <div key={season.season_id} className='relative flex items-center'>
              <button
                className={`px-4 py-2 font-semibold border-b-2 max-w-[8rem] break-words text-center whitespace-pre-line cursor-pointer ${fontSizeClass} ${
                  idx === activeSeason
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500'
                }`}
                onClick={() => onTabClick(idx, season.season_id)}
                title={season.season_title}
              >
                {season.season_title}
              </button>
              <button
                className='ml-0.5 text-gray-400 hover:text-blue-500 cursor-pointer'
                title='シーズン名編集'
                onClick={() => {
                  setEditSeasonId(season.season_id)
                  setEditSeasonTitle(season.season_title)
                  setEditSeasonModalOpen(true)
                }}
                style={{ fontSize: 14 }}
                type='button'
              >
                <MdEdit size={16} />
              </button>
            </div>
          )
        })}
      </div>
      {seasons.length > 3 && (
        <button
          type='button'
          className='absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gray-800 bg-opacity-80 hover:bg-opacity-100 rounded-full p-1 shadow transition-colors'
          onClick={() => scrollTabs('right')}
          aria-label='scroll right'
        >
          <MdChevronRight size={24} color='#fff' />
        </button>
      )}
    </div>
  )
}
