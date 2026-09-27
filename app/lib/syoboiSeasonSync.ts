export type TitleItem = {
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
export type TitleResponse = { Titles?: Record<string, TitleItem> }
export type Program = {
  Count?: string | number
  StTime?: string | number
  SubTitle?: string
  ProgComment?: string
}
export type ProgramResponse = { Programs?: Record<string, Program> | Program[] }
export type TitleResult = {
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

export function titleScore(query: string, result: TitleResult) {
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

export function toNumber(value?: string) {
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

export async function fetchSyoboi<T>(url: string) {
  try {
    return await fetchJson<T>(url)
  } catch {
    return fetchJsonp<T>(url)
  }
}

export function findProgram(data: ProgramResponse, expectedCount: number): Program | null {
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

export function mergeDescriptions(baseText: string, appendText: string) {
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
