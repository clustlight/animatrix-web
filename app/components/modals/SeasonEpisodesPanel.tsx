import type { Episode } from '../../types'
import { EpisodeMetadataRow } from './EpisodeMetadataRow'

export function SeasonEpisodesPanel({
  episodes,
  onSave,
  onDelete,
  deletingEpisodeId
}: {
  episodes: Episode[]
  onSave?: (episodeId: string, changes: { title: string; timestamp: string }) => Promise<void>
  onDelete?: (episodeId: string, title?: string) => void
  deletingEpisodeId: string | null
}) {
  return (
    <section className='mt-4 min-h-0'>
      <h3 className='mb-2 text-sm font-semibold'>エピソード情報</h3>
      <ul className='max-h-[32vh] overflow-y-auto pr-1'>
        {episodes.length === 0 ? (
          <li className='py-2 text-center text-muted-foreground'>エピソードがありません</li>
        ) : (
          episodes.map(episode => (
            <li key={episode.episode_id} className='mb-1'>
              <EpisodeMetadataRow
                episode={episode}
                onSave={onSave}
                onDelete={() => onDelete?.(episode.episode_id, episode.title)}
                deleting={deletingEpisodeId === episode.episode_id}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
