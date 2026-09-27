import { useCallback, useRef } from 'react'
import type { Dispatch, MutableRefObject, ReactNode, SetStateAction, TouchEvent } from 'react'

type Side = 'left' | 'right'

export function useMobilePlayerTouches({
  isMobile,
  mobileUIVisible,
  setMobileUIVisible,
  scheduleMobileHide,
  clearMobileHide,
  rotationTransitioning,
  fullscreenTransitioning,
  handleSeekRelative,
  setActionIcon,
  setActionText,
  setActionSide,
  suppressClickTemporary
}: {
  isMobile: boolean
  mobileUIVisible: boolean
  setMobileUIVisible: Dispatch<SetStateAction<boolean>>
  scheduleMobileHide: () => void
  clearMobileHide: () => void
  rotationTransitioning: MutableRefObject<boolean>
  fullscreenTransitioning: MutableRefObject<boolean>
  handleSeekRelative: (delta: number) => void
  setActionIcon: Dispatch<SetStateAction<ReactNode | null>>
  setActionText: Dispatch<SetStateAction<string | null>>
  setActionSide: Dispatch<SetStateAction<Side | null>>
  suppressClickTemporary: (ms?: number) => void
}) {
  const lastTapTime = useRef(0)
  const lastTapX = useRef(0)
  const lastTapY = useRef(0)
  const lastTapWasDouble = useRef(false)
  const sideTapTime = useRef<Record<Side, number>>({ left: 0, right: 0 })
  const sideSingleTapTimer = useRef<Record<Side, number | null>>({
    left: null,
    right: null
  })

  const handleEdgeTouchEnd = useCallback(
    (side: Side, event: TouchEvent) => {
      if (!isMobile) return
      event.preventDefault()
      event.stopPropagation()
      const touch = event.changedTouches[0]
      const now = Date.now()
      const isDouble =
        now - sideTapTime.current[side] < 350 &&
        now - sideTapTime.current[side] > 0 &&
        Math.abs(touch.clientX - lastTapX.current) < 40 &&
        Math.abs(touch.clientY - lastTapY.current) < 40

      if ((fullscreenTransitioning.current || rotationTransitioning.current) && !isDouble) return

      if (isDouble) {
        const timer = sideSingleTapTimer.current[side]
        if (timer) clearTimeout(timer)
        sideSingleTapTimer.current[side] = null
        handleSeekRelative(side === 'left' ? -10 : 10)
        setActionIcon(null)
        setActionText(null)
        setActionSide(side)
        lastTapWasDouble.current = true
        window.setTimeout(() => (lastTapWasDouble.current = false), 400)
      } else {
        const existingTimer = sideSingleTapTimer.current[side]
        if (existingTimer) clearTimeout(existingTimer)
        sideSingleTapTimer.current[side] = window.setTimeout(() => {
          sideSingleTapTimer.current[side] = null
          setMobileUIVisible(previous => {
            const next = !previous
            if (next) scheduleMobileHide()
            else clearMobileHide()
            return next
          })
          suppressClickTemporary()
        }, 300)
      }

      sideTapTime.current[side] = now
      lastTapX.current = touch.clientX
      lastTapY.current = touch.clientY
    },
    [
      clearMobileHide,
      fullscreenTransitioning,
      handleSeekRelative,
      isMobile,
      rotationTransitioning,
      scheduleMobileHide,
      setActionIcon,
      setActionSide,
      setActionText,
      setMobileUIVisible,
      suppressClickTemporary
    ]
  )

  const handleLeftAreaTouchEnd = useCallback(
    (event: TouchEvent) => handleEdgeTouchEnd('left', event),
    [handleEdgeTouchEnd]
  )
  const handleRightAreaTouchEnd = useCallback(
    (event: TouchEvent) => handleEdgeTouchEnd('right', event),
    [handleEdgeTouchEnd]
  )

  const handleRotatedContainerTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!isMobile || rotationTransitioning.current || lastTapWasDouble.current) return
      const touch = event.changedTouches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY) as Element | null
      if (
        element?.closest('button, input, textarea, [data-player-controls], [data-player-seekbar]')
      )
        return

      event.preventDefault()
      event.stopPropagation()
      if (mobileUIVisible) {
        setMobileUIVisible(false)
        clearMobileHide()
      } else {
        setMobileUIVisible(true)
        scheduleMobileHide()
      }
      suppressClickTemporary()
    },
    [
      clearMobileHide,
      isMobile,
      mobileUIVisible,
      rotationTransitioning,
      scheduleMobileHide,
      setMobileUIVisible,
      suppressClickTemporary
    ]
  )

  return {
    lastTapTime,
    lastTapWasDouble,
    sideSingleTapTimer,
    handleLeftAreaTouchEnd,
    handleRightAreaTouchEnd,
    handleRotatedContainerTouchEnd
  }
}
