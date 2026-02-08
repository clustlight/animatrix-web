import { useEffect, useRef, useState } from 'react'

/**
 * Hook to manage fading UI for player controls.
 */
export function useFadeUI({ isFullscreen }: { isFullscreen: boolean }) {
  // UI visibility states
  const [fadeOut, setFadeOut] = useState(false)
  const [shortcutActive, setShortcutActive] = useState(false)
  const [hovered, setHovered] = useState(false)

  // Timer refs
  const fadeOutTimer = useRef<NodeJS.Timeout | null>(null)
  const hoveredTimer = useRef<NodeJS.Timeout | null>(null)
  const shortcutTimer = useRef<NodeJS.Timeout | null>(null)

  // Handle hover timer in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      clearTimeout(hoveredTimer.current!)
      hoveredTimer.current = null
      return
    }
    if (hovered) {
      clearTimeout(hoveredTimer.current!)
      hoveredTimer.current = setTimeout(() => setHovered(false), 5000)
    } else {
      clearTimeout(hoveredTimer.current!)
      hoveredTimer.current = null
    }
    return () => {
      clearTimeout(hoveredTimer.current!)
      hoveredTimer.current = null
    }
  }, [hovered, isFullscreen])

  // Handle fade out logic
  useEffect(() => {
    if (!isFullscreen && hovered) {
      setFadeOut(false)
      clearTimeout(fadeOutTimer.current!)
      fadeOutTimer.current = null
      return
    }
    if (isFullscreen || !hovered) {
      setFadeOut(false)
      clearTimeout(fadeOutTimer.current!)
      fadeOutTimer.current = setTimeout(() => {
        setFadeOut(true)
        fadeOutTimer.current = null
      }, 5000)
    }
    return () => {
      clearTimeout(fadeOutTimer.current!)
      fadeOutTimer.current = null
    }
  }, [hovered, isFullscreen])

  // Hide UI after fade out
  useEffect(() => {
    if (fadeOut) {
      const t = setTimeout(() => {
        setFadeOut(false)
      }, 800)
      return () => clearTimeout(t)
    }
  }, [fadeOut])

  // Cleanup shortcut timer
  useEffect(() => {
    return () => {
      clearTimeout(shortcutTimer.current!)
      shortcutTimer.current = null
    }
  }, [])

  return {
    fadeOut,
    shortcutActive,
    hovered,
    setHovered,
    setShortcutActive
  }
}
