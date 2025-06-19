import { useEffect, useState } from 'react'

// Hook to persist and restore volume using localStorage
export function usePersistedVolume(key = 'video-player-volume', defaultValue = 0.8) {
  // Get initial volume from localStorage or use default
  const getInitialVolume = () => {
    if (typeof window === 'undefined') return defaultValue
    const v = localStorage.getItem(key)
    const parsed = v !== null ? Number.parseFloat(v) : Number.NaN
    return !isNaN(parsed) ? parsed : defaultValue
  }

  const [volume, setVolume] = useState(getInitialVolume)

  // Save volume to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, String(volume))
    }
  }, [volume, key])

  return [volume, setVolume] as const
}
