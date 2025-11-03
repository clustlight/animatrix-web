import { FaSpinner } from 'react-icons/fa'
import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import ReactPlayer from 'react-player'
import VideoPlayerControls from './VideoPlayerControls'
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
  onTimeUpdate?: (sec: number) => void // ★追加
}

export default function VideoPlayer({
  url,
  onEnded,
  autoPlay = false,
  initialSeek,
  onTimeUpdate
}: VideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null as unknown as ReactPlayer)
  const containerRef = useRef<HTMLDivElement>(null)

  // State
  const [playing, setPlaying] = useState(autoPlay)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = usePersistedVolume()
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [isReady, setIsReady] = useState(false)
  const [aspectRatio, setAspectRatio] = useState<number | null>(null)
  const [hasSeeked, setHasSeeked] = useState(false)

  // UI state
  const [actionIcon, setActionIcon] = useState<ReactNode | null>(null)
  const [actionText, setActionText] = useState<string | null>(null)
  const [showUI, setShowUI] = useState(true)
  const hideUITimer = useRef<NodeJS.Timeout | null>(null)

  // Custom hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen(
    containerRef as React.RefObject<HTMLElement>
  )
  const { fadeOut, hovered, setHovered, setShortcutActive } = useFadeUI({
    isFullscreen
  })
  const inputFocused = useInputFocus()

  // Keyboard shortcuts
  useVideoPlayerShortcuts({
    playerRef,
    duration,
    setPlaying,
    setVolume,
    toggleFullscreen,
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
  const handlePlayPause = () => setPlaying(p => !p)
  const handlePlaybackRateChange = (rate: number) => setPlaybackRate(rate)
  const handleVolumeChange = (v: number) => setVolume(v)

  // Toggle play/pause on player click (except controls)
  const handlePlayerClick = (e: MouseEvent) => {
    const controls = containerRef.current?.querySelector('[data-player-controls]')
    if (controls && controls.contains(e.target as Node)) return
    setPlaying(p => !p)
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
  const lastMouseMoveTime = useRef<number>(Date.now())
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
      lastMouseMoveTime.current = Date.now()
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

  // 動画のアスペクト比を取得
  const handleReady = useCallback(() => {
    setIsReady(true)
    const video = playerRef.current?.getInternalPlayer() as HTMLVideoElement | null
    if (video && video.videoWidth && video.videoHeight) {
      setAspectRatio(video.videoWidth / video.videoHeight)
    }
  }, [])

  // 動画終了時コールバック
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
        onEnded={handleEnded} // 追加
        style={{ position: 'absolute', inset: 0 }}
      />
      {/* Action overlay */}
      {(actionIcon || actionText) && <ActionOverlay icon={actionIcon} text={actionText} />}
      {/* Controls */}
      {showUI && isUIVisible && (
        <VideoPlayerControls
          playing={playing}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onFullscreen={toggleFullscreen}
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
