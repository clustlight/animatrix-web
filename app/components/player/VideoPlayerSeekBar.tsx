import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'

type VideoPlayerSeekBarProps = {
  currentTime: number // Current playback time
  duration: number // Video duration
  onSeek: (sec: number) => void // Seek callback
  onDrag?: (dragging: boolean) => void // Optional drag callback
}

export default function VideoPlayerSeekBar({
  currentTime,
  duration,
  onSeek,
  onDrag
}: VideoPlayerSeekBarProps) {
  const [seeking, setSeeking] = useState(false) // Seeking state
  const [seekValue, setSeekValue] = useState<number | null>(null) // Seek value

  // Notify drag state
  useEffect(() => {
    onDrag?.(seeking)
  }, [seeking, onDrag])

  // Reset seek value if close to current time
  useEffect(() => {
    if (seekValue !== null && Math.abs(currentTime - seekValue) < 0.3) {
      setSeekValue(null)
    }
  }, [currentTime, seekValue])

  const handleSeekStart = () => setSeeking(true)
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value))
  }
  const handleSeekEnd = () => {
    if (seekValue !== null) onSeek(seekValue)
    setSeeking(false)
  }

  return (
    <input
      tabIndex={-1}
      type='range'
      min={0}
      max={duration || 0}
      step={0.1}
      value={seekValue !== null ? seekValue : currentTime}
      onMouseDown={handleSeekStart}
      onTouchStart={handleSeekStart}
      onChange={handleChange}
      onMouseUp={handleSeekEnd}
      onTouchEnd={handleSeekEnd}
      className='w-full accent-orange-500 h-1 rounded-xl cursor-pointer'
    />
  )
}
