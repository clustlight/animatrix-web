import { useCallback, useEffect, useState } from 'react'
import type { Episode, Season } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { useToast } from '../components/providers/ToastProvider'

type TitleItem = {
  TID: string
  Title: string
  TitleYomi?: string
  TitleEN?: string
  FirstYear?: string
  FirstMonth?: string
  FirstEndYear?: string
  FirstEndMonth?: string
  FirstCh?: string
  Comment?: string
}
type TitleResponse = { Titles?: Record<string, TitleItem> }
type Program = {
  Count?: string | number
  StTime?: string | number
  SubTitle?: string
  ProgComment?: string
}
type ProgramResponse = { Programs?: Record<string, Program> | Program[] }
type TitleResult = {
  tid: number
  title: string
  titleYomi: string
  titleEn: string
  firstYear: number
  firstMonth: number
  firstEndYear: number
  firstEndMonth: number
  firstCh: string
  score: number
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s\u3000\-_.!・()\[\]{}'">]/g, '')
}

function titleScore(query: string, result: TitleResult) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return 0
  return [result.title, result.titleYomi, result.titleEn]
    .map(normalize)
    .reduce((score, candidate) => {
      if (!candidate) return score
      if (candidate === normalizedQuery) return score + 5
      if (candidate.includes(normalizedQuery)) return score + 3
      if (normalizedQuery.includes(candidate)) return score + 1
      return score
    }, 0)
}

function toNumber(value?: string) {
  return value ? Number(value) : 0
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Syoboi API error: ${response.status}`)
  return response.json()
}

function fetchJsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `syoboiJsonp_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const jsonpWindow = window as unknown as Window & Record<string, (data: T) => void>
    const script = document.createElement('script')
    const cleanup = () => {
      delete jsonpWindow[callbackName]
      script.remove()
    }
    jsonpWindow[callbackName] = data => {
      cleanup()
      resolve(data)
    }
    script.onerror = () => {
      cleanup()
      reject(new Error('Syoboi JSONP error'))
    }
    script.src = url.includes('callback=')
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`
    document.body.appendChild(script)
  })
}

async function fetchSyoboi<T>(url: string) {
  try {
    return await fetchJson<T>(url)
  } catch {
    return fetchJsonp<T>(url)
  }
}

function findProgram(data: ProgramResponse, expectedCount: number): Program | null {
  if (!data.Programs) return null
  const allPrograms = Array.isArray(data.Programs) ? data.Programs : Object.values(data.Programs)
  const candidates = allPrograms.filter(program => {
    const startTime = Number(program.StTime)
    return program.StTime !== undefined && Number.isFinite(startTime) && startTime > 0
  })
  const matchingCount = candidates.find(program => Number(program.Count) === expectedCount)
  if (matchingCount) return matchingCount
  return candidates.some(program => program.Count !== undefined) ? null : (candidates[0] ?? null)
}

type Section = { title: string | null; body: string[] }
function splitSections(value: string): Section[] {
  const sections: Section[] = []
  let current: Section = { title: null, body: [] }
  const pushCurrent = () => {
    if (current.title || current.body.length) sections.push(current)
  }
  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trimEnd()
    if (!line) current.body.push('')
    else if (line.startsWith('*') && !line.startsWith('**')) {
      pushCurrent()
      current = { title: line.slice(1).trim() || null, body: [] }
    } else current.body.push(line)
  }
  pushCurrent()
  return sections
}

function mergeDescriptions(baseText: string, appendText: string) {
  if (!baseText.trim()) return appendText.trim()
  if (!appendText.trim()) return baseText.trim()
  const merged = new Map<string, Section>()
  const order: string[] = []
  const keyFor = (title: string | null) => (title ? `title:${title}` : 'title:__untitled')
  const addSection = (section: Section) => {
    const key = keyFor(section.title)
    const target = merged.get(key)
    if (!target) {
      merged.set(key, { title: section.title, body: [...section.body] })
      order.push(key)
      return
    }
    const deduplicate = Boolean(
      target.title && (target.title.includes('スタッフ') || target.title.includes('キャスト'))
    )
    if (deduplicate) {
      const existing = new Set(target.body.map(line => line.trim()))
      for (const line of section.body) {
        const trimmed = line.trim()
        if (!trimmed || existing.has(trimmed)) continue
        existing.add(trimmed)
        target.body.push(line)
      }
    } else {
      if (target.body.length && target.body[target.body.length - 1].trim()) target.body.push('')
      target.body.push(...section.body)
    }
  }
  splitSections(baseText).forEach(addSection)
  splitSections(appendText).forEach(addSection)
  return order
    .map(key => {
      const section = merged.get(key)
      if (!section) return ''
      return [section.title ? `*${section.title}` : '', ...section.body]
        .filter((line, index) => index || line)
        .join('\n')
        .trimEnd()
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

export function useSyoboiSeasonSync({
  open,
  seasonId,
  initialTitle,
  episodes,
  shoboiTid,
  onSeasonSynced,
  onTitleChange
}: {
  open: boolean
  seasonId: string
  initialTitle: string
  episodes: Episode[]
  shoboiTid?: number
  onSeasonSynced?: (seasonId: string, updatedSeason: Season) => void
  onTitleChange: (title: string) => void
}) {
  const [query, setQuery] = useState(initialTitle)
  const [results, setResults] = useState<TitleResult[]>([])
  const [selected, setSelected] = useState<TitleResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [appendLoading, setAppendLoading] = useState(false)
  const [episodeLoading, setEpisodeLoading] = useState(false)
  const [episodeProgress, setEpisodeProgress] = useState(0)
  const [startEpisodeNumber, setStartEpisodeNumber] = useState(1)
  const { showToast } = useToast()

  useEffect(() => {
    setQuery(initialTitle)
    setResults([])
    setSelected(null)
    setError(null)
    setSearched(false)
  }, [initialTitle, open])

  const search = useCallback(
    async (value?: string) => {
      const keyword = (value ?? query).trim()
      if (!keyword) {
        setSearched(false)
        return
      }
      setSearched(true)
      setLoading(true)
      setError(null)
      setResults([])
      setSelected(null)
      try {
        const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodeURIComponent(keyword)}&Limit=30`
        const data = await fetchSyoboi<TitleResponse>(url)
        const items = Object.values(data.Titles ?? {}).map(item => {
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
        const sorted = items
          .filter(item => Number.isFinite(item.tid))
          .sort((a, b) => b.score - a.score || b.firstYear - a.firstYear)
        setResults(sorted)
        setSelected(sorted[0] ?? null)
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : '検索に失敗しました'
        setError(message)
      } finally {
        setLoading(false)
      }
    },
    [query]
  )

  const applyEpisodeSchedule = useCallback(async () => {
    const tid = selected?.tid ?? shoboiTid
    if (!tid || !episodes.length) {
      const message = !tid
        ? 'しょぼいカレンダーIDが選択されていません'
        : '更新対象のエピソードがありません'
      setError(message)
      showToast(message, 'error')
      return
    }
    setEpisodeLoading(true)
    setEpisodeProgress(0)
    setError(null)
    try {
      const baseUrl = await getApiBaseUrl()
      let updatedCount = 0
      let missingProgramCount = 0
      let failedUpdateCount = 0
      const missingMappings: string[] = []
      const eligibleEpisodes = episodes.filter(
        episode => episode.episode_number >= startEpisodeNumber && episode.episode_number > 0
      )
      if (eligibleEpisodes.length === 0) {
        const message = '指定した開始話数以降に転写できるエピソードがありません'
        setError(message)
        showToast(message, 'error')
        return
      }
      for (const [index, episode] of eligibleEpisodes.entries()) {
        setEpisodeProgress(Math.round(((index + 1) / eligibleEpisodes.length) * 100))
        const relativeSyoboiCount = episode.episode_number - startEpisodeNumber + 1
        const syoboiCounts = [...new Set([episode.episode_number, relativeSyoboiCount])]
        let program: Program | null = null
        for (const syoboiCount of syoboiCounts) {
          const programData = await fetchSyoboi<ProgramResponse>(
            `https://cal.syoboi.jp/json.php?Req=ProgramByCount&TID=${tid}&Count=${syoboiCount}`
          )
          program = findProgram(programData, syoboiCount)
          if (program?.StTime) break
        }
        if (!program?.StTime) {
          missingProgramCount += 1
          missingMappings.push(`${episode.episode_number}→${syoboiCounts.join('/')}`)
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
      if (refreshed.ok) onSeasonSynced?.(seasonId, (await refreshed.json()) as Season)
      const unavailableCountLabel = missingMappings.length
        ? `, 取得できなかった内部話数→照会Count: ${missingMappings.join(', ')}`
        : ''
      const summary = `対象${eligibleEpisodes.length}話中${updatedCount}件を転写しました（放送情報なし: ${missingProgramCount}件、更新失敗: ${failedUpdateCount}件。TID: ${tid}、内部開始話数: ${startEpisodeNumber}${unavailableCountLabel}）`
      if (updatedCount === 0) {
        setError(summary)
        showToast(summary, 'error')
      } else {
        showToast(summary, 'success')
      }
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '各話情報の更新に失敗しました'
      setError(message)
      showToast(message, 'error')
    } finally {
      setEpisodeLoading(false)
      setEpisodeProgress(0)
    }
  }, [episodes, onSeasonSynced, seasonId, selected, shoboiTid, showToast, startEpisodeNumber])

  const applySelected = useCallback(async () => {
    if (!selected) return
    setApplyLoading(true)
    setError(null)
    try {
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
      const updated = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (updated.ok) {
        const season = (await updated.json()) as Season
        onSeasonSynced?.(seasonId, season)
        onTitleChange(season.season_title)
      }
      showToast('しょぼいカレンダーから情報を反映しました', 'success')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '情報の反映に失敗しました'
      setError(message)
      showToast(message, 'error')
    } finally {
      setApplyLoading(false)
    }
  }, [onSeasonSynced, onTitleChange, seasonId, selected, showToast])

  const appendSelected = useCallback(async () => {
    if (!selected) return
    setAppendLoading(true)
    setError(null)
    try {
      const detail = await fetchSyoboi<TitleResponse>(
        `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${selected.tid}`
      )
      const item = detail.Titles?.[String(selected.tid)]
      const baseUrl = await getApiBaseUrl()
      const currentResponse = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (!currentResponse.ok) throw new Error('シーズン取得に失敗しました')
      const current = (await currentResponse.json()) as Season
      const payload = {
        description:
          mergeDescriptions(current.description ?? '', (item?.Comment ?? '').trim()) || undefined,
        first_end_year: toNumber(item?.FirstEndYear) || selected.firstEndYear || undefined,
        first_end_month: toNumber(item?.FirstEndMonth) || selected.firstEndMonth || undefined
      }
      const response = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('追記に失敗しました')
      const updated = await fetch(`${baseUrl}/v1/season/${seasonId}`)
      if (updated.ok) {
        const season = (await updated.json()) as Season
        onSeasonSynced?.(seasonId, season)
        onTitleChange(season.season_title)
      }
      showToast('追記しました', 'success')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '追記に失敗しました'
      setError(message)
      showToast(message, 'error')
    } finally {
      setAppendLoading(false)
    }
  }, [onSeasonSynced, onTitleChange, seasonId, selected, showToast])

  return {
    query,
    setQuery: (value: string) => setQuery(value),
    results,
    selected,
    setSelected,
    loading,
    error,
    searched,
    applyLoading,
    appendLoading,
    episodeLoading,
    episodeProgress,
    startEpisodeNumber,
    setStartEpisodeNumber,
    search,
    applyEpisodeSchedule,
    applySelected,
    appendSelected
  }
}
