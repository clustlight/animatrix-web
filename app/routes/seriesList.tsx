import { useEffect, useRef, useState } from 'react'
import type { Series } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { SeriesGrid } from '../components/lists/SeriesGrid'
import { MdArrowUpward, MdArrowDownward } from 'react-icons/md'

const PAGE_SIZE = 30

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function clientLoader() {
  try {
    const baseUrl = await getApiBaseUrl()
    const seriesList = await fetchJson<Series[]>(`${baseUrl}/v1/series`)
    return { seriesList }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

function SortToggleButton({
  sortOrder,
  onToggle
}: {
  sortOrder: 'asc' | 'desc'
  onToggle: () => void
}) {
  return (
    <button
      className='p-2 rounded-full flex items-center bg-blue-600 text-white'
      onClick={onToggle}
      aria-label={sortOrder === 'asc' ? '降順' : '昇順'}
    >
      {sortOrder === 'asc' ? <MdArrowUpward size={28} /> : <MdArrowDownward size={28} />}
    </button>
  )
}

export default function SeriesList({
  loaderData
}: {
  loaderData?: { seriesList?: Series[]; error?: string }
}) {
  const [allSeries, setAllSeries] = useState<Series[]>(loaderData?.seriesList || [])
  const [displayedSeries, setDisplayedSeries] = useState<Series[]>([])
  const [error, setError] = useState<string | null>(loaderData?.error || null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const loaderRef = useRef<HTMLDivElement | null>(null)

  const pageTitle = `Series List | animatrix`

  useEffect(() => {
    if (!loaderData) {
      clientLoader().then(data => {
        if ('seriesList' in data && data.seriesList !== undefined) setAllSeries(data.seriesList)
        if ('error' in data && data.error !== undefined) setError(data.error)
      })
    }
  }, [loaderData])

  useEffect(() => {
    setDisplayedSeries(
      [...allSeries]
        .sort((a, b) =>
          sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
        )
        .slice(0, page * PAGE_SIZE)
    )
  }, [allSeries, sortOrder, page])

  useEffect(() => {
    if (!loaderRef.current) return
    const observer = new window.IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading) {
          if (displayedSeries.length < allSeries.length) {
            setLoading(true)
            setPage(p => p + 1)
          }
        }
      },
      { threshold: 1 }
    )
    observer.observe(loaderRef.current)
    return () => observer.disconnect()
  }, [displayedSeries.length, allSeries.length, loading])

  useEffect(() => {
    setLoading(false)
  }, [page])

  if (error) {
    return (
      <main className='pt-16 p-4 container mx-auto'>
        <h1>Error</h1>
        <p>{error}</p>
      </main>
    )
  }

  return (
    <main className='flex items-center justify-center'>
      <title>{pageTitle}</title>
      <div className='flex-1 flex flex-col items-center gap-6 min-h-0 mb-10'>
        <div className='flex items-center w-full max-w-7xl mt-6 px-4'>
          <h1 className='text-2xl font-bold flex items-center gap-4 flex-1 justify-start'>
            Series List
            <span className='text-base font-normal text-muted-foreground'>
              ({allSeries.length})
            </span>
          </h1>
          <SortToggleButton
            sortOrder={sortOrder}
            onToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          />
        </div>
        <SeriesGrid seriesList={displayedSeries} loading={allSeries.length === 0} />
        <div ref={loaderRef} style={{ height: 40 }} />
        {loading && <div className='text-muted-foreground mb-4'>Loading...</div>}
        {displayedSeries.length >= allSeries.length && (
          <div className='text-muted-foreground mb-4'>List End</div>
        )}
      </div>
    </main>
  )
}
