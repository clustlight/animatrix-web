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

import type { Route } from './+types/root'
import './app.css'
import { Search } from './components/ui/Search'
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
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body className='bg-gray-900 text-gray-100 font-sans antialiased'>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  const [searchParams, setSearchParams] = React.useState('')
  const navigate = useNavigate()
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchParams.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchParams.trim())}`)
    }
  }

  return (
    <div className='relative min-h-screen bg-black'>
      {/* Logo */}
      <Link
        to='/'
        className='fixed top-8 left-8 z-50 flex items-center text-xl font-bold text-white hover:text-blue-400 transition-colors cursor-pointer select-none'
        style={{
          textShadow: '0 2px 8px #0008',
          padding: '0.25rem 0.75rem',
          borderRadius: '0.5rem',
          height: '48px'
        }}
        aria-label='Go to home'
      >
        animatrix-web
      </Link>
      {/* Search bar: fixed at the top center of the screen */}
      <div
        className='fixed top-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-2 flex items-center'
        style={{ height: '48px' }}
      >
        <Search
          value={searchParams}
          onChange={e => setSearchParams(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Search by series or episode name'
        />
      </div>
      {/* Main content */}
      <div className='pt-28'>
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
