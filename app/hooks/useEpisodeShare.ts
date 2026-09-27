import { useCallback, useState } from 'react'

export function useEpisodeShare(episodeId: string) {
  const [open, setOpen] = useState(false)
  const [includeTime, setIncludeTime] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)

  const handleTimeUpdate = useCallback((seconds: number) => {
    setCurrentTime(seconds)
  }, [])

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  let url = `${baseUrl}/episode/${episodeId}`
  if (includeTime && currentTime > 0) {
    const minutes = Math.floor(currentTime / 60)
    const seconds = Math.floor(currentTime % 60)
    url += `?t=${minutes > 0 ? `${minutes}m` : ''}${seconds}s`
  }

  return { open, setOpen, includeTime, setIncludeTime, url, handleTimeUpdate }
}
