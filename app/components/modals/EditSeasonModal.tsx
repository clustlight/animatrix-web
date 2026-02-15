import { useState, useEffect, useCallback } from 'react'
import { useToast } from '../providers/ToastProvider'
import type { Episode, Season } from '../../types'
import { getApiBaseUrl } from '../../lib/config'
import { MdEdit, MdCheck, MdClose } from 'react-icons/md'

type SyoboiTitleSearchItem = {
  TID: string
  Title: string
  ShortTitle?: string
  TitleYomi?: string
  TitleEN?: string
  Comment?: string
  FirstYear?: string
  FirstMonth?: string
  FirstEndYear?: string
  FirstEndMonth?: string
  FirstCh?: string
}

type SyoboiTitleSearchResponse = {
  Titles?: Record<string, SyoboiTitleSearchItem>
}

type SyoboiProgramItem = {
  PID?: string
  TID?: string
  StTime?: string
  EdTime?: string
  ChID?: string
  Count?: string
  SubTitle?: string
  ProgComment?: string
}

type SyoboiProgramResponse = {
  Programs?: Record<string, SyoboiProgramItem> | SyoboiProgramItem[]
}

type SyoboiTitleResult = {
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

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[\s\u3000\-_.!！?？:：()（）\[\]{}「」『』【】<>＜＞"'、。・]/g, '')
    .replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))

const scoreTitleMatch = (query: string, title: SyoboiTitleResult) => {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return 0
  const candidates = [title.title, title.titleYomi, title.titleEn].map(normalize)
  let score = 0
  for (const candidate of candidates) {
    if (!candidate) continue
    if (candidate === normalizedQuery) score += 5
    if (candidate.includes(normalizedQuery)) score += 3
    if (normalizedQuery.includes(candidate)) score += 1
  }
  return score
}

const toNumber = (value?: string) => (value ? Number(value) : 0)

const splitDescriptionSections = (value: string) => {
  const sections: { title: string | null; body: string[] }[] = []
  let current: { title: string | null; body: string[] } = { title: null, body: [] }
  const lines = value.split(/\r?\n/)

  const pushCurrent = () => {
    if (current.title || current.body.length > 0) {
      sections.push(current)
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line) {
      current.body.push('')
      continue
    }
    if (line.startsWith('*') && !line.startsWith('**')) {
      pushCurrent()
      current = { title: line.slice(1).trim() || null, body: [] }
      continue
    }
    current.body.push(line)
  }

  pushCurrent()
  return sections
}

const mergeDescriptions = (baseText: string, appendText: string) => {
  if (!baseText.trim()) return appendText.trim()
  if (!appendText.trim()) return baseText.trim()

  const baseSections = splitDescriptionSections(baseText)
  const appendSections = splitDescriptionSections(appendText)
  const merged = new Map<string, { title: string | null; body: string[] }>()
  const order: string[] = []

  const getKey = (title: string | null) => (title ? `title:${title}` : 'title:__untitled')

  const isDedupSection = (title: string | null) =>
    Boolean(title && (title.includes('スタッフ') || title.includes('キャスト')))

  const addSection = (section: { title: string | null; body: string[] }) => {
    const key = getKey(section.title)
    if (!merged.has(key)) {
      merged.set(key, { title: section.title, body: [...section.body] })
      order.push(key)
      return
    }
    const target = merged.get(key)
    if (!target) return
    if (isDedupSection(target.title)) {
      const existing = new Set(target.body.map(line => line.trim()))
      section.body.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed || existing.has(trimmed)) return
        existing.add(trimmed)
        target.body.push(line)
      })
      return
    }
    if (target.body.length > 0 && target.body[target.body.length - 1].trim() !== '') {
      target.body.push('')
    }
    target.body.push(...section.body)
  }

  baseSections.forEach(addSection)
  appendSections.forEach(addSection)

  return order
    .map(key => {
      const section = merged.get(key)
      if (!section) return ''
      const lines = [] as string[]
      if (section.title) lines.push(`*${section.title}`)
      lines.push(...section.body)
      return lines.join('\n').trimEnd()
    })
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

async function fetchSyoboiJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Syoboi API error: ${res.status}`)
  return res.json()
}

function fetchSyoboiJsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `syoboiJsonp_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    const jsonpWindow = window as unknown as Window & Record<string, (data: T) => void>
    const script = document.createElement('script')
    const cleanup = () => {
      delete jsonpWindow[callbackName]
      script.remove()
    }

    jsonpWindow[callbackName] = (data: T) => {
      cleanup()
      resolve(data)
    }

    script.onerror = () => {
      cleanup()
      reject(new Error('Syoboi JSONP error'))
    }

    const urlWithCallback = url.includes('callback=')
      ? url
      : `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`
    script.src = urlWithCallback
    document.body.appendChild(script)
  })
}

async function fetchSyoboi<T>(url: string): Promise<T> {
  try {
    return await fetchSyoboiJson<T>(url)
  } catch {
    return fetchSyoboiJsonp<T>(url)
  }
}

type EditSeasonModalProps = {
  open: boolean
  onClose: () => void
  seasonId: string
  initialTitle: string
  seriesTitle: string
  onSave: (seasonId: string, newTitle: string) => Promise<void>
  episodes?: Episode[]
  onDeleteEpisode?: (episodeId: string, episodeTitle?: string) => Promise<void>
  onSeasonSynced?: (seasonId: string, updatedSeason: Season) => void
  shoboiTid?: number
}

export function EditSeasonModal({
  open,
  onClose,
  seasonId,
  initialTitle,
  seriesTitle,
  onSave,
  episodes = [],
  onDeleteEpisode,
  onSeasonSynced,
  shoboiTid
}: EditSeasonModalProps) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [loading, setLoading] = useState(false)
  const [deletingEpisodeId, setDeletingEpisodeId] = useState<string | null>(null)
  const [syoboiQuery, setSyoboiQuery] = useState('')
  const [syoboiResults, setSyoboiResults] = useState<SyoboiTitleResult[]>([])
  const [syoboiSelected, setSyoboiSelected] = useState<SyoboiTitleResult | null>(null)
  const [syoboiLoading, setSyoboiLoading] = useState(false)
  const [syoboiError, setSyoboiError] = useState<string | null>(null)
  const [syoboiSearched, setSyoboiSearched] = useState(false)
  const [syoboiApplyLoading, setSyoboiApplyLoading] = useState(false)
  const [syoboiAppendLoading, setSyoboiAppendLoading] = useState(false)
  const [syoboiEpisodeLoading, setSyoboiEpisodeLoading] = useState(false)
  const [syoboiEpisodeProgress, setSyoboiEpisodeProgress] = useState(0)
  const { showToast } = useToast()

  useEffect(() => {
    setTitle(initialTitle)
    setEditing(false)
    setSyoboiQuery(initialTitle)
    setSyoboiResults([])
    setSyoboiSelected(null)
    setSyoboiError(null)
    setSyoboiSearched(false)
  }, [initialTitle, open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleTitleSave = async () => {
    setLoading(true)
    try {
      await onSave(seasonId, title)
      setEditing(false)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存に失敗しました'
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEpisode = async (episodeId: string, episodeTitle?: string) => {
    if (!onDeleteEpisode) return
    setDeletingEpisodeId(episodeId)
    try {
      await onDeleteEpisode(episodeId, episodeTitle)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'エピソード削除に失敗しました'
      showToast(msg, 'error')
    } finally {
      setDeletingEpisodeId(null)
    }
  }

  const handleSyoboiSearch = useCallback(
    async (query?: string) => {
      const keyword = (query ?? syoboiQuery).trim()
      if (!keyword) {
        setSyoboiSearched(false)
        return
      }
      setSyoboiSearched(true)
      setSyoboiLoading(true)
      setSyoboiError(null)
      setSyoboiResults([])
      setSyoboiSelected(null)
      try {
        const url = `https://cal.syoboi.jp/json.php?Req=TitleSearch&Search=${encodeURIComponent(
          keyword
        )}&Limit=30`
        const data = await fetchSyoboi<SyoboiTitleSearchResponse>(url)
        const items = Object.values(data.Titles ?? {}).map(item => {
          const base: SyoboiTitleResult = {
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
          return { ...base, score: scoreTitleMatch(keyword, base) }
        })
        const sorted = items
          .filter(item => Number.isFinite(item.tid))
          .sort((a, b) => b.score - a.score || b.firstYear - a.firstYear)
        setSyoboiResults(sorted)
        if (sorted.length > 0) {
          setSyoboiSelected(sorted[0])
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '検索に失敗しました'
        setSyoboiError(msg)
      } finally {
        setSyoboiLoading(false)
      }
    },
    [syoboiQuery]
  )

  const getFirstProgram = (data: SyoboiProgramResponse): SyoboiProgramItem | null => {
    if (!data.Programs) return null
    if (Array.isArray(data.Programs)) return data.Programs[0] ?? null
    const first = Object.values(data.Programs)[0]
    return first ?? null
  }

  const handleSyoboiEpisodeApply = useCallback(async () => {
    const tid = syoboiSelected?.tid ?? shoboiTid
    if (!tid) {
      const msg = 'しょぼいTIDが未選択です'
      setSyoboiError(msg)
      showToast(msg, 'error')
      return
    }
    if (episodes.length === 0) {
      const msg = '転写対象のエピソードがありません'
      setSyoboiError(msg)
      showToast(msg, 'error')
      return
    }

    setSyoboiEpisodeLoading(true)
    setSyoboiEpisodeProgress(0)
    setSyoboiError(null)

    try {
      const baseUrl = await getApiBaseUrl()
      let updatedCount = 0
      let processed = 0

      for (const ep of episodes) {
        processed += 1
        setSyoboiEpisodeProgress(Math.round((processed / episodes.length) * 100))

        if (!ep.episode_number || ep.episode_number < 1) continue

        const programUrl = `https://cal.syoboi.jp/json.php?Req=ProgramByCount&TID=${tid}&Count=${ep.episode_number}`
        const programData = await fetchSyoboi<SyoboiProgramResponse>(programUrl)
        const program = getFirstProgram(programData)
        if (!program?.StTime) continue

        const timestamp = new Date(Number(program.StTime) * 1000).toISOString()
        const comment = (program.ProgComment ?? '').trim()
        const subtitle = (program.SubTitle ?? '').trim()
        const description = comment || subtitle

        const payload: { timestamp?: string; description?: string } = { timestamp }
        if (description) payload.description = description

        const res = await fetch(`${baseUrl}/v1/episode/${ep.episode_id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) updatedCount += 1
      }

      const updatedSeason = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (updatedSeason.ok) {
        const seasonData = (await updatedSeason.json()) as Season
        onSeasonSynced?.(seasonId, seasonData)
      }
      showToast(`各話の転写が完了しました (${updatedCount}件)`, 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '各話の転写に失敗しました'
      setSyoboiError(msg)
      showToast(msg, 'error')
    } finally {
      setSyoboiEpisodeLoading(false)
      setSyoboiEpisodeProgress(0)
    }
  }, [episodes, seasonId, shoboiTid, syoboiSelected, onSeasonSynced, showToast])

  const handleSyoboiApply = useCallback(async () => {
    if (!syoboiSelected) return
    setSyoboiApplyLoading(true)
    setSyoboiError(null)
    try {
      const detailUrl = `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${syoboiSelected.tid}`
      const detail = await fetchSyoboi<SyoboiTitleSearchResponse>(detailUrl)
      const detailItem = detail.Titles?.[String(syoboiSelected.tid)]
      const payload = {
        season_title: syoboiSelected.title,
        shoboi_tid: syoboiSelected.tid,
        description: detailItem?.Comment ?? '',
        first_year: toNumber(detailItem?.FirstYear) || syoboiSelected.firstYear,
        first_month: toNumber(detailItem?.FirstMonth) || syoboiSelected.firstMonth,
        first_end_year: toNumber(detailItem?.FirstEndYear) || syoboiSelected.firstEndYear,
        first_end_month: toNumber(detailItem?.FirstEndMonth) || syoboiSelected.firstEndMonth
      }

      const baseUrl = await getApiBaseUrl()
      const res = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('転写に失敗しました')

      const updated = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (updated.ok) {
        const updatedSeason = (await updated.json()) as Season
        onSeasonSynced?.(seasonId, updatedSeason)
        setTitle(updatedSeason.season_title)
      }
      showToast('しょぼいカレンダーから転写しました', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '転写に失敗しました'
      setSyoboiError(msg)
      showToast(msg, 'error')
    } finally {
      setSyoboiApplyLoading(false)
    }
  }, [seasonId, syoboiSelected, onSeasonSynced, showToast])

  const handleSyoboiAppend = useCallback(async () => {
    if (!syoboiSelected) return
    setSyoboiAppendLoading(true)
    setSyoboiError(null)
    try {
      const detailUrl = `https://cal.syoboi.jp/json.php?Req=TitleFull&TID=${syoboiSelected.tid}`
      const detail = await fetchSyoboi<SyoboiTitleSearchResponse>(detailUrl)
      const detailItem = detail.Titles?.[String(syoboiSelected.tid)]
      const appendedDescription = (detailItem?.Comment ?? '').trim()

      const baseUrl = await getApiBaseUrl()
      const currentRes = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (!currentRes.ok) throw new Error('シーズン取得に失敗しました')
      const currentSeason = (await currentRes.json()) as Season

      const mergedDescription = mergeDescriptions(
        currentSeason.description ?? '',
        appendedDescription
      )

      const nextEndYear = toNumber(detailItem?.FirstEndYear) || syoboiSelected.firstEndYear || 0
      const nextEndMonth = toNumber(detailItem?.FirstEndMonth) || syoboiSelected.firstEndMonth || 0

      const payload: { description?: string; first_end_year?: number; first_end_month?: number } = {
        description: mergedDescription || undefined,
        first_end_year: nextEndYear || undefined,
        first_end_month: nextEndMonth || undefined
      }

      const res = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('追記に失敗しました')

      const updated = await fetch(`${baseUrl}/v1/season/${seasonId}`, {
        headers: { 'Content-Type': 'application/json' }
      })
      if (updated.ok) {
        const updatedSeason = (await updated.json()) as Season
        onSeasonSynced?.(seasonId, updatedSeason)
        setTitle(updatedSeason.season_title)
      }
      showToast('追記しました', 'success')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '追記に失敗しました'
      setSyoboiError(msg)
      showToast(msg, 'error')
    } finally {
      setSyoboiAppendLoading(false)
    }
  }, [seasonId, syoboiSelected, onSeasonSynced, showToast])

  if (!open) return null
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50'
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div className='bg-card text-card-foreground border border-border p-5 sm:p-6 rounded shadow-lg flex flex-col w-[96vw] sm:w-130 max-w-[96vw] sm:max-w-130 min-w-0 h-[90vh] sm:h-205 max-h-[90vh] sm:min-h-45 overflow-y-auto'>
        <h2 className='text-lg font-bold mb-4'>シーズンを編集</h2>
        <div className='mb-1'>
          <div className='flex items-center gap-2'>
            {editing ? (
              <>
                <input
                  type='text'
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className='bg-background text-foreground border border-border px-2 py-1 rounded w-full max-w-[20rem]'
                  disabled={loading}
                />
                <button
                  onClick={handleTitleSave}
                  disabled={loading}
                  className='ml-2 text-green-400 cursor-pointer'
                  aria-label='save'
                >
                  <MdCheck size={24} />
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setTitle(initialTitle)
                  }}
                  disabled={loading}
                  className='ml-1 text-red-400 cursor-pointer'
                  aria-label='cancel'
                >
                  <MdClose size={24} />
                </button>
              </>
            ) : (
              <>
                <span
                  className={`truncate block max-w-[20rem] wrap-break-word whitespace-normal text-lg`}
                >
                  {title}
                </span>
                <button
                  onClick={() => setEditing(true)}
                  className='ml-2 text-blue-400 cursor-pointer'
                  aria-label='edit'
                >
                  <MdEdit size={22} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className='mt-4 border-t border-border pt-4'>
          <div className='text-sm font-semibold mb-2'>しょぼいカレンダー連携</div>
          <div className='flex gap-2 mb-2'>
            <input
              type='text'
              value={syoboiQuery}
              onChange={e => setSyoboiQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSyoboiSearch()
                }
              }}
              className='flex-1 bg-background text-foreground border border-border px-2 py-1 rounded'
              placeholder='タイトルで検索'
              disabled={syoboiLoading || syoboiApplyLoading}
            />
            <button
              className='px-2 py-1 text-xs text-muted-foreground border border-border rounded hover:text-foreground transition-colors'
              onClick={() => {
                setSyoboiQuery(seriesTitle)
                handleSyoboiSearch(seriesTitle)
              }}
              disabled={!seriesTitle || syoboiLoading || syoboiApplyLoading}
              type='button'
            >
              シリーズ名
            </button>
            <button
              className='px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded disabled:opacity-60'
              onClick={() => handleSyoboiSearch()}
              disabled={syoboiLoading || syoboiApplyLoading}
              type='button'
            >
              {syoboiLoading ? '検索中...' : '検索'}
            </button>
          </div>
          {syoboiError && <div className='text-red-400 text-xs mb-2'>{syoboiError}</div>}
          <div className='max-h-40 overflow-y-auto mb-2 syoboi-scroll'>
            <style>
              {`\n                .syoboi-scroll::-webkit-scrollbar { width: 6px; background: var(--scrollbar-track); }\n                .syoboi-scroll::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }\n                .syoboi-scroll::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }\n                .syoboi-scroll::-webkit-scrollbar-track { background: var(--scrollbar-track); }\n              `}
            </style>
            <ul>
              {syoboiSearched && syoboiResults.length === 0 && !syoboiLoading && (
                <li className='text-muted-foreground text-xs text-center py-2'>検索結果なし</li>
              )}
              {syoboiResults.map(item => (
                <li key={item.tid} className='mb-1'>
                  <button
                    className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                      syoboiSelected?.tid === item.tid
                        ? 'bg-primary text-primary-foreground border border-primary/60 shadow-sm'
                        : 'bg-muted/70 text-foreground border border-border hover:bg-muted'
                    }`}
                    onClick={() => setSyoboiSelected(item)}
                    type='button'
                  >
                    <div className='font-semibold'>{item.title}</div>
                    <div
                      className={`text-[11px] ${
                        syoboiSelected?.tid === item.tid
                          ? 'text-primary-foreground/90'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {item.firstYear ? `${item.firstYear}/${item.firstMonth || ''}` : '不明'}
                      {item.firstEndYear
                        ? ` 〜 ${item.firstEndYear}/${item.firstEndMonth || ''}`
                        : ''}
                      {item.firstCh ? ` ・ ${item.firstCh}` : ''}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className='flex flex-wrap gap-2'>
            <button
              className='px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-60'
              onClick={handleSyoboiApply}
              disabled={!syoboiSelected || syoboiApplyLoading || syoboiAppendLoading}
              type='button'
            >
              {syoboiApplyLoading ? '転写中...' : '選択した内容を転写'}
            </button>
            <button
              className='px-3 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded disabled:opacity-60'
              onClick={handleSyoboiAppend}
              disabled={!syoboiSelected || syoboiAppendLoading || syoboiApplyLoading}
              type='button'
            >
              {syoboiAppendLoading ? '追記中...' : '内容を追記'}
            </button>
          </div>
          <div className='mt-3 flex items-center gap-3'>
            <button
              className='px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded disabled:opacity-60'
              onClick={handleSyoboiEpisodeApply}
              disabled={syoboiEpisodeLoading || episodes.length === 0}
              type='button'
            >
              {syoboiEpisodeLoading ? '各話を転写中...' : '各話の放送日/コメントを転写'}
            </button>
            {syoboiEpisodeLoading && (
              <span className='text-xs text-muted-foreground'>進捗: {syoboiEpisodeProgress}%</span>
            )}
          </div>
        </div>
        <ul className='overflow-y-auto flex-1 mb-2 mt-4 max-h-[70vh]'>
          <style>
            {`\n              .overflow-y-auto::-webkit-scrollbar { width: 8px; background: var(--scrollbar-track); }\n              .overflow-y-auto::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }\n              .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }\n              .overflow-y-auto::-webkit-scrollbar-track { background: var(--scrollbar-track); }\n            `}
          </style>
          {episodes.length === 0 ? (
            <li className='text-muted-foreground text-center py-2'>エピソードがありません</li>
          ) : (
            episodes.map(ep => (
              <li key={ep.episode_id} className='mb-1'>
                <div className='flex items-center gap-3 w-full px-2 py-1 rounded hover:bg-muted/60'>
                  {ep.thumbnail_url ? (
                    <img
                      src={ep.thumbnail_url}
                      alt={ep.title}
                      className='w-24 h-16 object-cover rounded shadow min-w-24 min-h-16'
                      onError={e => (e.currentTarget.style.display = 'none')}
                    />
                  ) : (
                    <div className='w-24 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs'>
                      No Image
                    </div>
                  )}
                  <span className='flex-1 flex flex-col'>
                    <span>{ep.title}</span>
                    <span className='text-xs text-muted-foreground'>ID: {ep.episode_id}</span>
                  </span>
                  <button
                    className='px-2 py-1 bg-red-700 text-white rounded cursor-pointer text-xs'
                    onClick={() => handleDeleteEpisode(ep.episode_id, ep.title)}
                    disabled={deletingEpisodeId === ep.episode_id}
                  >
                    {deletingEpisodeId === ep.episode_id ? '削除中...' : '削除'}
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
        <div className='flex gap-4'>
          <button
            className='px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded cursor-pointer'
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
