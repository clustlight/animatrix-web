export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

export function getSeekTimeFromPoint({
  rect,
  clientX,
  clientY,
  duration,
  rotationDeg,
  isRotated
}: {
  rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>
  clientX: number
  clientY?: number
  duration: number
  rotationDeg: number
  isRotated: boolean
}) {
  let ratio = 0

  if (rect.width >= rect.height) {
    ratio = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
    if (isRotated && rotationDeg === -90) ratio = 1 - ratio
  } else if (clientY != null) {
    const raw = rect.height > 0 ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0
    ratio = isRotated && rotationDeg === -90 ? 1 - raw : raw
  }

  return ratio * (duration || 0)
}

export function formatPlayerTime(sec: number, showHours = false) {
  const totalSeconds = Math.floor(sec)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (showHours) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
