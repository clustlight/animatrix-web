import { useEffect, useState } from 'react'
import { useToast } from '../providers/ToastProvider'
import type { Episode, Season, SeasonMetadata } from '../../types'
import { useSyoboiSeasonSync } from '../../hooks/useSyoboiSeasonSync'
import { SyoboiSeasonSyncPanel } from './SyoboiSeasonSyncPanel'
import { SeasonMetadataForm } from './SeasonMetadataForm'
import { SeasonEpisodesPanel } from './SeasonEpisodesPanel'

type EditSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  initialTitle: string
  initialSeason?: Season
  seriesTitle: string
  onSave: (seasonId: string, changes: SeasonMetadata) => Promise<void>
  episodes?: Episode[]
  onDeleteEpisode?: (episodeId: string, episodeTitle?: string) => Promise<void>
  onUpdateEpisode?: (
    episodeId: string,
    changes: { title: string; timestamp: string }
  ) => Promise<void>
  onSeasonSynced?: (seasonId: string, updatedSeason: Season) => void
  shoboiTid?: number
}

type EditPanel = 'season' | 'syoboi'

function getSeasonMetadata(season?: Season): SeasonMetadata {
  return {
    season_title: season?.season_title ?? '',
    season_title_yomi: season?.season_title_yomi ?? '',
    season_number: season?.season_number ?? 0,
    shoboi_tid: season?.shoboi_tid ?? 0,
    description: season?.description ?? '',
    first_year: season?.first_year ?? 0,
    first_month: season?.first_month ?? 0,
    first_end_year: season?.first_end_year ?? 0,
    first_end_month: season?.first_end_month ?? 0
  }
}

export function EditSeasonModal({
  open,
  onClose,
  seasonId,
  initialTitle,
  initialSeason,
  seriesTitle,
  onSave,
  episodes = [],
  onDeleteEpisode,
  onUpdateEpisode,
  onSeasonSynced,
  shoboiTid
}: EditSeasonModalProps) {
  const [activePanel, setActivePanel] = useState<EditPanel>('season')
  const [metadata, setMetadata] = useState(() => getSeasonMetadata(initialSeason))
  const [loading, setLoading] = useState(false)
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    setMetadata(getSeasonMetadata(initialSeason))
  }, [initialSeason, open])

  useEffect(() => {
    if (open) setActivePanel('season')
  }, [open])

  const updateMetadata = <K extends keyof SeasonMetadata>(key: K, value: SeasonMetadata[K]) => {
    setMetadata(previous => ({ ...previous, [key]: value }))
  }

  const syoboiSync = useSyoboiSeasonSync({
    open,
    seasonId,
    initialTitle,
    episodes,
    shoboiTid,
    onSeasonSynced,
    onTitleChange: title => updateMetadata('season_title', title)
  })

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(seasonId, metadata)
      showToast('シーズン情報を更新しました', 'success')
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : 'シーズン情報の更新に失敗しました',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEpisode = async (episodeId: string, episodeTitle?: string) => {
    if (!onDeleteEpisode) return
    setDeletingEpisodeId(episodeId)
    try {
      await onDeleteEpisode(episodeId, episodeTitle)
    } catch (cause) {
      showToast(cause instanceof Error ? cause.message : 'エピソードの削除に失敗しました', 'error')
    } finally {
      setDeletingEpisodeId(null)
    }
  }

  if (!open) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3'
      onMouseDown={event => {
        if (event.target === event.currentTarget && !loading) onClose()
      }}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-labelledby='edit-season-title'
        className='flex max-h-[92vh] min-h-0 min-w-0 w-full max-w-300 flex-col overflow-hidden rounded border border-border bg-card p-4 text-card-foreground shadow-lg sm:p-6'
      >
        <h2 id='edit-season-title' className='mb-4 shrink-0 text-lg font-bold'>
          シーズン設定
        </h2>
        <div
          role='tablist'
          aria-label='編集パネル'
          className='mb-3 grid shrink-0 grid-cols-2 gap-2 lg:hidden'
        >
          <PanelTab active={activePanel === 'season'} onClick={() => setActivePanel('season')}>
            シーズン情報
          </PanelTab>
          <PanelTab active={activePanel === 'syoboi'} onClick={() => setActivePanel('syoboi')}>
            しょぼかる連携
          </PanelTab>
        </div>

        <div className='grid min-h-0 flex-1 gap-5 lg:grid-cols-2'>
          <div
            role='tabpanel'
            className={`${activePanel === 'season' ? 'flex' : 'hidden'} min-h-0 flex-col overflow-y-auto lg:flex`}
          >
            <SeasonMetadataForm
              metadata={metadata}
              onChange={updateMetadata}
              onSave={handleSave}
              loading={loading}
            />
          </div>
          <div
            role='tabpanel'
            className={`${activePanel === 'syoboi' ? 'block' : 'hidden'} min-h-0 overflow-y-auto lg:block`}
          >
            <SyoboiSeasonSyncPanel
              sync={syoboiSync}
              seriesTitle={seriesTitle}
              episodes={episodes}
            />
            <SeasonEpisodesPanel
              episodes={episodes}
              onSave={onUpdateEpisode}
              onDelete={handleDeleteEpisode}
              deletingEpisodeId={deletingEpisodeId}
            />
          </div>
        </div>

        <div className='mt-4 flex shrink-0 justify-end border-t border-border pt-3'>
          <button
            type='button'
            className='cursor-pointer rounded bg-secondary px-4 py-2 text-secondary-foreground hover:bg-secondary/80'
            onClick={onClose}
            disabled={loading}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}

function PanelTab({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type='button'
      role='tab'
      aria-selected={active}
      onClick={onClick}
      className={`rounded border px-3 py-2 text-sm ${
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-secondary text-secondary-foreground'
      }`}
    >
      {children}
    </button>
  )
}
