import { useEffect, useState } from 'react'
import type { Series } from '../types'
import { getApiBaseUrl } from '../lib/config'
import { SeriesGrid } from '../components/SeriesGrid'
import { MdArrowUpward, MdArrowDownward } from 'react-icons/md'

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
  const [seriesList, setSeriesList] = useState<Series[]>(loaderData?.seriesList || [])
  const [error, setError] = useState<string | null>(loaderData?.error || null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const pageTitle = `Series List | animatrix`

  useEffect(() => {
    if (!loaderData) {
      clientLoader().then(data => {
        if ('seriesList' in data && data.seriesList !== undefined) setSeriesList(data.seriesList)
        if ('error' in data && data.error !== undefined) setError(data.error)
      })
    }
  }, [loaderData])

  const sortedSeriesList = [...seriesList].sort((a, b) =>
    sortOrder === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title)
  )

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
            <span className='text-base font-normal text-gray-300'>({sortedSeriesList.length})</span>
          </h1>
          <SortToggleButton
            sortOrder={sortOrder}
            onToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          />
        </div>
        <SeriesGrid seriesList={sortedSeriesList} loading={seriesList.length === 0} />
      </div>
    </main>
  )
}
