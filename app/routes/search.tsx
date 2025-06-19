// Update the path below if your Input component is located elsewhere
import { useLocation } from 'react-router'

export default function Search() {
  const location = useLocation()
  const queryParams = new URLSearchParams(location.search)
  const keyword = queryParams.get('q')
  return (
    <main className='flex items-center justify-center pt-16 pb-4'>
      <div className='flex-1 flex flex-col items-center gap-16 min-h-0'>
        <header className='flex flex-col items-center gap-9'>
          <h1 className='text-2xl font-bold'>Search Page</h1>
        </header>
        <div className='max-w-[1200px] w-full space-y-6 px-4'>
          <p>keyword: {keyword}</p>
        </div>
      </div>
    </main>
  )
}
