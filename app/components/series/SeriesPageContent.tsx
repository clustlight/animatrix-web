import type { Dispatch, SetStateAction } from 'react'
import type { Season } from '../../types'
import { EpisodeList } from '../lists/EpisodeList'
import { SeasonTabs } from '../tabs/SeasonTabs'
import { SeriesHeader } from '../headers/SeriesHeader'
import { SeasonDescription } from './SeasonDescription'

export function SeriesPageContent({
  seasons,
  activeSeason,
  activeSeasonData,
  totalEpisodes,
  seasonPeriod,
  activePortraitUrl,
  seriesTitle,
  seriesPortraitUrl,
  editing,
  title,
  setTitle,
  editLoading,
  setEditing,
  onTitleSave,
  onDeleteClick,
  deleteLoading,
  onMoveClick,
  moveLoading,
  onTabClick,
  onEditSeason
}: {
  seasons: Season[]
  activeSeason: number
  activeSeasonData?: Season
  totalEpisodes: number
  seasonPeriod: string
  activePortraitUrl: string
  seriesTitle: string
  seriesPortraitUrl: string
  editing: boolean
  title: string
  setTitle: Dispatch<SetStateAction<string>>
  editLoading: boolean
  setEditing: Dispatch<SetStateAction<boolean>>
  onTitleSave: () => void
  onDeleteClick: () => void
  deleteLoading: boolean
  onMoveClick: () => void
  moveLoading: boolean
  onTabClick: (index: number, seasonId: string) => void
  onEditSeason: (season: Season) => void
}) {
  const currentSeason = seasons[activeSeason]
  return (
    <div className='w-full max-w-none px-4 sm:px-6 lg:px-12 xl:px-16 h-[calc(100vh-7rem)] overflow-hidden'>
      <div className='grid h-full gap-5 md:gap-8 lg:gap-10 lg:grid-cols-[0.9fr_1.1fr] overflow-y-auto'>
        <div className='flex flex-col gap-4 lg:overflow-y-auto lg:pr-6 min-w-0'>
          <SeriesHeader
            editing={editing}
            title={title}
            setTitle={setTitle}
            editLoading={editLoading}
            setEditing={setEditing}
            handleTitleSave={onTitleSave}
            totalSeasons={seasons.length}
            totalEpisodes={totalEpisodes}
            onDeleteClick={onDeleteClick}
            deleteLoading={deleteLoading}
            onMoveClick={onMoveClick}
            moveLoading={moveLoading}
            portraitUrl={activePortraitUrl}
            originalTitle={seriesTitle}
          />
          <SeasonTabs
            seasons={seasons}
            activeSeason={activeSeason}
            onTabClick={onTabClick}
            onEditSeason={onEditSeason}
            seriesPortraitUrl={seriesPortraitUrl}
          />
          {activeSeasonData && (
            <SeasonDescription
              seasonId={activeSeasonData.season_id}
              title={activeSeasonData.season_title}
              description={activeSeasonData.description ?? ''}
              period={seasonPeriod}
              shoboiTid={activeSeasonData.shoboi_tid}
            />
          )}
        </div>
        <div className='flex flex-col min-h-0 mt-6 md:mt-0 md:pl-6 min-w-0'>
          <div className='w-full'>
            <div className='flex items-center justify-between pb-3 mb-3 border-b border-border'>
              <div className='text-sm uppercase tracking-[0.25em] text-muted-foreground'>
                Episodes
              </div>
              <div className='text-xs text-muted-foreground'>
                {currentSeason?.episodes?.length ?? 0} 件
              </div>
            </div>
          </div>
          <div className='w-full lg:h-full lg:overflow-y-auto pr-2 min-w-0s'>
            <EpisodeList episodes={currentSeason?.episodes ?? []} />
          </div>
        </div>
      </div>
    </div>
  )
}
