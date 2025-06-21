import React, { useRef, useEffect } from 'react'

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

  const handleDrag = (dragging: boolean) => onDrag?.(dragging)

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
        onMouseDown={() => handleDrag(true)}
        onMouseUp={() => handleDrag(false)}
        onTouchStart={() => handleDrag(true)}
        onTouchEnd={() => handleDrag(false)}
      />
    </div>
  )
}
