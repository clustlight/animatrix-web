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
  // Format seconds to MM:SS or HH:MM:SS when requested
  const formatTimeLabel = (sec: number, showHours = false) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    if (showHours) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }
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
    suppressNextClick.current = true
    window.setTimeout(() => (suppressNextClick.current = false), 350)

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
  const lastLeftTapTime = useRef<number>(0)
  const lastRightTapTime = useRef<number>(0)
  const hideUITimer = useRef<NodeJS.Timeout | null>(null)
  const lastSeekDragEndTime = useRef<number>(0)
  // Suppress next click briefly after certain touch interactions (seek end / UI toggle)
  const suppressNextClick = useRef<boolean>(false)
  // Single-tap timers for left/right areas (we delay immediate toggle so a double-tap can cancel it)
  const leftSingleTapTimer = useRef<number | null>(null)
  const rightSingleTapTimer = useRef<number | null>(null)

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
      // optional debug: enable by setting window.__PLAYER_DEBUG_SEEK = true in console
      const _win = window as unknown as { __PLAYER_DEBUG_SEEK?: boolean }
      if (_win.__PLAYER_DEBUG_SEEK)
        console.debug('[VideoPlayer] suppressed seek during rotation', sec)
      return
    }
    playerRef.current?.seekTo(sec, 'seconds')
  }

  const handleSeekRelative = (delta: number) => {
    // block relative seeks while rotating
    if (rotationTransitioning.current) {
      const _win2 = window as unknown as { __PLAYER_DEBUG_SEEK?: boolean }
      if (_win2.__PLAYER_DEBUG_SEEK)
        console.debug('[VideoPlayer] suppressed relative seek during rotation', delta)
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
  const handleLeftAreaTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return
    // Do not early-return for fullscreen/rotation transitions — allow deliberate double-tap seeks
    // Prevent the touch from bubbling to the rotated container which would toggle UI
    e.preventDefault()
    e.stopPropagation()
    const t = e.changedTouches[0]
    const now = Date.now()
    const dt = now - lastLeftTapTime.current
    const dx = Math.abs(t.clientX - lastTapX.current)
    const dy = Math.abs(t.clientY - lastTapY.current)
    const isDouble = dt > 0 && dt < 350 && dx < 40 && dy < 40

    // If we're mid-transition, ignore single taps but still allow double-tap seeks
    if ((fullscreenTransitioning.current || rotationTransitioning.current) && !isDouble) return

    if (isDouble) {
      // Cancel any pending single-tap action for this side
      if (leftSingleTapTimer.current) {
        clearTimeout(leftSingleTapTimer.current)
        leftSingleTapTimer.current = null
      }

      handleSeekRelative(-10)
      // Use side overlay only; clear generic action icon/text to avoid flicker
      setActionIcon(null)
      setActionText(null)
      setActionSide('left')
      lastTapWasDouble.current = true
      window.setTimeout(() => (lastTapWasDouble.current = false), 400)
    } else {
      // schedule single-tap UI toggle (will be canceled if a second tap follows)
      if (leftSingleTapTimer.current) clearTimeout(leftSingleTapTimer.current)
      leftSingleTapTimer.current = window.setTimeout(() => {
        leftSingleTapTimer.current = null
        setMobileUIVisible(prev => {
          const next = !prev
          if (next) scheduleMobileHide()
          else clearMobileHide()
          return next
        })
        // suppress the following click to avoid accidental play/pause
        suppressNextClick.current = true
        window.setTimeout(() => (suppressNextClick.current = false), 350)
      }, 300)
    }

    lastLeftTapTime.current = now
    lastTapX.current = t.clientX
    lastTapY.current = t.clientY
  }

  const handleRightAreaTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return
    // Do not early-return for fullscreen/rotation transitions — allow deliberate double-tap seeks
    // Prevent the touch from bubbling to the rotated container which would toggle UI
    e.preventDefault()
    e.stopPropagation()
    const t = e.changedTouches[0]
    const now = Date.now()
    const dt = now - lastRightTapTime.current
    const dx = Math.abs(t.clientX - lastTapX.current)
    const dy = Math.abs(t.clientY - lastTapY.current)
    const isDouble = dt > 0 && dt < 350 && dx < 40 && dy < 40

    // If we're mid-transition, ignore single taps but still allow double-tap seeks
    if ((fullscreenTransitioning.current || rotationTransitioning.current) && !isDouble) return

    if (isDouble) {
      // Cancel any pending single-tap action for this side
      if (rightSingleTapTimer.current) {
        clearTimeout(rightSingleTapTimer.current)
        rightSingleTapTimer.current = null
      }

      handleSeekRelative(10)
      // Use side overlay only; clear generic action icon/text to avoid flicker
      setActionIcon(null)
      setActionText(null)
      setActionSide('right')
      lastTapWasDouble.current = true
      window.setTimeout(() => (lastTapWasDouble.current = false), 400)
    } else {
      // schedule single-tap UI toggle (will be canceled if a second tap follows)
      if (rightSingleTapTimer.current) clearTimeout(rightSingleTapTimer.current)
      rightSingleTapTimer.current = window.setTimeout(() => {
        rightSingleTapTimer.current = null
        setMobileUIVisible(prev => {
          const next = !prev
          if (next) scheduleMobileHide()
          else clearMobileHide()
          return next
        })
        // suppress the following click to avoid accidental play/pause
        suppressNextClick.current = true
        window.setTimeout(() => (suppressNextClick.current = false), 350)
      }, 300)
    }

    lastRightTapTime.current = now
    lastTapX.current = t.clientX
    lastTapY.current = t.clientY
  }

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
    suppressNextClick.current = true
    window.setTimeout(() => (suppressNextClick.current = false), 350)
  }

  // Touch handlers for enlarged seekbar hit area (mobile fullscreen)
  const handleSeekbarTouch = (e: React.TouchEvent) => {
    if (fullscreenTransitioning.current || rotationTransitioning.current) return
    if (!isMobile || !isFullscreen) return
    const t = e.changedTouches[0]
    const container = e.currentTarget as HTMLElement
    // find the visible seekbar visual element
    const visual = container.querySelector('[data-player-seekbar-visual]') as HTMLElement | null
    if (!visual || duration <= 0) return

    const rect = visual.getBoundingClientRect()
    // compute ratio within visual bounds (clamp 0..1)
    const x = Math.max(rect.left, Math.min(rect.right, t.clientX))
    const ratio = rect.width > 0 ? (x - rect.left) / rect.width : 0
    const time = Math.max(0, Math.min(duration, ratio * duration))

    if (e.type === 'touchstart' || e.type === 'touchmove') {
      // show UI and keep it visible while interacting
      setMobileUIVisible(true)
      clearMobileHide()
      // live seek as user drags
      handleSeek(time)
    } else if (e.type === 'touchend') {
      lastSeekDragEndTime.current = Date.now()
      // finalize seek
      handleSeek(time)
      // schedule hide and suppress following click
      scheduleMobileHide()
      suppressNextClick.current = true
      window.setTimeout(() => (suppressNextClick.current = false), 350)
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
      if (leftSingleTapTimer.current) clearTimeout(leftSingleTapTimer.current)
      if (rightSingleTapTimer.current) clearTimeout(rightSingleTapTimer.current)
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

  // Callback on video end
  const handleEnded = () => {
    if (onEnded) onEnded({ keepFullscreen: isFullscreen && isMobile })
  }

  useEffect(() => {
    setPlaying(autoPlay)
  }, [autoPlay, url])

  useEffect(() => {
    setHasSeeked(false)
  }, [url, initialSeek])

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
  const onPlayerProgress = ({ playedSeconds }: { playedSeconds: number }) =>
    setCurrentTime(playedSeconds)
  const onPlayerPlay = () => setPlaying(true)
  const onPlayerPause = () => setPlaying(false)

  const handleSeekBarDragMobile = (dragging: boolean) => {
    if (dragging) {
      setMobileUIVisible(true)
      clearMobileHide()
    } else {
      lastSeekDragEndTime.current = Date.now()
      scheduleMobileHide()
      suppressNextClick.current = true
      window.setTimeout(() => (suppressNextClick.current = false), 350)
    }
  }

  const handleSeekBarDragPC = (dragging: boolean) => {
    if (!dragging) lastSeekDragEndTime.current = Date.now()
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
      onSeekBarDragMobile={handleSeekBarDragMobile}
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
      onSeekBarDrag={handleSeekBarDragPC}
      handleToggleFullscreen={handleToggleFullscreen}
      handlePlaybackRateChange={handlePlaybackRateChange}
      handleVolumeChange={handleVolumeChange}
    />
  )
}
