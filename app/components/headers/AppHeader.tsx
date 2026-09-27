import type { KeyboardEvent } from 'react'
import { Link } from 'react-router'
import { Search } from '../search/Search'

export function AppHeader({
  searchValue,
  onSearchChange,
  onSearchKeyDown,
  theme,
  onToggleTheme
}: {
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  return (
    <>
      <div
        className='fixed top-0 left-0 z-40 w-screen border-b border-border bg-background/90 shadow-md backdrop-blur-md'
        style={{ minHeight: '70px', height: '70px' }}
      />
      <nav
        aria-label='Main navigation'
        className='fixed top-3 left-2 z-50 flex h-10.5 items-center gap-4 md:left-8'
      >
        <Link
          to='/'
          className='flex cursor-pointer select-none items-center text-lg font-bold text-foreground transition-colors hover:text-primary md:text-xl'
          style={{
            textShadow: '0 2px 8px #0008',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.5rem',
            height: '42px'
          }}
          aria-label='Go to home'
        >
          animatrix
        </Link>
        <Link
          to='/series'
          className='flex items-center rounded px-3 py-1 font-semibold text-muted-foreground transition-colors hover:text-foreground'
          style={{
            textShadow: '0 2px 8px #0008',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.5rem',
            height: '42px'
          }}
          aria-label='Go to series list'
        >
          Series
        </Link>
      </nav>
      <div className='fixed top-3 right-5 left-auto z-40 flex h-[42px] w-1/3 min-w-50 max-w-sm items-center gap-2'>
        <Search
          value={searchValue}
          onChange={event => onSearchChange(event.target.value)}
          onKeyDown={onSearchKeyDown}
          placeholder='Search'
        />
        <button
          type='button'
          className='h-full rounded border border-border bg-card/70 px-3 py-1 text-sm text-foreground transition-colors hover:bg-card hover:text-primary'
          onClick={onToggleTheme}
          aria-label='Toggle light and dark theme'
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </>
  )
}
