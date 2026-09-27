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
import { clamp, formatPlayerTime } from './playerUtils'
import { useMobileSeekbarTouch } from './useMobileSeekbarTouch'
import { usePlayerPlaybackEvents } from './usePlayerPlaybackEvents'
import { useMobilePlayerUI } from './useMobilePlayerUI'
import { useMobilePlayerTouches } from './useMobilePlayerTouches'
import { usePlayerTransitions } from './usePlayerTransitions'
import { usePlayerVisibility } from './usePlayerVisibility'
import { usePlayerSourceState } from './usePlayerSourceState'

// Video player component
type VideoPlayerProps = {
  url: string
  /** Called when playback ends. Receives { keepFullscreen } when playback is fullscreen */
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
  const playerRef = useRef<ReactPlayer>(null as unknown as ReactPlayer)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const rotatedContainerRef = useRef<HTMLDivElement | null>(null)

  const [volume, setVolume] = usePersistedVolume()
  const [playbackRate, setPlaybackRate] = useState(1.0)
  // Mobile detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width:600px)').matches : false
  )

  // UI state
  const [actionIcon, setActionIcon] = useState<ReactNode | null>(null)
  const [actionText, setActionText] = useState<string | null>(null)
  const [actionSide, setActionSide] = useState<'left' | 'right' | null>(null)
  // Mobile fullscreen UI visibility (auto-hide after inactivity)
  const {
    visible: mobileUIVisible,
    setVisible: setMobileUIVisible,
    scheduleHide: scheduleMobileHide,
    clearHideTimer: clearMobileHide
  } = useMobilePlayerUI()
  const lastSeekDragEndTime = useRef<number>(0)
  // Suppress next click briefly after certain touch interactions (seek end / UI toggle)
  const suppressNextClick = useRef<boolean>(false)
  const suppressClickTemporary = useCallback((ms = 350) => {
    suppressNextClick.current = true
    window.setTimeout(() => (suppressNextClick.current = false), ms)
  }, [])

  // Track whether the user is actively dragging/seeking (set by SeekBar via onDrag)
  const isUserSeekingRef = useRef<boolean>(false)

  // Custom hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(
    containerRef as unknown as React.RefObject<HTMLElement>
  )
  const transitions = usePlayerTransitions({ toggleFullscreen, suppressClickTemporary })
  const {
    pendingSeekOnReady,
    fullscreenTransitioning,
    rotationTransitioning,
    rotationDeg,
    toggleRotation,
    handleToggleFullscreen
  } = transitions
  const {
    playing,
    setPlaying,
    currentTime,
    setCurrentTime,
    currentTimeRef,
    duration,
    setDuration,
    isReady,
    aspectRatio,
    handleReady
  } = usePlayerSourceState({
    playerRef,
    url,
    autoPlay,
    initialSeek,
    onTimeUpdate,
    pendingSeekOnReady
  })
  const { fadeOut, hovered, setHovered } = useFadeUI({
    isFullscreen
  })
  const { showUI, isUIVisible, handleMouseEnter, handleMouseLeave, resetShowUI } =
    usePlayerVisibility({
      containerRef,
      isFullscreen,
      playing,
      fadeOut,
      hovered,
      setHovered
    })
  const inputFocused = useInputFocus()
  const { handleEnded, onPlayerProgress, onPlayerPlay, onPlayerPause } = usePlayerPlaybackEvents({
    playerRef,
    url,
    duration,
    currentTime,
    currentTimeRef,
    isFullscreen,
    onEnded,
    setPlaying,
    setCurrentTime,
    isUserSeekingRef
  })

  // Keyboard shortcuts
  useVideoPlayerShortcuts({
    playerRef,
    currentTimeRef,
    duration,
    setPlaying,
    setVolume,
    toggleFullscreen: handleToggleFullscreen,
    setPlaybackRate,
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

    currentTimeRef.current = sec
    playerRef.current?.seekTo(sec, 'seconds')
  }

  const handleSeekRelative = (delta: number) => {
    // block relative seeks while rotating
    if (rotationTransitioning.current) {
      return
    }

    const player = playerRef.current
    if (!player) return
    const base = currentTimeRef.current
    const maxTime = duration > 0 ? duration : base
    const next = clamp(base + delta, 0, maxTime)
    currentTimeRef.current = next
    player.seekTo(next, 'seconds')
  }
  const {
    lastTapTime,
    lastTapWasDouble,
    sideSingleTapTimer,
    handleLeftAreaTouchEnd,
    handleRightAreaTouchEnd,
    handleRotatedContainerTouchEnd
  } = useMobilePlayerTouches({
    isMobile,
    mobileUIVisible,
    setMobileUIVisible,
    scheduleMobileHide,
    clearMobileHide,
    rotationTransitioning,
    fullscreenTransitioning,
    handleSeekRelative,
    setActionIcon,
    setActionText,
    setActionSide,
    suppressClickTemporary
  })
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

  const handleSeekbarTouch = useMobileSeekbarTouch({
    url,
    isMobile,
    isFullscreen,
    duration,
    rotationDeg,
    fullscreenTransitioning,
    rotationTransitioning,
    lastSeekDragEndTime,
    handleSeek,
    setMobileUIVisible,
    clearMobileHide,
    scheduleMobileHide,
    suppressClickTemporary
  })
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

  // Cleanup single-tap timers on unmount.
  useEffect(() => {
    return () => {
      if (sideSingleTapTimer.current.left) clearTimeout(sideSingleTapTimer.current.left)
      if (sideSingleTapTimer.current.right) clearTimeout(sideSingleTapTimer.current.right)
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

  // Update mobile flag on resize/orientation change
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width:600px)')
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  // Reset transient / non-video UI state when the source URL (episode) changes.
  // VideoPlayer intentionally stays mounted when switching episodes so we must
  // explicitly clear any UI that should not persist across episodes.
  useEffect(() => {
    // Clear transient UI overlays and ensure the UI is visible for the new episode
    setActionIcon(null)
    setActionText(null)
    setActionSide(null)
    setMobileUIVisible(true)
    clearMobileHide()
    resetShowUI()

    // Reset interaction refs so the new episode starts clean
    isUserSeekingRef.current = false
  }, [resetShowUI, url])

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
        handleEnded()
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
      formatTimeLabel={formatPlayerTime}
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
      actionIcon={actionIcon}
      actionText={actionText}
    />
  )
}
