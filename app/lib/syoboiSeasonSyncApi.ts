import type { Episode, Season } from '../types'
import { getApiBaseUrl } from './config'
import {
  fetchSyoboi,
  findProgram,
  mergeDescriptions,
  titleScore,
  toNumber
} from './syoboiSeasonSync'
import type { Program, ProgramResponse, TitleResponse, TitleResult } from './syoboiSeasonSync'

async function fetchSeason(seasonId: string): Promise<Season> {
  const baseUrl = await getApiBaseUrl()
  const response = await fetch(`${baseUrl}/v1/season/${seasonId}`)
  if (!response.ok) throw new Error(`API error: ${response.status}`)
  return response.json()
}

export async function searchSyoboiTitles(keyword: string): Promise<TitleResult[]> {
  const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodeURIComponent(keyword)}&Limit=30`
  const data = await fetchSyoboi<TitleResponse>(url)
  return Object.values(data.Titles ?? {})
    .map(item => {
      const result: TitleResult = {
        tid: Number(item.TID),
        title: item.Title ?? '',
        titleYomi: item.TitleYomi ?? '',
        titleEn: item.TitleEN ?? '',
        firstYear: toNumber(item.FirstYear),
        firstMonth: toNumber(item.FirstMonth),
        firstEndYear: toNumber(item.FirstEndYear),
        firstEndMonth: toNumber(item.FirstEndMonth),
        firstCh: item.FirstCh ?? '',
        score: 0
      }
      return { ...result, score: titleScore(keyword, result) }
    })
    .filter(item => Number.isFinite(item.tid))
    .sort((a, b) => b.score - a.score || b.firstYear - a.firstYear)
}

export async function applySyoboiTitle(seasonId: string, selected: TitleResult): Promise<Season> {
  const detail = await fetchSyoboi<TitleResponse>(
    `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${selected.tid}`
  )
  const item = detail.Titles?.[String(selected.tid)]
  const baseUrl = await getApiBaseUrl()
  const response = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      season_title: selected.title,
      shoboi_tid: selected.tid,
      description: item?.Comment ?? '',
      first_year: toNumber(item?.FirstYear) || selected.firstYear,
      first_month: toNumber(item?.FirstMonth) || selected.firstMonth,
      first_end_year: toNumber(item?.FirstEndYear) || selected.firstEndYear,
      first_end_month: toNumber(item?.FirstEndMonth) || selected.firstEndMonth
    })
  })
  if (!response.ok) throw new Error('情報の反映に失敗しました')
  return fetchSeason(seasonId)
}

export async function appendSyoboiTitle(seasonId: string, selected: TitleResult): Promise<Season> {
  const detail = await fetchSyoboi<TitleResponse>(
    `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${selected.tid}`
  )
  const item = detail.Titles?.[String(selected.tid)]
  const current = await fetchSeason(seasonId)
  const baseUrl = await getApiBaseUrl()
  const response = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      description:
        mergeDescriptions(current.description ?? '', (item?.Comment ?? '').trim()) || undefined,
      first_end_year: toNumber(item?.FirstEndYear) || selected.firstEndYear || undefined,
      first_end_month: toNumber(item?.FirstEndMonth) || selected.firstEndMonth || undefined
    })
  })
  if (!response.ok) throw new Error('追記に失敗しました')
  return fetchSeason(seasonId)
}

export async function syncSyoboiEpisodeSchedule({
  tid,
  seasonId,
  episodes,
  startEpisodeNumber,
  onProgress
}: {
  tid: number
  seasonId: string
  episodes: Episode[]
  startEpisodeNumber: number
  onProgress: (progress: number) => void
}) {
  const baseUrl = await getApiBaseUrl()
  let updatedCount = 0
  let missingProgramCount = 0
  let failedUpdateCount = 0
  const missingMappings: string[] = []
  const eligibleEpisodes = episodes.filter(
    episode => episode.episode_number >= startEpisodeNumber && episode.episode_number > 0
  )
  if (eligibleEpisodes.length === 0) {
    throw new Error('指定した開始話数以降に転写できるエピソードがありません')
  }

  for (const [index, episode] of eligibleEpisodes.entries()) {
    onProgress(Math.round(((index + 1) / eligibleEpisodes.length) * 100))
    const relativeCount = episode.episode_number - startEpisodeNumber + 1
    const counts = [...new Set([episode.episode_number, relativeCount])]
    let program: Program | null = null
    for (const count of counts) {
      const data = await fetchSyoboi<ProgramResponse>(
        `https://cal.syoboi.jp/json.php?Req=ProgramByCount&TID=${tid}&Count=${count}`
      )
      program = findProgram(data, count)
      if (program?.StTime) break
    }
    if (!program?.StTime) {
      missingProgramCount += 1
      missingMappings.push(`${episode.episode_number}→${counts.join('/')}`)
      continue
    }

    const payload: { timestamp: string; description?: string } = {
      timestamp: new Date(Number(program.StTime) * 1000).toISOString()
    }
    const description = (program.ProgComment ?? '').trim() || (program.SubTitle ?? '').trim()
    if (description) payload.description = description
    const response = await fetch(`${baseUrl}/v1/episode/${episode.episode_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (response.ok) updatedCount += 1
    else failedUpdateCount += 1
  }

  const refreshed = await fetch(`${baseUrl}/v1/season/${seasonId}`)
  const season = refreshed.ok ? ((await refreshed.json()) as Season) : undefined
  const missingMappingsLabel = missingMappings.length
    ? `, 取得できなかった内部話数→照会Count: ${missingMappings.join(', ')}`
    : ''
  const summary = `対象${eligibleEpisodes.length}話中${updatedCount}件を転写しました（放送情報なし: ${missingProgramCount}件、更新失敗: ${failedUpdateCount}件。TID: ${tid}、内部開始話数: ${startEpisodeNumber}${missingMappingsLabel}）`
  return { season, updatedCount, summary }
}
