import { useCallback, useEffect, useRef } from 'react'
import type React from 'react'
import { clamp, getSeekTimeFromPoint } from './playerUtils'

type UseMobileSeekbarTouchOptions = {
  url: string
  isMobile: boolean
  isFullscreen: boolean
  duration: number
  rotationDeg: number
  fullscreenTransitioning: { current: boolean }
  rotationTransitioning: { current: boolean }
  lastSeekDragEndTime: { current: number }
  handleSeek: (sec: number) => void
  setMobileUIVisible: React.Dispatch<React.SetStateAction<boolean>>
  clearMobileHide: () => void
  scheduleMobileHide: () => void
  suppressClickTemporary: (ms?: number) => void
}

export function useMobileSeekbarTouch({
  url,
  isMobile,
  isFullscreen,
  duration,
  rotationDeg,
  fullscreenTransitioning,
  rotationTransitioning,
  lastSeekDragEndTime,
  handleSeek,
  setMobileUIVisible,
  clearMobileHide,
  scheduleMobileHide,
  suppressClickTemporary
}: UseMobileSeekbarTouchOptions) {
  const lastInsideValueRef = useRef<number | null>(null)
  const pointerInsideRef = useRef(true)
  const startedInsideRef = useRef(false)
  const lastRotationDegRef = useRef(rotationDeg)
  const rotationChangedRef = useRef(false)

  useEffect(() => {
    lastInsideValueRef.current = null
    pointerInsideRef.current = true
    startedInsideRef.current = false
    rotationChangedRef.current = false
  }, [url])

  return useCallback(
    (e: React.TouchEvent) => {
      if (fullscreenTransitioning.current || rotationTransitioning.current) return
      if (!isMobile || !isFullscreen) return

      // Let the inner seekbar handle touches that start on its actual track.
      const startTarget = (e.target as Element) || null
      if (startTarget && startTarget.closest('[data-player-seekbar-inner]')) return

      const touch = e.changedTouches[0]
      const container = e.currentTarget as HTMLElement
      const visual = container.querySelector('[data-player-seekbar-visual]') as HTMLElement | null
      if (!visual || duration <= 0) return

      if (e.type === 'touchstart') {
        lastRotationDegRef.current = rotationDeg
        rotationChangedRef.current = false
        lastInsideValueRef.current = null
        pointerInsideRef.current = true

        const innerBarStart = visual.querySelector(
          '[data-player-seekbar-inner]'
        ) as HTMLElement | null
        const startRect = innerBarStart
          ? innerBarStart.getBoundingClientRect()
          : visual.getBoundingClientRect()
        const startInsideX = touch.clientX >= startRect.left && touch.clientX <= startRect.right
        const startInsideY = touch.clientY >= startRect.top && touch.clientY <= startRect.bottom
        startedInsideRef.current = startInsideX && startInsideY

        if (startedInsideRef.current) {
          const time = clamp(
            getSeekTimeFromPoint({
              rect: startRect,
              clientX: touch.clientX,
              clientY: touch.clientY,
              duration,
              rotationDeg,
              isRotated: Math.abs(rotationDeg) === 90
            }),
            0,
            duration
          )
          lastInsideValueRef.current = time
          handleSeek(time)
        }
      } else if (lastRotationDegRef.current !== rotationDeg) {
        rotationChangedRef.current = true
        lastRotationDegRef.current = rotationDeg
      }

      const innerBar = visual.querySelector('[data-player-seekbar-inner]') as HTMLElement | null
      const rect = innerBar ? innerBar.getBoundingClientRect() : visual.getBoundingClientRect()
      const time = clamp(
        getSeekTimeFromPoint({
          rect,
          clientX: touch.clientX,
          clientY: touch.clientY,
          duration,
          rotationDeg,
          isRotated: Math.abs(rotationDeg) === 90
        }),
        0,
        duration
      )
      const insideX = touch.clientX >= rect.left && touch.clientX <= rect.right
      const insideY = touch.clientY >= rect.top && touch.clientY <= rect.bottom
      pointerInsideRef.current = insideY
      if (insideX && insideY) lastInsideValueRef.current = time

      if (e.type === 'touchstart' || e.type === 'touchmove') {
        setMobileUIVisible(true)
        clearMobileHide()
        if (insideY) handleSeek(time)
      } else if (e.type === 'touchend') {
        lastSeekDragEndTime.current = Date.now()

        if (!startedInsideRef.current && lastInsideValueRef.current == null) {
          lastInsideValueRef.current = null
          pointerInsideRef.current = true
          rotationChangedRef.current = false
          startedInsideRef.current = false
          scheduleMobileHide()
          suppressClickTemporary()
          return
        }

        let finalTime = time
        if (
          (rotationChangedRef.current || !pointerInsideRef.current) &&
          lastInsideValueRef.current != null
        ) {
          finalTime = lastInsideValueRef.current
        }

        handleSeek(finalTime)
        scheduleMobileHide()
        suppressClickTemporary()

        lastInsideValueRef.current = null
        pointerInsideRef.current = true
        rotationChangedRef.current = false
        startedInsideRef.current = false
      }
    },
    [
      clearMobileHide,
      duration,
      fullscreenTransitioning,
      handleSeek,
      isFullscreen,
      isMobile,
      lastSeekDragEndTime,
      rotationDeg,
      rotationTransitioning,
      scheduleMobileHide,
      setMobileUIVisible,
      suppressClickTemporary
    ]
  )
}
