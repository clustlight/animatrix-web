import { useEffect, useState, useCallback, useRef } from 'react'
import type { RefObject } from 'react'

type VideoPlayerSeekBarProps = {
  currentTime: number
  duration: number
  onSeek: (sec: number) => void
  onDrag?: (dragging: boolean) => void
  /** Optional: parent container that is rotated (used to map client coords) */
  rotationContainerRef?: RefObject<HTMLElement>
  /** Rotation in degrees applied to the container (e.g. 90 or -90) */
  rotationDeg?: number
}

export default function VideoPlayerSeekBar({
  currentTime,
  duration,
  onSeek,
  onDrag,
  rotationContainerRef,
  rotationDeg = 0
}: VideoPlayerSeekBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const seekValueRef = useRef<number | null>(null)
  const [seeking, setSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState<number | null>(null)

  useEffect(() => {
    if (onDrag) onDrag(seeking)
  }, [seeking, onDrag])

  useEffect(() => {
    if (seekValue !== null && Math.abs(currentTime - seekValue) < 0.3) {
      setSeekValue(null)
    }
  }, [currentTime, seekValue])

  useEffect(() => {
    setSeekValue(null)
  }, [duration])

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const updateSeekFromClientX = useCallback(
    (clientX: number, clientY?: number) => {
      const bar = barRef.current
      if (!bar) return

      // Use the visible bounding box of the bar to compute ratio.
      // If the bar is visually horizontal, use clientX vs rect.left/width.
      // If the bar is visually vertical (rotated), use clientY vs rect.top/height
      const rect = bar.getBoundingClientRect()
      let ratio = 0
      if (rect.width >= rect.height) {
        ratio = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
        // If the overall display is rotated left (-90), invert horizontal mapping
        if (rotationDeg === -90) ratio = 1 - ratio
      } else if (clientY != null) {
        // Vertical bar case (likely due to rotation)
        const raw = rect.height > 0 ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0
        // For a container rotated 90deg clockwise, top -> left (0%), bottom -> right (100%).
        // For -90deg (counterclockwise), top -> right (100%), so invert.
        ratio = rotationDeg === -90 ? 1 - raw : raw
      }

      const nextValue = ratio * (duration || 0)
      seekValueRef.current = nextValue
      setSeekValue(nextValue)
    },
    [duration, rotationContainerRef, rotationDeg]
  )

  const handleSeekStart = useCallback(
    (clientX: number, clientY?: number) => {
      setSeeking(true)
      updateSeekFromClientX(clientX, clientY)
    },
    [updateSeekFromClientX]
  )

  const handleSeekEnd = useCallback(() => {
    if (seekValueRef.current !== null) onSeek(seekValueRef.current)
    setSeeking(false)
  }, [onSeek])

  const attachDragListeners = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => updateSeekFromClientX(e.clientX, e.clientY)
    const handleMouseUp = () => {
      handleSeekEnd()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateSeekFromClientX(e.touches[0].clientX, e.touches[0].clientY)
      e.preventDefault()
    }
    const handleTouchEnd = () => {
      handleSeekEnd()
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)
  }, [updateSeekFromClientX, handleSeekEnd])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      handleSeekStart(e.clientX, e.clientY)
      attachDragListeners()
    },
    [handleSeekStart, attachDragListeners]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) return
      handleSeekStart(e.touches[0].clientX, e.touches[0].clientY)
      attachDragListeners()
      e.preventDefault()
    },
    [handleSeekStart, attachDragListeners]
  )

  const totalDuration = duration || 0
  const displayedValue = seekValue ?? currentTime
  const progressPercent =
    totalDuration > 0 ? clamp((displayedValue / totalDuration) * 100, 0, 100) : 0

  return (
    <div
      ref={barRef}
      tabIndex={-1}
      role='slider'
      aria-valuemin={0}
      aria-valuemax={totalDuration}
      aria-valuenow={displayedValue}
      className='relative w-full h-1.5 rounded-xl cursor-pointer hover:h-2 transition-all duration-150 bg-white/30'
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className='absolute left-0 top-0 h-full rounded-xl bg-orange-500'
        style={{ width: `${progressPercent}%` }}
      />
      <div
        className='absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-orange-400 shadow pointer-events-none'
        style={{ left: `calc(${progressPercent}% - 6px)` }}
      />
    </div>
  )
}
