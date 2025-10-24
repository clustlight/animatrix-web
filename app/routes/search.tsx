import { useLocation } from 'react-router'
import { useEffect, useState } from 'react'
import { SeriesGrid } from '~/components/SeriesGrid'
import type { Series } from '../types'
import { getApiBaseUrl } from '../lib/config'

async function fetchSeries(keyword: string): Promise<Series[]> {
  if (!keyword) return []
  const baseUrl = await getApiBaseUrl()
  const res = await fetch(`${baseUrl}/v1/search?q=${encodeURIComponent(keyword)}`, {
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error('検索に失敗しました')
  return res.json()
}

function useSeriesSearch(keyword: string) {
  const [seriesList, setSeriesList] = useState<Series[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!keyword) {
      setSeriesList([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    fetchSeries(keyword)
      .then(setSeriesList)
      .catch(e => setError(e instanceof Error ? e.message : '検索に失敗しました'))
      .finally(() => setLoading(false))
  }, [keyword])

  return { seriesList, loading, error }
}

export default function Search() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const keyword = queryParams.get('q') ?? ''
  const { seriesList, loading, error } = useSeriesSearch(keyword)

  const pageTitle = keyword ? `検索結果: ${keyword} | animatrix` : '検索 | animatrix'

  return (
    <main className='flex items-center justify-center pt-8 pb-4'>
      <title>{pageTitle}</title>
      <div className='flex-1 flex flex-col items-center gap-8 min-h-0'>
        <div className='max-w-[1200px] w-full space-y-4 px-4'>
          {error && <div className='text-red-500'>{error}</div>}
          <SeriesGrid
            seriesList={seriesList}
            loading={loading}
            title={`検索結果 (${seriesList.length}件)`}
          />
        </div>
      </div>
    </main>
  )
}
