import { useCallback, useEffect, useState } from 'react'
import type { RefObject } from 'react'

// Get the current fullscreen element (cross-browser)
function getFullscreenElement(): Element | null {
  return (
    document.fullscreenElement ||
    (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement ||
    (document as Document & { mozFullScreenElement?: Element }).mozFullScreenElement ||
    (document as Document & { msFullscreenElement?: Element }).msFullscreenElement ||
    null
  )
}

// Request fullscreen for an element (cross-browser)
function requestFullscreen(el: HTMLElement) {
  if (el.requestFullscreen) return el.requestFullscreen()
  if ((el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
    return (el as HTMLElement & { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen()
  }
  if ((el as HTMLElement & { mozRequestFullScreen?: () => Promise<void> }).mozRequestFullScreen) {
    return (el as HTMLElement & { mozRequestFullScreen: () => Promise<void> }).mozRequestFullScreen()
  }
  if ((el as HTMLElement & { msRequestFullscreen?: () => Promise<void> }).msRequestFullscreen) {
    return (el as HTMLElement & { msRequestFullscreen: () => Promise<void> }).msRequestFullscreen()
  }
}

// Exit fullscreen mode (cross-browser)
function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen()
  if ((document as Document & { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
    return (document as Document & { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen()
  }
  if ((document as Document & { mozCancelFullScreen?: () => Promise<void> }).mozCancelFullScreen) {
    return (document as Document & { mozCancelFullScreen: () => Promise<void> }).mozCancelFullScreen()
  }
  if ((document as Document & { msExitFullscreen?: () => Promise<void> }).msExitFullscreen) {
    return (document as Document & { msExitFullscreen: () => Promise<void> }).msExitFullscreen()
  }
}

// React hook for fullscreen toggle
export function useFullscreen(ref: RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Toggle fullscreen on/off
  const toggleFullscreen = useCallback(() => {
    const el = ref.current
    if (!el) return
    if (!isFullscreen) {
      requestFullscreen(el)
    } else {
      exitFullscreen()
    }
  }, [isFullscreen, ref])

  // Listen for fullscreen change events
  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!getFullscreenElement())
    }
    const events = [
      'fullscreenchange',
      'webkitfullscreenchange',
      'mozfullscreenchange',
      'MSFullscreenChange'
    ]
    events.forEach(event => document.addEventListener(event, handleChange))
    return () => {
      events.forEach(event => document.removeEventListener(event, handleChange))
    }
  }, [])

  return { isFullscreen, toggleFullscreen }
}
