import { useEffect, useState, useCallback, useRef } from 'react'

type VideoPlayerSeekBarProps = {
  currentTime: number
  duration: number
  onSeek: (sec: number) => void
  onDrag?: (dragging: boolean) => void
}

export default function VideoPlayerSeekBar({
  currentTime,
  duration,
  onSeek,
  onDrag
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
    (clientX: number) => {
      const bar = barRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
      const nextValue = ratio * (duration || 0)
      seekValueRef.current = nextValue
      setSeekValue(nextValue)
    },
    [duration]
  )

  const handleSeekStart = useCallback(
    (clientX: number) => {
      setSeeking(true)
      updateSeekFromClientX(clientX)
    },
    [updateSeekFromClientX]
  )

  const handleSeekEnd = useCallback(() => {
    if (seekValueRef.current !== null) onSeek(seekValueRef.current)
    setSeeking(false)
  }, [onSeek])

  const attachDragListeners = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => updateSeekFromClientX(e.clientX)
    const handleMouseUp = () => {
      handleSeekEnd()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateSeekFromClientX(e.touches[0].clientX)
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
      handleSeekStart(e.clientX)
      attachDragListeners()
    },
    [handleSeekStart, attachDragListeners]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) return
      handleSeekStart(e.touches[0].clientX)
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
