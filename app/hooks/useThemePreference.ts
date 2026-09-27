import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function readStoredTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem('theme')
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function readSystemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'dark'
  }
}

export function useThemePreference() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'dark' : (readStoredTheme() ?? readSystemTheme())
  )
  const [hasUserTheme, setHasUserTheme] = useState(
    () => typeof window !== 'undefined' && readStoredTheme() !== null
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applySystemTheme = () => {
      if (!hasUserTheme) setTheme(mediaQuery.matches ? 'dark' : 'light')
    }
    applySystemTheme()
    mediaQuery.addEventListener('change', applySystemTheme)
    return () => mediaQuery.removeEventListener('change', applySystemTheme)
  }, [hasUserTheme])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      if (hasUserTheme) window.localStorage.setItem('theme', theme)
      else window.localStorage.removeItem('theme')
    } catch {
      // Storage can be unavailable in private browsing contexts.
    }
  }, [theme, hasUserTheme])

  const toggleTheme = () => {
    setHasUserTheme(true)
    setTheme(current => (current === 'dark' ? 'light' : 'dark'))
  }

  return { theme, toggleTheme }
}
