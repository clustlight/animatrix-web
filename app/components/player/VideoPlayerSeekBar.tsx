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
  /** Visual: whether to render expanded (larger) track */
  expanded?: boolean
}

export default function VideoPlayerSeekBar({
  currentTime,
  duration,
  onSeek,
  onDrag,
  rotationContainerRef,
  rotationDeg = 0,
  expanded = false
}: VideoPlayerSeekBarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const seekValueRef = useRef<number | null>(null)
  // Remember last seek value while the pointer was inside the visual bar
  const lastInsideSeekValueRef = useRef<number | null>(null)
  // Track whether the pointer's Y coordinate was inside the bar on the last update
  const pointerYInsideRef = useRef<boolean>(true)
  // Detect if rotationDeg changed while the user was actively dragging
  const rotationChangedDuringSeekRef = useRef<boolean>(false)
  const lastRotationDegRef = useRef<number>(rotationDeg)
  // Track active touch identifier so window-level handlers ignore other touches
  const activeTouchIdRef = useRef<number | null>(null)
  // Whether the drag *started* inside the actual track (prevents background taps)
  const startedInsideRef = useRef<boolean>(false)
  // Last client coords accepted by updateSeekFromClientX (used to detect jumps)
  const prevClientRef = useRef<{ x: number; y: number } | null>(null)
  // Synchronous ref to know if a drag/seek is currently active (state updates are async)
  const seekingRef = useRef<boolean>(false)
  const [seeking, setSeeking] = useState(false)
  const [seekValue, setSeekValue] = useState<number | null>(null)

  useEffect(() => {
    if (onDrag) onDrag(seeking)
  }, [seeking, onDrag])

  useEffect(() => {
    // clear transient seekValue once the player has caught up — tighten
    // threshold to reduce visible lag between playback and thumb position
    if (seekValue !== null && Math.abs(currentTime - seekValue) < 0.15) {
      setSeekValue(null)
    }
  }, [currentTime, seekValue])

  useEffect(() => {
    setSeekValue(null)
  }, [duration])

  // If rotationDeg changes while dragging, mark that a rotation occurred so
  // the finalization logic can prefer the last known in-bar value instead of
  // recalculating against possibly-transformed bounding boxes.
  useEffect(() => {
    if (seeking && lastRotationDegRef.current !== rotationDeg) {
      rotationChangedDuringSeekRef.current = true
    }
    lastRotationDegRef.current = rotationDeg
  }, [rotationDeg, seeking])

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const updateSeekFromClientX = useCallback(
    (clientX: number, clientY?: number) => {
      const bar = barRef.current
      if (!bar) return

      const rect = bar.getBoundingClientRect()

      // Determine whether the pointer is inside the actual track bounds
      const insideX = clientX >= rect.left && clientX <= rect.right
      const insideY =
        typeof clientY === 'number' ? clientY >= rect.top && clientY <= rect.bottom : true

      // If the drag did NOT start inside the track, ignore updates that are
      // completely outside the track (prevents background taps / jumps).
      if (!startedInsideRef.current && !(insideX || insideY)) return

      // Reject obviously spurious jumps (sudden coordinate teleport) unless a
      // rotation happened during the seek — this prevents unrelated touches
      // from being interpreted as a continuation of the drag.
      const prev = prevClientRef.current
      if (prev && !rotationChangedDuringSeekRef.current) {
        const dx = clientX - prev.x
        const dy = (clientY ?? prev.y) - prev.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        // if pointer teleport is larger than 300px treat as spurious
        if (dist > 300) return
      }

      // Use the visible bounding box of the bar to compute ratio.
      // If the bar is visually horizontal, use clientX vs rect.left/width.
      // If the bar is visually vertical (rotated), use clientY vs rect.top/height
      let ratio = 0
      // Only consider rotation-based inversion when a rotation container is actually provided
      const isRotated =
        !!(rotationContainerRef && rotationContainerRef.current) && Math.abs(rotationDeg) === 90

      if (rect.width >= rect.height) {
        ratio = rect.width > 0 ? clamp((clientX - rect.left) / rect.width, 0, 1) : 0
        // Invert horizontal mapping only when the parent/container is rotated
        if (isRotated && rotationDeg === -90) ratio = 1 - ratio
      } else if (clientY != null) {
        // Vertical bar case (likely due to rotation)
        const raw = rect.height > 0 ? clamp((clientY - rect.top) / rect.height, 0, 1) : 0
        // For a container rotated 90deg clockwise, top -> left (0%), bottom -> right (100%).
        // For -90deg (counterclockwise), top -> right (100%), so invert when rotated.
        ratio = isRotated && rotationDeg === -90 ? 1 - raw : raw
      }

      const nextValue = ratio * (duration || 0)

      // update prev accepted client coords
      prevClientRef.current = { x: clientX, y: clientY ?? prev?.y ?? 0 }

      // Track whether pointer was inside the visible bar area. We only want to
      // prefer the "last inside" position on touchend if the pointer left the
      // bar vertically (user dragged finger up/down and released outside).
      pointerYInsideRef.current = insideY
      if (insideX && insideY) lastInsideSeekValueRef.current = nextValue

      // Only update visible seek value when pointer is reasonably inside the
      // track or the drag legitimately started inside the track.
      if (insideX && insideY) {
        seekValueRef.current = nextValue
        setSeekValue(nextValue)
      } else if (startedInsideRef.current) {
        // allow updates while started inside (for smooth drags that exit)
        seekValueRef.current = nextValue
        setSeekValue(nextValue)
      }
    },
    [duration, rotationContainerRef, rotationDeg]
  )

  const handleSeekStart = useCallback(
    (clientX: number, clientY?: number) => {
      // reset "inside" tracking at the start of a new drag
      lastInsideSeekValueRef.current = null
      pointerYInsideRef.current = true
      // clear rotation flag for this new drag
      rotationChangedDuringSeekRef.current = false
      lastRotationDegRef.current = rotationDeg

      // determine whether the drag *starts* inside the bar
      const bar = barRef.current
      if (bar && typeof clientY === 'number') {
        const r = bar.getBoundingClientRect()
        startedInsideRef.current =
          clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
      } else {
        startedInsideRef.current = false
      }

      // update synchronous ref + state so global listeners can check immediately
      seekingRef.current = true
      prevClientRef.current = { x: clientX, y: clientY ?? 0 }
      setSeeking(true)
      updateSeekFromClientX(clientX, clientY)
    },
    [updateSeekFromClientX, rotationDeg]
  )

  const handleSeekEnd = useCallback(() => {
    // If the pointer left the bar vertically, or a rotation occurred during
    // the drag, prefer the last value recorded while the pointer was still
    // inside the bar to avoid "jumping" on release.
    let toSeek = seekValueRef.current

    if (
      (rotationChangedDuringSeekRef.current || !pointerYInsideRef.current) &&
      lastInsideSeekValueRef.current != null
    ) {
      toSeek = lastInsideSeekValueRef.current
    }

    // If the drag never actually started inside the real track, avoid final seek
    if (!startedInsideRef.current && lastInsideSeekValueRef.current == null) {
      // cleanup and exit
      seekingRef.current = false
      setSeeking(false)
      lastInsideSeekValueRef.current = null
      pointerYInsideRef.current = true
      rotationChangedDuringSeekRef.current = false
      startedInsideRef.current = false
      prevClientRef.current = null
      return
    }

    if (toSeek !== null) onSeek(toSeek)
    // update synchronous ref + state
    seekingRef.current = false
    setSeeking(false)

    // reset tracking
    lastInsideSeekValueRef.current = null
    pointerYInsideRef.current = true
    rotationChangedDuringSeekRef.current = false
    startedInsideRef.current = false
    prevClientRef.current = null
  }, [onSeek])

  const attachDragListeners = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => updateSeekFromClientX(e.clientX, e.clientY)
    const handleMouseUp = () => {
      handleSeekEnd()
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Only handle moves while we are in an active seek. This prevents other
      // touches (rotation button, UI taps) from being interpreted as seek drags.
      if (!seekingRef.current) return

      // Only respond to the touch that started the seek (by identifier).
      if (activeTouchIdRef.current != null) {
        const touch = Array.from(e.touches).find(t => t.identifier === activeTouchIdRef.current)
        if (touch) {
          updateSeekFromClientX(touch.clientX, touch.clientY)
          e.preventDefault()
        }
      } else if (e.touches.length > 0) {
        // fallback: use first touch only if we're actively seeking
        updateSeekFromClientX(e.touches[0].clientX, e.touches[0].clientY)
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e?: TouchEvent) => {
      // If changedTouches contains our active touch id, finalize and cleanup.
      if (e && activeTouchIdRef.current != null) {
        const ended = Array.from(e.changedTouches).some(
          t => t.identifier === activeTouchIdRef.current
        )
        if (!ended) return
      }

      handleSeekEnd()
      activeTouchIdRef.current = null
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
      // record touch identifier so global listeners ignore other touches
      activeTouchIdRef.current = e.touches[0].identifier
      handleSeekStart(e.touches[0].clientX, e.touches[0].clientY)
      attachDragListeners()
      // do not call preventDefault here — use CSS `touch-action: none` on the element
    },
    [handleSeekStart, attachDragListeners]
  )

  const totalDuration = duration || 0
  const displayedValue = seekValue ?? currentTime
  const progressPercent =
    totalDuration > 0 ? clamp((displayedValue / totalDuration) * 100, 0, 100) : 0

  // Visual sizing that can be expanded to match an enlarged hit area
  const trackClass = expanded ? 'h-3' : 'h-1.5'
  const thumbClass = expanded ? 'w-6 h-6' : 'w-3 h-3'
  const thumbHalfPx = expanded ? 12 : 6

  return (
    <div
      ref={barRef}
      tabIndex={-1}
      role='slider'
      data-player-seekbar-inner
      aria-valuemin={0}
      aria-valuemax={totalDuration}
      aria-valuenow={displayedValue}
      className={`relative w-full ${trackClass} rounded-xl cursor-pointer hover:h-2 transition-all duration-150 bg-white/30`}
      style={{ touchAction: 'none' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div
        className='absolute left-0 top-0 h-full rounded-xl bg-orange-500'
        style={{ width: `${progressPercent}%` }}
      />
      <div
        className={`absolute top-1/2 -translate-y-1/2 ${thumbClass} rounded-full bg-orange-400 shadow pointer-events-none`}
        style={{ left: `calc(${progressPercent}% - ${thumbHalfPx}px)` }}
      />
    </div>
  )
}
