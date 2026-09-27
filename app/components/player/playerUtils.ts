export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value))

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
