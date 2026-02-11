import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useNavigate,
  Link
} from 'react-router'

import { ToastProvider } from './components/ToastProvider'

import type { Route } from './+types/root'
import './app.css'
import { Search } from './components/Search'
import React from 'react'

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous'
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
  }
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='ja'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <meta name='description' content='ABM archive-player web' />
        <Meta />
        <Links />
      </head>
      <body className='bg-background text-foreground font-sans antialiased'>
        <ToastProvider>
          {children}
          <ScrollRestoration />
          <Scripts />
        </ToastProvider>
      </body>
    </html>
  )
}

export default function App() {
  const [searchParams, setSearchParams] = React.useState('')
  const navigate = useNavigate()
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'dark'
    try {
      const stored = window.localStorage.getItem('theme')
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // ignore
    }
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch {
      return 'dark'
    }
  })

  const [hasUserTheme, setHasUserTheme] = React.useState(() => {
    if (typeof window === 'undefined') return false
    try {
      const stored = window.localStorage.getItem('theme')
      return stored === 'light' || stored === 'dark'
    } catch {
      return false
    }
  })

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applySystemTheme = () => {
      if (!hasUserTheme) {
        setTheme(mediaQuery.matches ? 'dark' : 'light')
      }
    }
    applySystemTheme()
    mediaQuery.addEventListener('change', applySystemTheme)
    return () => mediaQuery.removeEventListener('change', applySystemTheme)
  }, [hasUserTheme])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (hasUserTheme) {
      window.localStorage.setItem('theme', theme)
    } else {
      window.localStorage.removeItem('theme')
    }
  }, [theme, hasUserTheme])
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchParams.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchParams.trim())}`)
    }
  }

  return (
    <div className='relative min-h-screen bg-background text-foreground'>
      {/* Header background only */}
      <div
        className='fixed top-0 left-0 w-screen z-40 bg-background/90 border-b border-border shadow-md backdrop-blur-md'
        style={{
          minHeight: '70px',
          height: '70px' // Make the background taller to cover logo and search bar
        }}
      />
      {/* Logo & Series link */}
      <div className='fixed top-3 left-2 md:left-8 z-50 flex items-center gap-4 h-[42px]'>
        <Link
          to='/'
          className='font-bold text-foreground hover:text-primary transition-colors cursor-pointer select-none text-lg md:text-xl flex items-center'
          style={{
            textShadow: '0 2px 8px #0008',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.5rem',
            height: '42px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label='Go to home'
        >
          animatrix
        </Link>
        <Link
          to='/series'
          className='font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1 rounded flex items-center'
          style={{
            textShadow: '0 2px 8px #0008',
            padding: '0.25rem 0.75rem',
            borderRadius: '0.5rem',
            height: '42px',
            display: 'flex',
            alignItems: 'center'
          }}
          aria-label='Go to series list'
        >
          Series
        </Link>
      </div>
      {/* Search bar: fixed at the top (右寄せ&幅1/3) */}
      <div
        className={`
          fixed top-3
          right-5
          left-auto
          z-40
          flex items-center
          gap-2
          w-1/3
          min-w-[200px]
          max-w-sm
        `}
        style={{
          height: '42px'
        }}
      >
        <Search
          value={searchParams}
          onChange={e => setSearchParams(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Search'
        />
        <button
          type='button'
          className='text-foreground hover:text-primary border border-border bg-card/70 hover:bg-card transition-colors px-3 py-1 rounded text-sm h-full'
          onClick={() => {
            const newTheme = theme === 'dark' ? 'light' : 'dark'
            setHasUserTheme(true)
            setTheme(newTheme)
            if (typeof window !== 'undefined') {
              try {
                window.localStorage.setItem('theme', newTheme)
              } catch {
                // ignore localStorage errors (e.g. private mode)
              }
            }
          }}
          aria-label='Toggle light and dark theme'
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
      {/* Main content */}
      <div className='pt-20'>
        <Outlet />
      </div>
    </div>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className='pt-16 p-4 container mx-auto'>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className='w-full p-4 overflow-x-auto'>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
