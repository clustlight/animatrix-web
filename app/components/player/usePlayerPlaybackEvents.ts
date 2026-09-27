import { useCallback, useEffect, useRef } from 'react'
import type ReactPlayer from 'react-player'

type UsePlayerPlaybackEventsOptions = {
  playerRef: React.RefObject<ReactPlayer>
  url: string
  duration: number
  currentTime: number
  currentTimeRef: React.MutableRefObject<number>
  isFullscreen: boolean
  onEnded?: (options?: { keepFullscreen?: boolean }) => void
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
  isUserSeekingRef: React.MutableRefObject<boolean>
}

export function usePlayerPlaybackEvents({
  playerRef,
  url,
  duration,
  currentTime,
  currentTimeRef,
  isFullscreen,
  onEnded,
  setPlaying,
  setCurrentTime,
  isUserSeekingRef
}: UsePlayerPlaybackEventsOptions) {
  const endedForCurrentUrlRef = useRef(false)
  const lastEndedTime = useRef(0)

  const handleEnded = useCallback(() => {
    if (isUserSeekingRef.current || endedForCurrentUrlRef.current) return
    const now = Date.now()
    if (now - lastEndedTime.current < 1000) return
    lastEndedTime.current = now
    endedForCurrentUrlRef.current = true
    setPlaying(false)
    onEnded?.({ keepFullscreen: isFullscreen })
  }, [isFullscreen, isUserSeekingRef, onEnded, setPlaying])

  useEffect(() => {
    endedForCurrentUrlRef.current = false
    isUserSeekingRef.current = false
  }, [url, isUserSeekingRef])

  const onPlayerProgress = useCallback(
    ({ playedSeconds }: { playedSeconds: number }) => {
      currentTimeRef.current = playedSeconds
      setCurrentTime(playedSeconds)
      const internal = playerRef.current?.getInternalPlayer() as HTMLVideoElement | null
      if (internal?.ended) {
        handleEnded()
        return
      }
      if (
        duration > 0 &&
        !isUserSeekingRef.current &&
        Number.isFinite(playedSeconds) &&
        playedSeconds >= Math.max(0, duration - 0.5)
      ) {
        handleEnded()
      }
    },
    [currentTimeRef, duration, handleEnded, isUserSeekingRef, playerRef, setCurrentTime]
  )

  useEffect(() => {
    if (duration <= 0 || isUserSeekingRef.current || !Number.isFinite(currentTime)) return
    if (currentTime >= Math.max(0, duration - 0.5)) handleEnded()
  }, [currentTime, duration, handleEnded, isUserSeekingRef])

  const onPlayerPlay = useCallback(() => setPlaying(true), [setPlaying])
  const onPlayerPause = useCallback(() => setPlaying(false), [setPlaying])

  return { handleEnded, onPlayerProgress, onPlayerPlay, onPlayerPause }
}
