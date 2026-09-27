import { useCallback, useEffect, useRef, useState } from 'react'

export function usePlayerTransitions({
  toggleFullscreen,
  suppressClickTemporary
}: {
  toggleFullscreen: () => void
  suppressClickTemporary: (ms?: number) => void
}) {
  const pendingSeekOnReady = useRef(false)
  const fullscreenTransitioning = useRef(false)
  const fullscreenTransitionTimer = useRef<number | null>(null)
  const rotationTransitioning = useRef(false)
  const rotationTransitionTimer = useRef<number | null>(null)
  const [rotationDeg, setRotationDeg] = useState(90)

  const handleToggleFullscreen = useCallback(() => {
    pendingSeekOnReady.current = true
    fullscreenTransitioning.current = true
    if (fullscreenTransitionTimer.current) clearTimeout(fullscreenTransitionTimer.current)
    fullscreenTransitionTimer.current = window.setTimeout(() => {
      fullscreenTransitioning.current = false
      fullscreenTransitionTimer.current = null
    }, 700)

    toggleFullscreen()
  }, [toggleFullscreen])

  const toggleRotation = useCallback(() => {
    rotationTransitioning.current = true
    if (rotationTransitionTimer.current) clearTimeout(rotationTransitionTimer.current)
    rotationTransitionTimer.current = window.setTimeout(() => {
      rotationTransitioning.current = false
      rotationTransitionTimer.current = null
    }, 400)

    suppressClickTemporary()
    setRotationDeg(degrees => (degrees === 90 ? -90 : 90))
  }, [suppressClickTemporary])

  useEffect(
    () => () => {
      if (fullscreenTransitionTimer.current) clearTimeout(fullscreenTransitionTimer.current)
      if (rotationTransitionTimer.current) clearTimeout(rotationTransitionTimer.current)
    },
    []
  )

  return {
    pendingSeekOnReady,
    fullscreenTransitioning,
    rotationTransitioning,
    rotationDeg,
    toggleRotation,
    handleToggleFullscreen
  }
}
