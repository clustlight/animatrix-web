import { useEffect, useState } from 'react'

export function usePersistedVolume(key = 'video-player-volume', defaultValue = 0.8) {
  const getInitialVolume = () => {
    if (typeof window === 'undefined') return defaultValue
    const v = localStorage.getItem(key)
    const parsed = parseFloat(v ?? '')
    return !isNaN(parsed) ? parsed : defaultValue
  }

  const [volume, setVolume] = useState(getInitialVolume)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, String(volume))
    }
  }, [volume, key])

  return [volume, setVolume] as const
}
