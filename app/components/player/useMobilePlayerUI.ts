import { useCallback, useEffect, useRef, useState } from 'react'

/** Owns the mobile player's inactivity timer and visibility state. */
export function useMobilePlayerUI() {
  const [visible, setVisible] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearHideTimer = useCallback(() => {
    if (!hideTimer.current) return
    clearTimeout(hideTimer.current)
    hideTimer.current = null
  }, [])

  const scheduleHide = useCallback(() => {
    clearHideTimer()
    hideTimer.current = setTimeout(() => setVisible(false), 3000)
  }, [clearHideTimer])

  useEffect(() => clearHideTimer, [clearHideTimer])

  return { visible, setVisible, scheduleHide, clearHideTimer }
}
