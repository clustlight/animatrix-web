import React from 'react'
import { FaSpinner } from 'react-icons/fa'
import { MdReplay10, MdForward10, MdFullscreenExit, MdScreenRotation } from 'react-icons/md'
import ReactPlayer from 'react-player'
import VideoPlayerSeekBar from './VideoPlayerSeekBar'
import { ActionOverlay } from './VideoPlayerActionOverlay'
import type { ReactNode } from 'react'

type VideoPlayerMobileProps = {
  containerRef: React.RefObject<HTMLDivElement | null>
  playerRef: React.RefObject<ReactPlayer>
  rotatedContainerRef: React.RefObject<HTMLDivElement | null>
  url: string
  playing: boolean
  volume: number
  playbackRate: number
  isFullscreen: boolean
  rotationDeg: number
  toggleRotation: () => void
  mobileUIVisible: boolean
  setMobileUIVisible: React.Dispatch<React.SetStateAction<boolean>>
  scheduleMobileHide: () => void
  clearMobileHide: () => void
  handleCenterButtonClick: () => void
  handleLeftAreaTouchEnd: (e: React.TouchEvent) => void
  handleRightAreaTouchEnd: (e: React.TouchEvent) => void
  handleRotatedContainerTouchEnd: (e: React.TouchEvent) => void
  handleSeekbarTouch: (e: React.TouchEvent) => void
  handleSeek: (sec: number) => void
  onPlayerReady: () => void
  onPlayerEnded: () => void
  onPlayerDuration: (sec: number) => void
  onPlayerProgress: (state: { playedSeconds: number }) => void
  onPlayerPlay: () => void
  onPlayerPause: () => void
  currentTime: number
  duration: number
  actionSide: 'left' | 'right' | null
  actionIcon: ReactNode | null
  actionText: string | null
  title?: string
  season?: string
  handleToggleFullscreen: () => void
  handlePlayerClick: (e: React.MouseEvent) => void
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  isReady: boolean
  aspectRatio: number | null
  formatTimeLabel: (sec: number, showHours?: boolean) => string
  onSeekBarDragMobile: (dragging: boolean) => void
}

export default function VideoPlayerMobile({
  containerRef,
  playerRef,
  rotatedContainerRef,
  url,
  playing,
  volume,
  playbackRate,
  isFullscreen,
  rotationDeg,
  toggleRotation,
  mobileUIVisible,
  setMobileUIVisible,
  scheduleMobileHide,
  clearMobileHide,
  handleCenterButtonClick,
  handleLeftAreaTouchEnd,
  handleRightAreaTouchEnd,
  handleRotatedContainerTouchEnd,
  handleSeekbarTouch,
  handleSeek,
  onPlayerReady,
  onPlayerEnded,
  onPlayerDuration,
  onPlayerProgress,
  onPlayerPlay,
  onPlayerPause,
  currentTime,
  duration,
  actionSide,
  actionIcon,
  actionText,
  title,
  season,
  handleToggleFullscreen,
  handlePlayerClick,
  handleMouseEnter,
  handleMouseLeave,
  isReady,
  aspectRatio,
  formatTimeLabel,
  onSeekBarDragMobile
}: VideoPlayerMobileProps) {
  return (
    <div
      ref={containerRef}
      onClick={handlePlayerClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full mx-auto bg-black outline-none ${isFullscreen ? 'h-screen' : ''}`}
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
      <div className='absolute inset-0 flex items-center justify-center overflow-hidden'>
        {/* Mobile layout (covers both fullscreen and non-fullscreen): */}
        <div
          style={{
            position: 'absolute',
            left: isFullscreen ? '50%' : '0%',
            top: isFullscreen ? '50%' : '0%',
            width: isFullscreen ? '100vh' : '100%',
            height: isFullscreen ? '100vw' : '100%',
            transform: isFullscreen ? `translate(-50%, -50%) rotate(${rotationDeg}deg)` : undefined,
            transformOrigin: isFullscreen ? 'center' : undefined,
            overflow: 'hidden'
          }}
          ref={isFullscreen ? rotatedContainerRef : undefined}
          onTouchEnd={handleRotatedContainerTouchEnd}
        >
          {/* Title in fullscreen (mobile rotated container) */}
          {title && mobileUIVisible && isFullscreen && (
            <div className='absolute left-4 top-4 z-60 pointer-events-none'>
              <div
                className='text-white text-sm font-semibold bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg truncate'
                style={{
                  fontFamily:
                    'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                  maxWidth: isFullscreen ? '200vw' : '60vw',
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
          {mobileUIVisible && isFullscreen && (
            <div className='absolute right-4 top-4 z-70 pointer-events-auto' style={{ zIndex: 80 }}>
              <button
                type='button'
                aria-label='Toggle rotation'
                onClick={ev => {
                  ev.stopPropagation()
                  ev.preventDefault()
                  toggleRotation()
                  setMobileUIVisible(true)
                  scheduleMobileHide()
                }}
                onTouchStart={ev => ev.stopPropagation()}
                onTouchEnd={ev => ev.stopPropagation()}
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
            onProgress={onPlayerProgress}
            onDuration={onPlayerDuration}
            onPlay={onPlayerPlay}
            onPause={onPlayerPause}
            onReady={onPlayerReady}
            onEnded={onPlayerEnded}
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
                  style={{
                    width: isFullscreen ? 140 : 64,
                    height: isFullscreen ? 140 : 64,
                    borderRadius: isFullscreen ? '70px' : '32px'
                  }}
                >
                  {actionSide === 'left' ? (
                    <MdReplay10 size={isFullscreen ? 48 : 24} />
                  ) : (
                    <MdForward10 size={isFullscreen ? 48 : 24} />
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Do not render default ActionOverlay in mobile fullscreen — we use custom visuals
            !isFullscreen &&
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
          {mobileUIVisible && (
            <div
              data-player-seekbar
              className='absolute'
              style={{
                left: isFullscreen ? 30 : 15,
                right: isFullscreen ? 80 : 80,
                bottom: isFullscreen ? 20 : 15,
                height: 72,
                zIndex: 60,
                touchAction: 'none'
              }}
              onTouchStart={handleSeekbarTouch}
              onTouchMove={handleSeekbarTouch}
              onTouchEnd={handleSeekbarTouch}
            >
              <div
                data-player-seekbar-visual
                className='bg-black/40 backdrop-blur-sm rounded-xl px-3 py-2'
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
              >
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
                      onDrag={dragging => onSeekBarDragMobile(dragging)}
                    />
                  </div>
                  <div className='text-white text-sm select-none ml-2' style={{ minWidth: 48 }}>
                    {formatTimeLabel(duration, duration >= 3600)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Exit fullscreen button positioned at rotated container bottom-right */}
          {mobileUIVisible && (
            <div
              className='absolute right-4 bottom-4 z-70 pointer-events-auto'
              style={{ zIndex: 80 }}
            >
              <button
                type='button'
                aria-label='Exit fullscreen'
                onClick={() => {
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
      </div>

      {/* Controls are rendered from parent for PC only */}
    </div>
  )
}
