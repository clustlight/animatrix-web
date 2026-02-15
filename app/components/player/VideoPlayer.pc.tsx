import React from 'react'
import ReactPlayer from 'react-player'
import VideoPlayerControls from './VideoPlayerControls'

type VideoPlayerPCProps = {
  containerRef: React.RefObject<HTMLDivElement | null>
  playerRef: React.RefObject<ReactPlayer>
  url: string
  playing: boolean
  volume: number
  playbackRate: number
  isFullscreen: boolean
  onPlayerReady: () => void
  onPlayerEnded: () => void
  onPlayerDuration: (sec: number) => void
  onPlayerProgress: (state: { playedSeconds: number }) => void
  onPlayerPlay: () => void
  onPlayerPause: () => void
  handlePlayerClick: (e: React.MouseEvent) => void
  handleMouseEnter: () => void
  handleMouseLeave: () => void
  handleLeftAreaTouchEnd: (e: React.TouchEvent) => void
  handleRightAreaTouchEnd: (e: React.TouchEvent) => void
  currentTime: number
  duration: number
  showUI: boolean
  isUIVisible: boolean
  fadeOut: boolean
  handlePlayPause: () => void
  handleSeek: (sec: number) => void
  handleSeekRelative: (delta: number) => void
  onSeekBarDrag: (dragging: boolean) => void
  handleToggleFullscreen: () => void
  handlePlaybackRateChange: (rate: number) => void
  handleVolumeChange: (v: number) => void
  isReady: boolean
  aspectRatio: number | null
}

export default function VideoPlayerPC({
  containerRef,
  playerRef,
  url,
  playing,
  volume,
  playbackRate,
  isFullscreen,
  onPlayerReady,
  onPlayerEnded,
  onPlayerDuration,
  onPlayerProgress,
  onPlayerPlay,
  onPlayerPause,
  handlePlayerClick,
  handleMouseEnter,
  handleMouseLeave,
  handleLeftAreaTouchEnd,
  handleRightAreaTouchEnd,
  currentTime,
  duration,
  showUI,
  isUIVisible,
  fadeOut,
  handlePlayPause,
  handleSeek,
  handleSeekRelative,
  onSeekBarDrag,
  handleToggleFullscreen,
  handlePlaybackRateChange,
  handleVolumeChange,
  isReady,
  aspectRatio
}: VideoPlayerPCProps) {
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
          <div className='animate-spin align-middle'>
            <svg viewBox='0 0 50 50' width='32' height='32'>
              <circle
                cx='25'
                cy='25'
                r='20'
                stroke='currentColor'
                strokeWidth='4'
                fill='none'
                strokeDasharray='31.4 31.4'
              />
            </svg>
          </div>
        </div>
      )}

      <div className='absolute inset-0 flex items-center justify-center overflow-hidden'>
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
            onProgress={onPlayerProgress}
            onDuration={onPlayerDuration}
            onPlay={onPlayerPlay}
            onPause={onPlayerPause}
            onReady={onPlayerReady}
            onEnded={onPlayerEnded}
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
      </div>

      {/* Controls */}
      {showUI && isUIVisible && (
        <VideoPlayerControls
          playing={playing}
          onPlayPause={handlePlayPause}
          onSeek={handleSeek}
          onSeekRelative={handleSeekRelative}
          onSeekBarDrag={onSeekBarDrag}
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
