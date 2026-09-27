import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, RefObject, SetStateAction } from 'react'

export function usePlayerVisibility({
  containerRef,
  isFullscreen,
  playing,
  fadeOut,
  hovered,
  setHovered
}: {
  containerRef: RefObject<HTMLDivElement | null>
  isFullscreen: boolean
  playing: boolean
  fadeOut: boolean
  hovered: boolean
  setHovered: Dispatch<SetStateAction<boolean>>
}) {
  const [showUI, setShowUI] = useState(true)
  const [mouseMoved, setMouseMoved] = useState(true)
  const hideUITimer = useRef<number | null>(null)

  const handleMouseEnter = useCallback(() => {
    setShowUI(true)
    if (hideUITimer.current) {
      clearTimeout(hideUITimer.current)
      hideUITimer.current = null
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (hideUITimer.current) clearTimeout(hideUITimer.current)
    hideUITimer.current = window.setTimeout(() => setShowUI(false), 3000)
  }, [])

  const resetShowUI = useCallback(() => {
    setShowUI(true)
    if (hideUITimer.current) {
      clearTimeout(hideUITimer.current)
      hideUITimer.current = null
    }
  }, [])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const handleMouseMove = () => {
      setMouseMoved(true)
      setHovered(true)
    }

    element.addEventListener('mousemove', handleMouseMove)
    return () => element.removeEventListener('mousemove', handleMouseMove)
  }, [containerRef, setHovered])

  useEffect(() => {
    if (!isFullscreen) {
      if (containerRef.current) containerRef.current.style.cursor = ''
      return
    }

    if (containerRef.current) {
      containerRef.current.style.cursor = !mouseMoved || fadeOut || !showUI ? 'none' : ''
    }
  }, [containerRef, fadeOut, isFullscreen, mouseMoved, showUI])

  useEffect(() => {
    if (!isFullscreen) {
      setMouseMoved(true)
      return
    }
    if (fadeOut || !showUI) setMouseMoved(false)
  }, [fadeOut, isFullscreen, showUI])

  useEffect(
    () => () => {
      if (hideUITimer.current) clearTimeout(hideUITimer.current)
    },
    []
  )

  return {
    showUI,
    isUIVisible: isFullscreen ? hovered && !fadeOut : hovered || !playing,
    handleMouseEnter,
    handleMouseLeave,
    resetShowUI
  }
}
