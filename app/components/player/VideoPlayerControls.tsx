import React, { useState, useRef, useEffect } from 'react'
import {
  MdForward10,
  MdForward30,
  MdFullscreen,
  MdFullscreenExit,
  MdPause,
  MdPlayArrow,
  MdReplay10,
  MdReplay30,
  MdSpeed,
  MdVolumeOff,
  MdVolumeUp
} from 'react-icons/md'
import VideoPlayerSeekBar from './VideoPlayerSeekBar'
import VideoPlayerVolumeBar from './VideoPlayerVolumeBar'

// Props for video player controls
type VideoPlayerControlsProps = {
  playing: boolean
  onPlayPause: () => void
  onSeek: (sec: number) => void
  onFullscreen: () => void
  currentTime: number
  duration: number
  volume: number
  onVolumeChange: (v: number) => void
  showUI: boolean
  fadeOut: boolean
  isFullscreen: boolean
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
  onSeekBarDrag?: (dragging: boolean) => void
  onVolumeBarDrag?: (dragging: boolean) => void
}

const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]

// Format seconds to MM:SS
function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Playback rate selection
const PlaybackRateControl: React.FC<{
  playbackRate: number
  onPlaybackRateChange: (rate: number) => void
}> = ({ playbackRate, onPlaybackRateChange }) => {
  const [showBar, setShowBar] = useState(false)
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setShowBar(true)
  }
  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setShowBar(false), 80)
  }

  useEffect(
    () => () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    },
    []
  )

  return (
    <div
      className='relative flex items-center cursor-pointer'
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <MdSpeed size={30} className='ml-2 cursor-pointer' />
      <span className='ml-2 text-white text-base select-none'>{playbackRate.toFixed(2)}x</span>
      <div
        className={`
          absolute left-1/2 bottom-10 -translate-x-1/2
          flex flex-col items-center
          transition-all duration-300
          ${showBar ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}
        `}
        style={{ minWidth: 0 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className='flex flex-col gap-2 bg-gray-700 rounded px-2 py-2 shadow-lg'>
          {PLAYBACK_RATES.map(rate => (
            <button
              key={rate}
              className={`text-white px-4 py-1 rounded transition cursor-pointer
                ${playbackRate === rate ? 'bg-blue-500' : 'hover:bg-gray-600'}`}
              onClick={() => onPlaybackRateChange(rate)}
              tabIndex={-1}
              type='button'
            >
              {rate.toFixed(2)}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// Generic icon button
const IconButton: React.FC<{
  onClick: () => void
  children: React.ReactNode
  label: string
}> = ({ onClick, children, label }) => (
  <button
    tabIndex={-1}
    className='p-2 rounded hover:bg-white/10 flex items-center justify-center cursor-pointer'
    onClick={onClick}
    aria-label={label}
    type='button'
  >
    {children}
  </button>
)

// Play/Pause button
const PlayPauseButton: React.FC<{
  playing: boolean
  onClick: () => void
}> = ({ playing, onClick }) => (
  <IconButton onClick={onClick} label={playing ? 'Pause' : 'Play'}>
    {playing ? <MdPause size={30} /> : <MdPlayArrow size={30} />}
  </IconButton>
)

// Volume control with mute and bar
const VolumeControl: React.FC<{
  volume: number
  onVolumeChange: (v: number) => void
  onDrag?: (dragging: boolean) => void
}> = ({ volume, onVolumeChange, onDrag }) => {
  const [showBar, setShowBar] = useState(false)
  const prevVolumeRef = useRef(0.8)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('prevVolume')
      prevVolumeRef.current = stored !== null ? Number.parseFloat(stored) : 0.8
    }
  }, [])

  useEffect(() => {
    if (volume > 0) {
      prevVolumeRef.current = volume
      if (typeof window !== 'undefined') {
        localStorage.setItem('prevVolume', String(volume))
      }
    }
  }, [volume])

  const isMuted = volume === 0

  // Toggle mute
  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange(prevVolumeRef.current > 0 ? prevVolumeRef.current : 0.8)
    } else {
      onVolumeChange(0)
    }
  }

  return (
    <div
      className='relative flex items-center'
      style={{ width: 170 }}
      onMouseEnter={() => setShowBar(true)}
      onMouseLeave={() => setShowBar(false)}
    >
      <button
        type='button'
        tabIndex={-1}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        className='ml-2 cursor-pointer bg-transparent border-none p-0'
        onClick={handleMuteToggle}
        style={{ outline: 'none' }}
      >
        {isMuted ? <MdVolumeOff size={28} /> : <MdVolumeUp size={28} />}
      </button>
      <div
        className={`
          absolute left-12 top-1/2 -translate-y-1/2
          transition-all duration-300
          ${showBar ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        style={{ width: 80, minWidth: 80 }}
      >
        <VideoPlayerVolumeBar volume={volume} onVolumeChange={onVolumeChange} onDrag={onDrag} />
      </div>
      <span
        className={`
          absolute top-1/2 -translate-y-1/2 text-white text-sm whitespace-nowrap select-none
          transition-all duration-300
        `}
        style={{
          left: showBar ? 190 : 50,
          minWidth: 32
        }}
      >
        {Math.round(volume * 100)}%
      </span>
    </div>
  )
}

// Main video player controls
export default function VideoPlayerControls({
  playing,
  onPlayPause,
  onSeek,
  onFullscreen,
  currentTime,
  duration,
  volume,
  onVolumeChange,
  showUI,
  fadeOut,
  isFullscreen,
  playbackRate,
  onPlaybackRateChange,
  onSeekBarDrag,
  onVolumeBarDrag
}: VideoPlayerControlsProps) {
  // Controls visibility
  const visible = showUI || fadeOut || !playing

  // Controls container class
  const controlsBaseClass = [
    'absolute left-0 right-0',
    'transition-opacity',
    'select-none',
    visible ? 'flex' : 'hidden',
    showUI && !fadeOut ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
  ].join(' ')

  // モバイル・タブレット判定
  const isMobileOrTablet =
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 1024px)').matches : false
  const isMobile =
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 600px)').matches : false
  const isTablet = isMobileOrTablet && !isMobile

  return (
    <div>
      {/* Seek bar（全デバイスで表示） */}
      <div
        data-player-controls
        onClick={e => e.stopPropagation()}
        className={`${controlsBaseClass} bottom-13 z-30 flex-col gap-2 items-stretch bg-black/30 text-white`}
        style={{
          transitionDuration: fadeOut ? '800ms' : '200ms'
        }}
      >
        <VideoPlayerSeekBar
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
          onDrag={onSeekBarDrag}
        />
      </div>
      {/* Main controls */}
      <div
        data-player-controls
        onClick={e => e.stopPropagation()}
        className={`${controlsBaseClass} bottom-0 z-20 flex-col gap-2 items-stretch bg-black/30 text-white p-1`}
        style={{
          transitionDuration: fadeOut ? '800ms' : '200ms'
        }}
      >
        <div className='flex items-center justify-center w-full'>
          {/* Left: 現在時間/総時間（全デバイスで表示） */}
          <div className='flex items-center gap-1 absolute left-0 pl-4'>
            <span
              className={
                isMobile
                  ? 'text-xs text-white opacity-80 select-none'
                  : 'text-base text-white select-none'
              }
            >
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            {/* PCのみボリューム表示 */}
            {!isMobileOrTablet && (
              <VolumeControl
                volume={volume}
                onVolumeChange={onVolumeChange}
                onDrag={onVolumeBarDrag}
              />
            )}
          </div>
          {/* Center: 再生/一時停止・スキップ */}
          <div className='flex items-center gap-2 justify-center'>
            {isMobile ? (
              <PlayPauseButton playing={playing} onClick={onPlayPause} />
            ) : isTablet ? (
              <>
                <IconButton label='Back 30s' onClick={() => onSeek(currentTime - 30)}>
                  <MdReplay30 size={28} />
                </IconButton>
                <IconButton label='Back 10s' onClick={() => onSeek(currentTime - 10)}>
                  <MdReplay10 size={28} />
                </IconButton>
                <PlayPauseButton playing={playing} onClick={onPlayPause} />
                <IconButton label='Forward 10s' onClick={() => onSeek(currentTime + 10)}>
                  <MdForward10 size={28} />
                </IconButton>
                <IconButton label='Forward 30s' onClick={() => onSeek(currentTime + 30)}>
                  <MdForward30 size={28} />
                </IconButton>
              </>
            ) : (
              <>
                <IconButton label='Back 30s' onClick={() => onSeek(currentTime - 30)}>
                  <MdReplay30 size={28} />
                </IconButton>
                <IconButton label='Back 10s' onClick={() => onSeek(currentTime - 10)}>
                  <MdReplay10 size={28} />
                </IconButton>
                <PlayPauseButton playing={playing} onClick={onPlayPause} />
                <IconButton label='Forward 10s' onClick={() => onSeek(currentTime + 10)}>
                  <MdForward10 size={28} />
                </IconButton>
                <IconButton label='Forward 30s' onClick={() => onSeek(currentTime + 30)}>
                  <MdForward30 size={28} />
                </IconButton>
              </>
            )}
          </div>
          {/* Right: 全画面（全デバイス）, 再生速度（PCのみ） */}
          <div className='flex items-center gap-2 absolute right-0 pr-4'>
            {!isMobileOrTablet && (
              <PlaybackRateControl
                playbackRate={playbackRate}
                onPlaybackRateChange={onPlaybackRateChange}
              />
            )}
            <IconButton
              label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              onClick={onFullscreen}
            >
              {isFullscreen ? <MdFullscreenExit size={28} /> : <MdFullscreen size={28} />}
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  )
}
