import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import type ReactPlayer from 'react-player'

export function usePlayerSourceState({
  playerRef,
  url,
  autoPlay,
  initialSeek,
  onTimeUpdate,
  pendingSeekOnReady
}: {
  playerRef: RefObject<ReactPlayer>
  url: string
  autoPlay: boolean
  initialSeek?: number
  onTimeUpdate?: (seconds: number) => void
  pendingSeekOnReady: MutableRefObject<boolean>
}) {
  const [playing, setPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const currentTimeRef = useRef(0)
  const [duration, setDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [hasSeeked, setHasSeeked] = useState(false)

  const handleReady = useCallback(() => {
    setIsReady(true)
    const video = playerRef.current?.getInternalPlayer() as HTMLVideoElement | null
    if (video?.videoWidth && video.videoHeight) {
      setAspectRatio(video.videoWidth / video.videoHeight)
    }
    if (pendingSeekOnReady.current) {
      const time = currentTimeRef.current
      pendingSeekOnReady.current = false
      if (Number.isFinite(time) && time >= 0) {
        const target = duration > 0 ? Math.min(time, duration) : time
        currentTimeRef.current = target
        playerRef.current?.seekTo(target, 'seconds')
      }
    }
  }, [duration, pendingSeekOnReady, playerRef])

  useEffect(() => {
    setPlaying(autoPlay)
  }, [autoPlay, url])

  useEffect(() => {
    setHasSeeked(false)
  }, [url, initialSeek])

  useEffect(() => {
    setIsReady(false)
    setAspectRatio(null)
    setCurrentTime(0)
    currentTimeRef.current = 0
    pendingSeekOnReady.current = false
  }, [pendingSeekOnReady, url])

  useEffect(() => {
    if (!isReady || initialSeek == null || hasSeeked) return
    currentTimeRef.current = initialSeek
    playerRef.current?.seekTo(initialSeek, 'seconds')
    setHasSeeked(true)
  }, [hasSeeked, initialSeek, isReady, playerRef])

  useEffect(() => {
    if (!onTimeUpdate) return
    const interval = window.setInterval(() => {
      onTimeUpdate(playerRef.current?.getCurrentTime?.() ?? 0)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [onTimeUpdate, playerRef])

  return {
    playing,
    setPlaying,
    currentTime,
    setCurrentTime,
    currentTimeRef,
    duration,
    setDuration,
    isReady,
    aspectRatio,
    handleReady
  }
}
