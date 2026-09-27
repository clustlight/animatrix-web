import { useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { Season } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { useToast } from '../components/providers/ToastProvider'

export function useEpisodeActions({
  editSeasonId,
  setSeasons
}: {
  editSeasonId: string | null
  setSeasons: Dispatch<SetStateAction<Season[]>>
}) {
  const { showToast } = useToast()
  const deleteEpisode = useCallback(
    async (episodeId: string, episodeTitle?: string) => {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/episode/${episodeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) showToast('エピソード削除に失敗しました', 'error')
      setSeasons(previous =>
        previous.map(season =>
          season.season_id === editSeasonId
            ? {
                ...season,
                episodes: season.episodes?.filter(episode => episode.episode_id !== episodeId) ?? []
              }
            : season
        )
      )
      showToast(`${episodeTitle ?? ''} を削除しました`, 'success')
    },
    [editSeasonId, setSeasons, showToast]
  )

  const seasonSynced = useCallback(
    (seasonId: string, updatedSeason: Season) => {
      setSeasons(previous =>
        previous.map(season =>
          season.season_id === seasonId
            ? { ...season, ...updatedSeason, episodes: updatedSeason.episodes ?? season.episodes }
            : season
        )
      )
    },
    [setSeasons]
  )

  const updateEpisode = useCallback(
    async (episodeId: string, changes: { title: string; timestamp: string }) => {
      const baseUrl = await getApiBaseUrl()
      const response = await fetch(`${baseUrl}/v1/episode/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      })
      if (!response.ok) throw new Error(`API error: ${response.status}`)
      setSeasons(previous =>
        previous.map(season => ({
          ...season,
          episodes: season.episodes?.map(episode =>
            episode.episode_id === episodeId ? { ...episode, ...changes } : episode
          )
        }))
      )
    },
    [setSeasons]
  )
  return { deleteEpisode, seasonSynced, updateEpisode }
}
