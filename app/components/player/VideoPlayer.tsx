import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import type ReactPlayer from 'react-player'
import VideoPlayerMobile from './VideoPlayer.mobile'
import VideoPlayerPC from './VideoPlayer.pc'
import { useFadeUI } from './useFadeUI'
import { useFullscreen } from './useFullscreen'
import { usePersistedVolume } from './usePersistedVolume'
import { useVideoPlayerShortcuts } from './useVideoPlayerShortcuts'
import { useInputFocus } from './useInputFocus'

function formatTimeLabel(sec: number, showHours = false) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (showHours) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Video player component
type VideoPlayerProps = {
  url: string
  /** Called when playback ends. Receives { keepFullscreen } on mobile fullscreen end */
  onEnded?: (opts?: { keepFullscreen?: boolean }) => void
  autoPlay?: boolean
  initialSeek?: number
  onTimeUpdate?: (sec: number) => void
  title?: string
  season?: string
  /** If true, attempt to enter fullscreen on mount (used when navigating to next episode)
   * Only applied on mobile devices.
   */
  startFullscreen?: boolean
}

export default function VideoPlayer({
  url,
  onEnded,
  autoPlay = false,
  initialSeek,
  onTimeUpdate,
  title,
  season,
  startFullscreen = false
}: VideoPlayerProps) {
  // formatTimeLabel moved to module scope
  const playerRef = useRef<ReactPlayer>(null as unknown as ReactPlayer)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rotatedContainerRef = useRef<HTMLDivElement | null>(null)
  // rotation direction for fullscreen mobile (90 or -90)
  const [rotationDeg, setRotationDeg] = useState<number>(90)
  const toggleRotation = () => {
    // guard against stray touch/seek while layout is animating/transforming
    rotationTransitioning.current = true
    if (rotationTransitionTimer.current) clearTimeout(rotationTransitionTimer.current)
    rotationTransitionTimer.current = window.setTimeout(() => {
      rotationTransitioning.current = false
      rotationTransitionTimer.current = null
    }, 400)

    // briefly suppress click-to-toggle-play that can follow touch
    suppressClickTemporary()

    setRotationDeg(d => (d === 90 ? -90 : 90))
  }

  // State
  const [playing, setPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = usePersistedVolume()
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isReady, setIsReady] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [hasSeeked, setHasSeeked] = useState(false)
  // Mobile detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width:600px)').matches : false
  )

  // UI state
  const [actionIcon, setActionIcon] = useState<ReactNode | null>(null)
  const [actionText, setActionText] = useState<string | null>(null)
  const [actionSide, setActionSide] = useState<'left' | 'right' | null>(null)
  const [showUI, setShowUI] = useState(true)
  // Mobile fullscreen UI visibility (auto-hide after inactivity)
  const [mobileUIVisible, setMobileUIVisible] = useState(true)
  const mobileHideTimer = useRef<NodeJS.Timeout | null>(null)

  const clearMobileHide = () => {
    if (mobileHideTimer.current) {
      clearTimeout(mobileHideTimer.current)
      mobileHideTimer.current = null
    }
  }

  const scheduleMobileHide = () => {
    clearMobileHide()
    mobileHideTimer.current = setTimeout(() => setMobileUIVisible(false), 3000)
  }
  // Double-tap detection refs
  const lastTapTime = useRef<number>(0)
  const lastTapX = useRef<number>(0)
  const lastTapY = useRef<number>(0)
  const lastTapWasDouble = useRef<boolean>(false)
  // per-side tap timing/timers
  const sideTapTime = useRef<{ left: number; right: number }>({ left: 0, right: 0 })
  const sideSingleTapTimer = useRef<{ left: number | null; right: number | null }>({
    left: null,
    right: null
  })
  const hideUITimer = useRef<NodeJS.Timeout | null>(null)
  const lastSeekDragEndTime = useRef<number>(0)
  // Suppress next click briefly after certain touch interactions (seek end / UI toggle)
  const suppressNextClick = useRef<boolean>(false)
  const suppressClickTemporary = (ms = 350) => {
    suppressNextClick.current = true
    window.setTimeout(() => (suppressNextClick.current = false), ms)
  }

  // Track whether the user is actively dragging/seeking (set by SeekBar via onDrag)
  const isUserSeekingRef = useRef<boolean>(false)
  // Prevent duplicate onEnded handling within short window
  const lastEndedTime = useRef<number>(0)

  // Custom hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(
    containerRef as unknown as React.RefObject<HTMLElement>
  )
  const { fadeOut, hovered, setHovered, setShortcutActive } = useFadeUI({
    isFullscreen
  })
  const inputFocused = useInputFocus()

  // Preserve currentTime across remounts when switching fullscreen (we render a different ReactPlayer node)
  const pendingSeekOnReady = useRef<number | null>(null)
  // prevent accidental touch / seek events while the browser/DOM is transitioning into fullscreen
  const fullscreenTransitioning = useRef(false)
  const fullscreenTransitionTimer = useRef<number | null>(null)
  // guard for rotation transitions (toggleRotation can cause layout/transform changes that generate stray touch events)
  const rotationTransitioning = useRef(false)
  const rotationTransitionTimer = useRef<number | null>(null)

  // Track the outer (expanded) seekbar hit-area interaction so we can prefer the
  // last position that was *inside* the visible seekbar when finalizing. This
  // prevents jumps when layout/rotation changes or the finger leaves vertically.
  const seekbarLastInsideValueRef = useRef<number | null>(null)
  const seekbarPointerInsideRef = useRef<boolean>(true)
  const seekbarTouchActiveRef = useRef<boolean>(false)
  // Whether the touch *started* inside the visible bar. If the touch never
  // entered the visible bar during its lifetime, we will not perform a final
  // seek to avoid accidental jumps from background taps.
  const seekbarStartedInsideRef = useRef<boolean>(false)
  const seekbarLastRotationDegRef = useRef<number>(rotationDeg)
  const seekbarRotationChangedRef = useRef<boolean>(false)

  const handleToggleFullscreen = () => {
    // capture current time before toggling so the new player can resume
    const t = playerRef.current?.getCurrentTime?.() ?? currentTime
    pendingSeekOnReady.current = t

    // mark transition window (ignore touch/seeks for a short duration)
    fullscreenTransitioning.current = true
    if (fullscreenTransitionTimer.current) clearTimeout(fullscreenTransitionTimer.current)
    fullscreenTransitionTimer.current = window.setTimeout(() => {
      fullscreenTransitioning.current = false
      fullscreenTransitionTimer.current = null
    }, 700)

    toggleFullscreen()
  }

  // Keyboard shortcuts
  useVideoPlayerShortcuts({
    playerRef,
    duration,
    setPlaying,
    setVolume,
    toggleFullscreen: handleToggleFullscreen,
    shortcutActiveSetter: setShortcutActive,
    setPlaybackRate,
    playbackRate,
    onActionIcon: (icon: ReactNode, text?: string) => {
      setActionIcon(icon)
      setActionText(text ?? null)
    },
    disable: inputFocused
  })

  // --- Handlers ---
  const handleSeek = (sec: number) => {
    // suppress seeks during rotation transition (prevents stray seeks when rotating)
    if (rotationTransitioning.current) {
      return
    }

    playerRef.current?.seekTo(sec, 'seconds')
  }

  const handleSeekRelative = (delta: number) => {
    // block relative seeks while rotating
    if (rotationTransitioning.current) {
      return
    }

    const player = playerRef.current
    if (!player) return
    const base = player.getCurrentTime?.() ?? currentTime
    const maxTime = duration > 0 ? duration : base
    const next = Math.max(0, Math.min(maxTime, base + delta))
    player.seekTo(next, 'seconds')
  }
  const handlePlayPause = () => setPlaying(p => !p)
  const handlePlaybackRateChange = (rate: number) => setPlaybackRate(rate)
  const handleVolumeChange = (v: number) => setVolume(v)

  // Toggle play/pause on player click (except controls)
  const handlePlayerClick = (e: MouseEvent) => {
    // ignore clicks while transitioning fullscreen or rotating to avoid accidental seeks/toggles
    if (fullscreenTransitioning.current || rotationTransitioning.current) return
    if (Date.now() - lastSeekDragEndTime.current < 50) return
    if (suppressNextClick.current) return
    // Prevent click immediately after a double-tap action
    if (lastTapWasDouble.current) return
    // On mobile, only the central button should toggle play/pause
    if (isMobile) return
    const controls = containerRef.current?.querySelector('[data-player-controls]')
    if (controls && controls.contains(e.target as Node)) return
    setPlaying(p => !p)
  }

  // Central button click wrapper to avoid double-response when double-tap occurs
  const handleCenterButtonClick = () => {
    if (Date.now() - lastTapTime.current < 350) return
    setPlaying(p => !p)
    // Reset mobile UI hide timer when user interacts
    setMobileUIVisible(true)
    scheduleMobileHide()
  }

  // Per-area touch handlers for reliable double-tap detection
  const handleEdgeTouchEnd = (side: 'left' | 'right', e: React.TouchEvent) => {
    if (!isMobile) return
    // Prevent the touch from bubbling to the rotated container which would toggle UI
    e.preventDefault()
    e.stopPropagation()
    const t = e.changedTouches[0]
    const now = Date.now()
    const dt = now - sideTapTime.current[side]
    const dx = Math.abs(t.clientX - lastTapX.current)
    const dy = Math.abs(t.clientY - lastTapY.current)
    const isDouble = dt > 0 && dt < 350 && dx < 40 && dy < 40

    // If we're mid-transition, ignore single taps but still allow double-tap seeks
    if ((fullscreenTransitioning.current || rotationTransitioning.current) && !isDouble) return

    if (isDouble) {
      // Cancel any pending single-tap action for this side
      const timer = sideSingleTapTimer.current[side]
      if (timer) {
        clearTimeout(timer)
        sideSingleTapTimer.current[side] = null
      }

      handleSeekRelative(side === 'left' ? -10 : 10)
      // Use side overlay only; clear generic action icon/text to avoid flicker
      setActionIcon(null)
      setActionText(null)
      setActionSide(side)
      lastTapWasDouble.current = true
      window.setTimeout(() => (lastTapWasDouble.current = false), 400)
    } else {
      const existingTimer = sideSingleTapTimer.current[side]
      if (existingTimer) clearTimeout(existingTimer)
      sideSingleTapTimer.current[side] = window.setTimeout(() => {
        sideSingleTapTimer.current[side] = null
        setMobileUIVisible(prev => {
          const next = !prev
          if (next) scheduleMobileHide()
          else clearMobileHide()
          return next
        })
        // suppress the following click to avoid accidental play/pause
        suppressClickTemporary()
      }, 300)
    }

    sideTapTime.current[side] = now
    lastTapX.current = t.clientX
    lastTapY.current = t.clientY
  }

  const handleLeftAreaTouchEnd = (e: React.TouchEvent) => handleEdgeTouchEnd('left', e)
  const handleRightAreaTouchEnd = (e: React.TouchEvent) => handleEdgeTouchEnd('right', e)

  // Handle single-tap on rotated container to show mobile UI (ignore when a double-tap just occurred)
  const handleRotatedContainerTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return
    if (rotationTransitioning.current) return
    if (lastTapWasDouble.current) return
    // If the touch was on an interactive element (button/input/etc), ignore here
    const t = e.changedTouches[0]
    const el = document.elementFromPoint(t.clientX, t.clientY) as Element | null
    if (el && el.closest('button, input, textarea, [data-player-controls], [data-player-seekbar]'))
      return

    // Toggle UI: hide when currently visible, show when hidden
    // Prevent the synthetic click that follows touchend
    e.preventDefault()
    e.stopPropagation()

    if (mobileUIVisible) {
      setMobileUIVisible(false)
      clearMobileHide()
    } else {
      setMobileUIVisible(true)
      scheduleMobileHide()
    }

    // suppress the next click to avoid accidental play/pause toggle
    suppressClickTemporary()
  }

  // Touch handlers for enlarged seekbar hit area (mobile fullscreen)
  const handleSeekbarTouch = (e: React.TouchEvent) => {
    if (fullscreenTransitioning.current || rotationTransitioning.current) return
    if (!isMobile || !isFullscreen) return

    // If the touch started inside the inner seekbar, let the inner component
    // handle drag/end (prevents duplicate/conflicting seeks).
    const startTarget = (e.target as Element) || null
    if (startTarget && startTarget.closest('[data-player-seekbar-inner]')) return

    const t = e.changedTouches[0]
    const container = e.currentTarget as HTMLElement
    // find the visible seekbar visual element
    const visual = container.querySelector('[data-player-seekbar-visual]') as HTMLElement | null
    if (!visual || duration <= 0) return

    // initialize per-touch tracking on start
    if (e.type === 'touchstart') {
      seekbarTouchActiveRef.current = true
      seekbarLastRotationDegRef.current = rotationDeg
      seekbarRotationChangedRef.current = false
      seekbarLastInsideValueRef.current = null
      seekbarPointerInsideRef.current = true

      // Use the actual track (innerBar) for "started inside" checks so that
      // padding/labels in the visual container are ignored.
      const innerBarStart = visual.querySelector(
        '[data-player-seekbar-inner]'
      ) as HTMLElement | null
      const startRect = innerBarStart
        ? innerBarStart.getBoundingClientRect()
        : visual.getBoundingClientRect()
      const startInsideX = t.clientX >= startRect.left && t.clientX <= startRect.right
      const startInsideY = t.clientY >= startRect.top && t.clientY <= startRect.bottom
      seekbarStartedInsideRef.current = startInsideX && startInsideY

      // If it started inside the real track, perform an immediate live seek so
      // the user sees feedback. Use vertical/horizontal mapping consistent with
      // the inner seek bar component.
      if (seekbarStartedInsideRef.current) {
        const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
        const isVerticalStart = startRect.height > startRect.width
        const startRatio = isVerticalStart
          ? (() => {
              const raw =
                startRect.height > 0
                  ? clamp((t.clientY - startRect.top) / startRect.height, 0, 1)
                  : 0
              return Math.abs(rotationDeg) === 90 && rotationDeg === -90 ? 1 - raw : raw
            })()
          : (() => {
              const sx = clamp(t.clientX, startRect.left, startRect.right)
              return startRect.width > 0 ? clamp((sx - startRect.left) / startRect.width, 0, 1) : 0
            })()
        const stime = Math.max(0, Math.min(duration, startRatio * duration))
        seekbarLastInsideValueRef.current = stime
        handleSeek(stime)
      }
    } else {
      // detect rotation/layout change that happened during the active touch
      if (seekbarLastRotationDegRef.current !== rotationDeg) {
        seekbarRotationChangedRef.current = true
        seekbarLastRotationDegRef.current = rotationDeg
      }
    }

    // Prefer the actual seek track element if present — the visual container
    // includes labels/padding and should not be used for coordinate mapping.
    const innerBar = visual.querySelector('[data-player-seekbar-inner]') as HTMLElement | null
    const rect = innerBar ? innerBar.getBoundingClientRect() : visual.getBoundingClientRect()

    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
    const isVertical = rect.height > rect.width
    let ratio = 0

    if (!isVertical) {
      const x = clamp(t.clientX, rect.left, rect.right)
      ratio = rect.width > 0 ? clamp((x - rect.left) / rect.width, 0, 1) : 0
      if (Math.abs(rotationDeg) === 90 && rotationDeg === -90) ratio = 1 - ratio
    } else {
      const raw = rect.height > 0 ? clamp((t.clientY - rect.top) / rect.height, 0, 1) : 0
      ratio = Math.abs(rotationDeg) === 90 && rotationDeg === -90 ? 1 - raw : raw
    }

    const time = Math.max(0, Math.min(duration, ratio * duration))

    // track whether the pointer was inside the actual track on this update
    const insideX = t.clientX >= rect.left && t.clientX <= rect.right
    const insideY = t.clientY >= rect.top && t.clientY <= rect.bottom
    seekbarPointerInsideRef.current = insideY
    if (insideX && insideY) seekbarLastInsideValueRef.current = time

    if (e.type === 'touchstart' || e.type === 'touchmove') {
      // show UI and keep it visible while interacting
      setMobileUIVisible(true)
      clearMobileHide()
      // Only perform live seeks when the pointer is vertically inside the
      // visible bar. If the user drags above/below the bar we should not
      // update playback continuously (prevents vertical-drift); final
      // seek on touchend will prefer the last "inside" value.
      if (insideY) {
        handleSeek(time)
      }
    } else if (e.type === 'touchend') {
      lastSeekDragEndTime.current = Date.now()

      // If the touch never entered the visible bar and we have no recorded
      // inside value, treat this as a background tap — do not perform a seek.
      if (!seekbarStartedInsideRef.current && seekbarLastInsideValueRef.current == null) {
        // reset tracking and exit without seeking
        seekbarLastInsideValueRef.current = null
        seekbarPointerInsideRef.current = true
        seekbarTouchActiveRef.current = false
        seekbarRotationChangedRef.current = false
        seekbarStartedInsideRef.current = false
        // still schedule UI hide/suppress click to keep UX consistent
        scheduleMobileHide()
        suppressClickTemporary()
        return
      }

      // Prefer the last "inside" value if the pointer left vertically or a
      // rotation/layout change happened while dragging — this avoids jumping
      // to 0 or duration when the visual's bounding box moved under the touch.
      let finalTime = time
      if (
        (seekbarRotationChangedRef.current || !seekbarPointerInsideRef.current) &&
        seekbarLastInsideValueRef.current != null
      ) {
        finalTime = seekbarLastInsideValueRef.current
      }

      // finalize seek
      handleSeek(finalTime)

      // schedule hide and suppress following click
      scheduleMobileHide()
      suppressClickTemporary()

      // reset tracking
      seekbarLastInsideValueRef.current = null
      seekbarPointerInsideRef.current = true
      seekbarTouchActiveRef.current = false
      seekbarRotationChangedRef.current = false
      seekbarStartedInsideRef.current = false
    }
  }

  // Show/hide UI
  const handleMouseEnter = () => {
    setShowUI(true)
    if (hideUITimer.current) {
      clearTimeout(hideUITimer.current)
      hideUITimer.current = null
    }
  }
  const handleMouseLeave = () => {
    if (hideUITimer.current) clearTimeout(hideUITimer.current)
    hideUITimer.current = setTimeout(() => setShowUI(false), 3000)
  }

  // --- Cursor & UI fade logic ---
  const [mouseMoved, setMouseMoved] = useState(true)

  // Hide action overlay after delay
  useEffect(() => {
    if (actionIcon || actionText) {
      const t = setTimeout(() => {
        setActionIcon(null)
        setActionText(null)
      }, 900)
      return () => clearTimeout(t)
    }
  }, [actionIcon, actionText])

  // Hide custom mobile action side indicator after same delay
  useEffect(() => {
    if (actionSide) {
      const t = setTimeout(() => setActionSide(null), 900)
      return () => clearTimeout(t)
    }
  }, [actionSide])

  // Cleanup timers on unmount (transition/single-tap/hide timers)
  useEffect(() => {
    return () => {
      if (fullscreenTransitionTimer.current) clearTimeout(fullscreenTransitionTimer.current)
      if (rotationTransitionTimer.current) clearTimeout(rotationTransitionTimer.current)
      if (sideSingleTapTimer.current.left) clearTimeout(sideSingleTapTimer.current.left)
      if (sideSingleTapTimer.current.right) clearTimeout(sideSingleTapTimer.current.right)
      if (mobileHideTimer.current) clearTimeout(mobileHideTimer.current as unknown as number)
      if (hideUITimer.current) clearTimeout(hideUITimer.current as unknown as number)
    }
  }, [])

  // Auto-hide mobile fullscreen UI after inactivity; show on single tap
  useEffect(() => {
    if (isFullscreen && isMobile) {
      setMobileUIVisible(true)
      scheduleMobileHide()
    } else {
      setMobileUIVisible(true)
      clearMobileHide()
    }
    return () => clearMobileHide()
  }, [isFullscreen, isMobile])

  // Cursor display in fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      if (containerRef.current) containerRef.current.style.cursor = ''
      return
    }
    if (containerRef.current)
      containerRef.current.style.cursor = !mouseMoved || fadeOut || !showUI ? 'none' : ''
  }, [isFullscreen, showUI, fadeOut, mouseMoved])

  // Show UI on mouse move in fullscreen
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleMouseMove = () => {
      setMouseMoved(true)
      setHovered(true)
    }
    el.addEventListener('mousemove', handleMouseMove)
    return () => el.removeEventListener('mousemove', handleMouseMove)
  }, [setHovered])

  // Hide cursor if fadeOut or UI hidden
  useEffect(() => {
    if (!isFullscreen) {
      setMouseMoved(true)
      return
    }
    if (fadeOut || !showUI) setMouseMoved(false)
  }, [fadeOut, showUI, isFullscreen])

  // UI visibility condition
  const isUIVisible = isFullscreen ? hovered && !fadeOut : hovered || !playing

  // Get the video aspect ratio
  const handleReady = useCallback(() => {
    setIsReady(true)
    const video = playerRef.current?.getInternalPlayer() as HTMLVideoElement | null
    if (video && video.videoWidth && video.videoHeight) {
      setAspectRatio(video.videoWidth / video.videoHeight)
    }
    // If a seek was requested prior to remount (fullscreen toggle), apply it now
    if (pendingSeekOnReady.current != null) {
      const t = pendingSeekOnReady.current
      pendingSeekOnReady.current = null
      // clamp to known duration when available and ignore invalid values
      const valid = Number.isFinite(t) && t >= 0
      if (valid) {
        const target = duration > 0 ? Math.min(t, duration) : t
        playerRef.current?.seekTo(target, 'seconds')
      }
    }
  }, [duration])

  // Update mobile flag on resize/orientation change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width:600px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Callback on video end (stable reference)
  const handleEnded = useCallback(() => {
    // If the user is actively seeking, ignore onEnded events until they release.
    if (isUserSeekingRef.current) return

    // prevent duplicate handling
    const now = Date.now()
    if (now - lastEndedTime.current < 1000) return
    lastEndedTime.current = now

    if (onEnded) onEnded({ keepFullscreen: isFullscreen && isMobile })
  }, [isFullscreen, isMobile, onEnded])

  useEffect(() => {
    setPlaying(autoPlay)
  }, [autoPlay, url])

  useEffect(() => {
    setHasSeeked(false)
  }, [url, initialSeek])

  // Reset transient / non-video UI state when the source URL (episode) changes.
  // VideoPlayer intentionally stays mounted when switching episodes so we must
  // explicitly clear any UI that should not persist across episodes.
  useEffect(() => {
    setIsReady(false)
    setAspectRatio(null)
    setCurrentTime(0)

    // Clear transient UI overlays and ensure the UI is visible for the new episode
    setActionIcon(null)
    setActionText(null)
    setActionSide(null)
    setMobileUIVisible(true)
    clearMobileHide()
    setShowUI(true)

    // Reset pending/interaction refs so the new episode starts clean
    pendingSeekOnReady.current = null
    isUserSeekingRef.current = false
    seekbarLastInsideValueRef.current = null
    seekbarPointerInsideRef.current = true
    seekbarTouchActiveRef.current = false
    seekbarStartedInsideRef.current = false
    seekbarRotationChangedRef.current = false
  }, [url])

  useEffect(() => {
    if (isReady && initialSeek != null && !hasSeeked) {
      playerRef.current?.seekTo(initialSeek, 'seconds')
      setHasSeeked(true)
    }
  }, [isReady, initialSeek, hasSeeked])

  useEffect(() => {
    if (!onTimeUpdate) return
    const interval = setInterval(() => {
      const sec = playerRef.current?.getCurrentTime?.() ?? 0
      onTimeUpdate(sec)
    }, 1000)
    return () => clearInterval(interval)
  }, [onTimeUpdate])

  // small helpers passed into platform components
  const onPlayerProgress = ({ playedSeconds }: { playedSeconds: number }) => {
    setCurrentTime(playedSeconds)

    // If the underlying HTMLVideoElement reports ended, call the handler.
    const internal = playerRef.current?.getInternalPlayer() as HTMLVideoElement | null
    if (internal?.ended) {
      handleEnded()
      return
    }

    // Additional time-based safety: if progressed to (duration - eps) call ended.
    const eps = 0.5
    if (
      duration > 0 &&
      !isUserSeekingRef.current &&
      Number.isFinite(playedSeconds) &&
      playedSeconds >= Math.max(0, duration - eps)
    ) {
      handleEnded()
    }
  }

  const onPlayerPlay = () => setPlaying(true)
  const onPlayerPause = () => setPlaying(false)

  // Fallback: if 'ended' event is missed (some mobile browsers), detect by time
  useEffect(() => {
    if (duration <= 0) return
    const eps = 0.5
    if (
      !isUserSeekingRef.current &&
      Number.isFinite(currentTime) &&
      currentTime >= Math.max(0, duration - eps)
    ) {
      handleEnded()
    }
  }, [currentTime, duration, handleEnded])

  const handleSeekBarDrag = (dragging: boolean) => {
    isUserSeekingRef.current = dragging

    if (dragging) {
      if (isMobile) {
        setMobileUIVisible(true)
        clearMobileHide()
      }
    } else {
      lastSeekDragEndTime.current = Date.now()
      if (isMobile) {
        scheduleMobileHide()
        suppressClickTemporary()
      }

      // If the user just released and the player is already at/near the end,
      // treat it as an intentional end and call handleEnded once.
      const eps = 0.5
      const current = playerRef.current?.getCurrentTime?.() ?? 0
      if (Number.isFinite(current) && duration > 0 && current >= Math.max(0, duration - eps)) {
        const now = Date.now()
        if (now - lastEndedTime.current > 1000) {
          lastEndedTime.current = now
          handleEnded()
        }
      }
    }
  }

  // If parent requested startFullscreen (e.g. navigating from previous fullscreen mobile episode), enter fullscreen on mount
  useEffect(() => {
    if (startFullscreen && isMobile && !isFullscreen) {
      // use the existing handler so pending-seek/transition guard are applied
      handleToggleFullscreen()
    }
  }, [startFullscreen])

  // --- Render ---
  return isMobile ? (
    <VideoPlayerMobile
      containerRef={containerRef}
      playerRef={playerRef}
      rotatedContainerRef={rotatedContainerRef}
      url={url}
      playing={playing}
      volume={volume}
      playbackRate={playbackRate}
      isFullscreen={isFullscreen}
      aspectRatio={aspectRatio}
      isReady={isReady}
      rotationDeg={rotationDeg}
      toggleRotation={toggleRotation}
      mobileUIVisible={mobileUIVisible}
      setMobileUIVisible={setMobileUIVisible}
      scheduleMobileHide={scheduleMobileHide}
      clearMobileHide={clearMobileHide}
      handleCenterButtonClick={handleCenterButtonClick}
      handleLeftAreaTouchEnd={handleLeftAreaTouchEnd}
      handleRightAreaTouchEnd={handleRightAreaTouchEnd}
      handleRotatedContainerTouchEnd={handleRotatedContainerTouchEnd}
      handleSeekbarTouch={handleSeekbarTouch}
      handleSeek={handleSeek}
      onPlayerReady={handleReady}
      onPlayerDuration={setDuration}
      onPlayerEnded={handleEnded}
      onPlayerProgress={onPlayerProgress}
      onPlayerPlay={onPlayerPlay}
      onPlayerPause={onPlayerPause}
      currentTime={currentTime}
      duration={duration}
      actionSide={actionSide}
      actionIcon={actionIcon}
      actionText={actionText}
      title={title}
      season={season}
      handleToggleFullscreen={handleToggleFullscreen}
      handlePlayerClick={handlePlayerClick}
      handleMouseEnter={handleMouseEnter}
      handleMouseLeave={handleMouseLeave}
      formatTimeLabel={formatTimeLabel}
      onSeekBarDragMobile={handleSeekBarDrag}
    />
  ) : (
    <VideoPlayerPC
      containerRef={containerRef}
      playerRef={playerRef}
      url={url}
      playing={playing}
      volume={volume}
      playbackRate={playbackRate}
      isFullscreen={isFullscreen}
      aspectRatio={aspectRatio}
      isReady={isReady}
      onPlayerReady={handleReady}
      onPlayerEnded={handleEnded}
      onPlayerDuration={setDuration}
      onPlayerProgress={onPlayerProgress}
      onPlayerPlay={onPlayerPlay}
      onPlayerPause={onPlayerPause}
      handlePlayerClick={handlePlayerClick}
      handleMouseEnter={handleMouseEnter}
      handleMouseLeave={handleMouseLeave}
      handleLeftAreaTouchEnd={handleLeftAreaTouchEnd}
      handleRightAreaTouchEnd={handleRightAreaTouchEnd}
      currentTime={currentTime}
      duration={duration}
      showUI={showUI}
      isUIVisible={isUIVisible}
      fadeOut={fadeOut}
      handlePlayPause={handlePlayPause}
      handleSeek={handleSeek}
      handleSeekRelative={handleSeekRelative}
      onSeekBarDrag={handleSeekBarDrag}
      handleToggleFullscreen={handleToggleFullscreen}
      handlePlaybackRateChange={handlePlaybackRateChange}
      handleVolumeChange={handleVolumeChange}
    />
  )
}
