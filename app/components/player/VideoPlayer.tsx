import { FaSpinner } from 'react-icons/fa'
import { MdReplay10, MdForward10, MdFullscreenExit, MdScreenRotation } from 'react-icons/md'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import ReactPlayer from 'react-player'
import VideoPlayerControls from './VideoPlayerControls'
import VideoPlayerSeekBar from './VideoPlayerSeekBar'
import { useFadeUI } from './useFadeUI'
import { useFullscreen } from './useFullscreen'
import { usePersistedVolume } from './usePersistedVolume'
import { useVideoPlayerShortcuts } from './useVideoPlayerShortcuts'
import { useInputFocus } from './useInputFocus'
import { ActionOverlay } from './VIdeoPlayerActionOverlay'

// Video player component
type VideoPlayerProps = {
  url: string
  onEnded?: () => void
  autoPlay?: boolean
  initialSeek?: number
  onTimeUpdate?: (sec: number) => void
  title?: string
  season?: string
}

export default function VideoPlayer({
  url,
  onEnded,
  autoPlay = false,
  initialSeek,
  onTimeUpdate,
  title,
  season
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
  const toggleRotation = () => setRotationDeg(d => (d === 90 ? -90 : 90))

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
  const handleToggleFullscreen = () => {
    // capture current time before toggling so the new player can resume
    const t = playerRef.current?.getCurrentTime?.() ?? currentTime
    pendingSeekOnReady.current = t
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
  const handleSeek = (sec: number) => playerRef.current?.seekTo(sec, 'seconds')
  const handleSeekRelative = (delta: number) => {
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
    const t = e.changedTouches[0]
    const now = Date.now()
    const dt = now - lastLeftTapTime.current
    const dx = Math.abs(t.clientX - lastTapX.current)
    const dy = Math.abs(t.clientY - lastTapY.current)
    const isDouble = dt > 0 && dt < 350 && dx < 40 && dy < 40
    if (isDouble) {
      handleSeekRelative(-10)
      setActionIcon(<MdReplay10 size={48} />)
      setActionText(null)
      setActionSide('left')
      lastTapWasDouble.current = true
      window.setTimeout(() => (lastTapWasDouble.current = false), 400)
    }
    lastLeftTapTime.current = now
    lastTapX.current = t.clientX
    lastTapY.current = t.clientY
  }

  const handleRightAreaTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile) return
    const t = e.changedTouches[0]
    const now = Date.now()
    const dt = now - lastRightTapTime.current
    const dx = Math.abs(t.clientX - lastTapX.current)
    const dy = Math.abs(t.clientY - lastTapY.current)
    const isDouble = dt > 0 && dt < 350 && dx < 40 && dy < 40
    if (isDouble) {
      handleSeekRelative(10)
      setActionIcon(<MdForward10 size={48} />)
      setActionText(null)
      setActionSide('right')
      lastTapWasDouble.current = true
      window.setTimeout(() => (lastTapWasDouble.current = false), 400)
    }
    lastRightTapTime.current = now
    lastTapX.current = t.clientX
    lastTapY.current = t.clientY
  }

  // Handle single-tap on rotated container to show mobile UI (ignore when a double-tap just occurred)
  const handleRotatedContainerTouchEnd = (e: React.TouchEvent) => {
    if (!isMobile || !isFullscreen) return
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
      playerRef.current?.seekTo(t, 'seconds')
    }
  }, [])

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
    if (onEnded) onEnded()
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

  // --- Render ---
  return (
    <div
      ref={containerRef}
      onClick={handlePlayerClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`
        relative w-full mx-auto bg-black outline-none
        ${isFullscreen ? 'h-screen' : ''}
      `}
      tabIndex={0}
      style={
        !isFullscreen && aspectRatio
          ? { aspectRatio: `${aspectRatio}` }
          : !isFullscreen
            ? { aspectRatio: '16/9', minHeight: 240 }
            : undefined
      }
    >
      {/* Loading spinner */}
      {!isReady && (
        <div className='absolute inset-0 bg-neutral-900 flex items-center justify-center z-10 text-neutral-400 text-2xl pointer-events-none select-none'>
          <FaSpinner
            size={32}
            color={'#888'}
            className='animate-spin align-middle'
            aria-label='Loading'
          />
        </div>
      )}
      {/* Video */}
      {/* Video wrapper - apply rotation in fullscreen on mobile only */}
      <div className='absolute inset-0 flex items-center justify-center overflow-hidden'>
        {isFullscreen && isMobile ? (
          // Fill screen with rotated video: swap viewport dims and center
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '100vh',
              height: '100vw',
              transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
              transformOrigin: 'center',
              overflow: 'hidden'
            }}
            ref={rotatedContainerRef}
            onTouchEnd={handleRotatedContainerTouchEnd}
          >
            {/* Title in fullscreen (mobile rotated container) */}
            {title && mobileUIVisible && (
              <div className='absolute left-4 top-4 z-60 pointer-events-none'>
                <div
                  className='text-white text-sm font-semibold bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg truncate'
                  style={{
                    fontFamily:
                      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                    maxWidth: isMobile ? '200vw' : '60vw',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {season ? `${season} / ${title}` : title}
                </div>
              </div>
            )}
            {/* Rotate toggle (top-right of screen in fullscreen) */}
            {mobileUIVisible && (
              <div className='absolute right-4 top-4 z-60 pointer-events-auto'>
                <button
                  type='button'
                  aria-label='Toggle rotation'
                  onClick={() => {
                    toggleRotation()
                    setMobileUIVisible(true)
                    scheduleMobileHide()
                  }}
                  className='bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg shadow-lg'
                  style={{ minWidth: 40 }}
                >
                  <MdScreenRotation
                    size={22}
                    style={{ transform: rotationDeg === 90 ? 'none' : 'scaleX(-1)' }}
                  />
                </button>
              </div>
            )}
            <ReactPlayer
              ref={playerRef}
              url={url}
              playing={playing}
              volume={volume}
              controls={false}
              width='100%'
              height='100%'
              playbackRate={playbackRate}
              onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
              onDuration={setDuration}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onReady={handleReady}
              onEnded={handleEnded}
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* When rotated, render overlays inside this rotated container so positions match */}
            {actionSide ? (
              <div
                className={`absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none`}
                style={{
                  left: actionSide === 'left' ? '15%' : undefined,
                  right: actionSide === 'right' ? '15%' : undefined
                }}
              >
                <div className='flex flex-col items-center'>
                  <div
                    className='bg-black/60 text-white flex items-center justify-center'
                    style={{ width: 140, height: 140, borderRadius: '70px' }}
                  >
                    {actionSide === 'left' ? <MdReplay10 size={48} /> : <MdForward10 size={48} />}
                  </div>
                </div>
              </div>
            ) : (
              // Do not render default ActionOverlay in mobile fullscreen — we use custom visuals
              !(isFullscreen && isMobile) &&
              (actionIcon || actionText) && (
                <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none'>
                  <ActionOverlay icon={actionIcon} text={actionText} />
                </div>
              )
            )}
            {/* Left/right touch areas for double-tap (cover quarters) */}
            <div
              onTouchEnd={handleLeftAreaTouchEnd}
              className='absolute left-0 top-0 h-full'
              style={{ width: '25%', zIndex: 8 }}
            />
            <div
              onTouchEnd={handleRightAreaTouchEnd}
              className='absolute right-0 top-0 h-full'
              style={{ width: '25%', zIndex: 8 }}
            />
            {/* Centered play/pause for mobile (inside rotated container) */}
            {mobileUIVisible && (
              <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto'>
                <button
                  onClick={handleCenterButtonClick}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className='bg-black/60 text-white p-4 rounded-full shadow-lg'
                  type='button'
                >
                  {playing ? (
                    <svg viewBox='0 0 24 24' width='48' height='48' fill='currentColor'>
                      <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
                    </svg>
                  ) : (
                    <svg viewBox='0 0 24 24' width='48' height='48' fill='currentColor'>
                      <path d='M8 5v14l11-7z' />
                    </svg>
                  )}
                </button>
              </div>
            )}
            {/* Seekbar rendered unrotated at bottom outside rotated container */}
            {isMobile && mobileUIVisible && (
              <div
                data-player-seekbar
                className='absolute'
                // provide more horizontal breathing room; keep extra right padding in fullscreen
                style={{
                  left: isFullscreen ? 30 : 20,
                  right: isFullscreen ? 80 : 20,
                  // move slightly closer to bottom edge
                  bottom: isFullscreen ? 20 : 5,
                  zIndex: 60
                }}
              >
                <div className='bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2'>
                  <div className='flex items-center gap-3'>
                    <div className='text-white text-sm select-none' style={{ minWidth: 48 }}>
                      {formatTimeLabel(currentTime, duration >= 3600)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <VideoPlayerSeekBar
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleSeek}
                        rotationContainerRef={
                          rotatedContainerRef as unknown as React.RefObject<HTMLElement>
                        }
                        rotationDeg={rotationDeg}
                        onDrag={dragging => {
                          if (dragging) {
                            // keep UI visible while dragging
                            setMobileUIVisible(true)
                            clearMobileHide()
                          } else {
                            lastSeekDragEndTime.current = Date.now()
                            // schedule hide after drag ends
                            scheduleMobileHide()
                            // suppress the immediate following click which can toggle playback
                            suppressNextClick.current = true
                            window.setTimeout(() => (suppressNextClick.current = false), 350)
                          }
                        }}
                      />
                    </div>
                    <div className='text-white text-sm select-none ml-2' style={{ minWidth: 48 }}>
                      {formatTimeLabel(duration, duration >= 3600)}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Title for non-mobile fullscreen (fallback) rendered outside rotated container */}
            {isFullscreen && !isMobile && title && (
              <div className='absolute left-4 top-4 z-60 pointer-events-none'>
                <div
                  className='text-white text-sm font-semibold bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg truncate'
                  style={{
                    fontFamily:
                      'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                    maxWidth: '60vw',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {season ? `${season} / ${title}` : title}
                </div>
              </div>
            )}
            {/* Exit fullscreen button positioned at rotated container bottom-right */}
            {mobileUIVisible && (
              <div className='absolute right-4 bottom-4 z-50 pointer-events-auto'>
                <button
                  type='button'
                  aria-label='Exit fullscreen'
                  onClick={() => {
                    // ensure pending position is preserved when exiting
                    setMobileUIVisible(true)
                    clearMobileHide()
                    handleToggleFullscreen()
                  }}
                  className='bg-black/60 backdrop-blur-sm text-white p-2 rounded-lg shadow-lg'
                  style={{ minWidth: 44 }}
                >
                  <MdFullscreenExit size={28} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <ReactPlayer
              ref={playerRef}
              url={url}
              playing={playing}
              volume={volume}
              controls={false}
              width='100%'
              height='100%'
              playbackRate={playbackRate}
              onProgress={({ playedSeconds }) => setCurrentTime(playedSeconds)}
              onDuration={setDuration}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onReady={handleReady}
              onEnded={handleEnded} // Added
              style={{ position: 'absolute', inset: 0 }}
            />
            {/* Left/right touch areas for double-tap (cover quarters) */}
            <div
              onTouchEnd={handleLeftAreaTouchEnd}
              className='absolute left-0 top-0 h-full'
              style={{ width: '25%', zIndex: 8 }}
            />
            <div
              onTouchEnd={handleRightAreaTouchEnd}
              className='absolute right-0 top-0 h-full'
              style={{ width: '25%', zIndex: 8 }}
            />
          </>
        )}
      </div>
      {/* Action overlay and centered play/pause are rendered inside rotated container when in mobile fullscreen */}
      {/* Central play/pause for mobile when NOT fullscreen */}
      {isMobile && !isFullscreen && (
        <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto'>
          <button
            onClick={handleCenterButtonClick}
            aria-label={playing ? 'Pause' : 'Play'}
            className='bg-black/60 text-white p-4 rounded-full shadow-lg'
            type='button'
          >
            {playing ? (
              <svg viewBox='0 0 24 24' width='48' height='48' fill='currentColor'>
                <path d='M6 19h4V5H6v14zm8-14v14h4V5h-4z' />
              </svg>
            ) : (
              <svg viewBox='0 0 24 24' width='48' height='48' fill='currentColor'>
                <path d='M8 5v14l11-7z' />
              </svg>
            )}
          </button>
        </div>
      )}
      {/* Controls */}
      {!(isFullscreen && isMobile) && showUI && isUIVisible && (
        <VideoPlayerControls
          playing={playing}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSeekRelative={handleSeekRelative}
          onSeekBarDrag={dragging => {
            if (!dragging) lastSeekDragEndTime.current = Date.now()
          }}
          onFullscreen={handleToggleFullscreen}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          playbackRate={playbackRate}
          onPlaybackRateChange={handlePlaybackRateChange}
          onVolumeChange={handleVolumeChange}
          showUI={showUI}
          fadeOut={fadeOut}
          isFullscreen={isFullscreen}
        />
      )}
    </div>
  )
}
