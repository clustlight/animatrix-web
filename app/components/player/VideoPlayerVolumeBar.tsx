import type React from 'react'

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
  // Handle drag start
  const handleDragStart = () => onDrag?.(true)

  // Handle drag end
  const handleDragEnd = () => onDrag?.(false)

  // Handle mouse wheel volume adjustment
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.1 : -0.1
    const newVolume = Math.max(0, Math.min(1, volume + delta))
    onVolumeChange(Number(newVolume.toFixed(2)))
  }

  // Handle slider change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(Number(e.target.value))
  }

  return (
    <div className='flex items-center gap-2'>
      <input
        tabIndex={-1}
        type='range'
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={handleChange}
        className='w-32 h-1.5 accent-orange-500 cursor-pointer'
        onMouseDown={handleDragStart}
        onMouseUp={handleDragEnd}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
        onWheel={handleWheel}
      />
    </div>
  )
}
