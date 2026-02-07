import { useState } from 'react'
import { Link } from 'react-router'
import type { Series } from '../types'

function SeriesGridItem({ series }: { series: Series }) {
  const [imgError, setImgError] = useState(false)

  return (
    <Link
      key={series.series_id}
      to={`/series/${series.series_id}`}
      className='flex flex-col items-center'
      title={series.title}
    >
      {imgError ? (
        <div className='w-full max-w-[300px] aspect-video bg-gray-700 rounded shadow mb-2 flex items-center justify-center'>
          <span className='text-gray-400 text-xs'>No Image</span>
        </div>
      ) : (
        <img
          src={series.thumbnail_url}
          alt={series.title}
          className='w-full max-w-[300px] aspect-video object-cover rounded shadow mb-2 transition-all'
          loading='eager'
          onError={() => setImgError(true)}
        />
      )}
      <span className='text-sm text-gray-200 text-center break-words line-clamp-2 max-w-[300px] w-full whitespace-normal'>
        {series.title}
      </span>
    </Link>
  )
}

export function SeriesGrid({
  seriesList,
  title,
  loading = false
}: {
  seriesList: Series[]
  title?: string
  loading?: boolean
}) {
  const showTitle = !loading && !!title && seriesList.length > 0

  return (
    <section className='mt-8 px-2 md:px-4 lg:px-10 min-h-[320px] flex flex-col'>
      {loading ? (
        <div className='flex justify-center items-center flex-1 min-h-[240px]'>
          <span className='animate-spin rounded-full border-4 border-gray-600 border-t-transparent w-10 h-10 inline-block' />
        </div>
      ) : (
        <>
          {showTitle && (
            <div className='flex items-center mb-3 min-h-[2.5rem]'>
              <h2 className='text-lg font-bold mr-4 text-left w-full'>{title}</h2>
            </div>
          )}
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10'>
            {seriesList.map(series => (
              <SeriesGridItem key={series.series_id} series={series} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
