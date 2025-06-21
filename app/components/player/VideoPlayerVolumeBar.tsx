import React, { useRef, useEffect } from 'react'

type VideoPlayerVolumeBarProps = {
  volume: number // Volume value (0 to 1)
  onVolumeChange: (v: number) => void // Volume change handler
  onDrag?: (dragging: boolean) => void // Optional drag state handler
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
      let newVolume = volume + delta
      newVolume = Math.max(0, Math.min(1, newVolume))
      if (newVolume !== volume) {
        onVolumeChange(Number(newVolume.toFixed(2)))
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [volume, onVolumeChange])

  // Handle drag start
  const handleDragStart = () => onDrag?.(true)

  // Handle drag end
  const handleDragEnd = () => onDrag?.(false)

  return (
    <div
      ref={barRef}
      className='flex items-center gap-2'
      style={{ minHeight: 32, alignItems: 'center' }}
    >
      <input
        tabIndex={-1}
        type='range'
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={e => onVolumeChange(Number(e.target.value))}
        className='w-32 h-1.5 accent-orange-500 cursor-pointer'
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
      />
    </div>
  )
}
