import React, { useRef, useEffect, useCallback } from 'react'

type VideoPlayerVolumeBarProps = {
  volume: number
  onVolumeChange: (v: number) => void
  onDrag?: (dragging: boolean) => void
}

export default function VideoPlayerVolumeBar({
  volume,
  onVolumeChange,
  onDrag
}: VideoPlayerVolumeBarProps) {
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY < 0 ? 0.1 : -0.1
      const newVolume = Math.max(0, Math.min(1, +(volume + delta).toFixed(2)))
      if (newVolume !== volume) onVolumeChange(newVolume)
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [volume, onVolumeChange])

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const updateVolumeFromClientX = useCallback(
    (clientX: number) => {
      const bar = barRef.current
      if (!bar) return
      const rect = bar.getBoundingClientRect()
      const ratio = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
      onVolumeChange(Number(ratio.toFixed(2)))
    },
    [onVolumeChange]
  )

  const handleDragEnd = useCallback(() => {
    onDrag?.(false)
  }, [onDrag])

  const attachDragListeners = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => updateVolumeFromClientX(e.clientX)
    const handleMouseUp = () => {
      handleDragEnd()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateVolumeFromClientX(e.touches[0].clientX)
      e.preventDefault()
    }
    const handleTouchEnd = () => {
      handleDragEnd()
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('touchcancel', handleTouchEnd)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('touchcancel', handleTouchEnd)
  }, [updateVolumeFromClientX, handleDragEnd])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      onDrag?.(true)
      updateVolumeFromClientX(e.clientX)
      attachDragListeners()
    },
    [attachDragListeners, onDrag, updateVolumeFromClientX]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 0) return
      onDrag?.(true)
      updateVolumeFromClientX(e.touches[0].clientX)
      attachDragListeners()
      e.preventDefault()
    },
    [attachDragListeners, onDrag, updateVolumeFromClientX]
  )

  const progressPercent = clamp(volume * 100, 0, 100)

  return (
    <div className='flex items-center gap-2' style={{ minHeight: 32, alignItems: 'center' }}>
      <div
        ref={barRef}
        tabIndex={-1}
        role='slider'
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={volume}
        className='relative w-32 h-1.5 rounded-xl cursor-pointer hover:h-2 transition-all duration-150 bg-white/30'
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
    </div>
  )
}
