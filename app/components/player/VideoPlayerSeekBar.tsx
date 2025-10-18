import { useEffect, useState, useCallback } from 'react'
import type { ChangeEvent } from 'react'

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

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSeekValue(Number(e.target.value))
  }, [])

  const handleSeekStart = useCallback(() => {
    setSeeking(true)
  }, [])

  const handleSeekEnd = useCallback(() => {
    if (seekValue !== null) onSeek(seekValue)
    setSeeking(false)
  }, [seekValue, onSeek])

  const inputClass =
    'w-full accent-orange-500 h-1 rounded-xl cursor-pointer hover:h-2 transition-all duration-150'

  return (
    <input
      tabIndex={-1}
      type='range'
      min={0}
      max={duration || 0}
      step={0.1}
      value={seekValue ?? currentTime}
      onMouseDown={handleSeekStart}
      onTouchStart={handleSeekStart}
      onChange={handleSeek}
      onMouseUp={handleSeekEnd}
      onTouchEnd={handleSeekEnd}
      className={inputClass}
    />
  )
}
