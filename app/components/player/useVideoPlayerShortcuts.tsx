import { useEffect } from 'react'
import {
  MdForward10,
  MdForward30,
  MdPause,
  MdPlayArrow,
  MdReplay10,
  MdReplay30,
  MdVolumeDown,
  MdVolumeMute,
  MdVolumeUp
} from 'react-icons/md'
import type ReactPlayer from 'react-player'

type UseVideoPlayerShortcutsProps = {
  playerRef: React.RefObject<ReactPlayer>
  duration: number
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>
  setVolume: React.Dispatch<React.SetStateAction<number>>
  toggleFullscreen: () => void
  shortcutActiveSetter: (active: boolean) => void
  setPlaybackRate: React.Dispatch<React.SetStateAction<number>>
  playbackRate: number
  onActionIcon?: (icon: React.ReactNode, text?: string) => void
  disable?: boolean
}

const SEEK_STEP = 10
const SEEK_STEP_LARGE = 30
const VOLUME_STEP = 0.05
const PLAYBACK_RATE_STEP = 0.1
const PLAYBACK_RATE_MIN = 0.3
const PLAYBACK_RATE_MAX = 2.0
const SHORTCUT_ACTIVE_TIMEOUT = 100

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

export function useVideoPlayerShortcuts({
  playerRef,
  duration,
  setPlaying,
  setVolume,
  toggleFullscreen,
  shortcutActiveSetter,
  setPlaybackRate,
  playbackRate,
  onActionIcon,
  disable = false
}: UseVideoPlayerShortcutsProps) {
  useEffect(() => {
    if (disable) return

    const seek = (seconds: number, icon: React.ReactNode) => {
      const player = playerRef.current
      if (!player) return
      player.seekTo(player.getCurrentTime() + seconds, 'seconds')
      onActionIcon?.(icon)
    }

    const adjustVolume = (delta: number) => {
      setVolume(v => {
        const newVolume = clamp(Math.round((v + delta) * 100) / 100, 0, 1)
        if (onActionIcon) {
          const icon = delta > 0 ? <MdVolumeUp size={48} /> : <MdVolumeDown size={48} />
          onActionIcon(icon, `${Math.round(newVolume * 100)}%`)
        }
        return newVolume
      })
    }

    const adjustPlaybackRate = (delta: number) => {
      setPlaybackRate(rate => {
        const newRate = clamp(
          Math.round((rate + delta) * 10) / 10,
          PLAYBACK_RATE_MIN,
          PLAYBACK_RATE_MAX
        )
        onActionIcon?.(null, `${newRate.toFixed(2)}x`)
        return newRate
      })
    }

    const jumpToPercent = (percent: number) => {
      const player = playerRef.current
      if (!player || duration <= 0) return
      player.seekTo(percent * duration, 'seconds')
    }

    const toggleMute = () => {
      setVolume(v => {
        const isMuted = v === 0
        let prevVolume = 0.8
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('prevVolume')
          const parsed = stored !== null ? Number.parseFloat(stored) : 0.8
          prevVolume = parsed > 0 ? parsed : 0.8
        }
        const newVolume = isMuted ? prevVolume : 0
        if (onActionIcon) {
          const icon = newVolume === 0 ? <MdVolumeMute size={48} /> : <MdVolumeUp size={48} />
          onActionIcon(icon, newVolume === 0 ? '' : `${Math.round(newVolume * 100)}%`)
        }
        if (!isMuted && typeof window !== 'undefined') {
          localStorage.setItem('prevVolume', String(v))
        }
        return newVolume
      })
    }

    const keyActions: Array<{
      match: (e: KeyboardEvent) => boolean
      action: (e: KeyboardEvent) => void
    }> = [
      {
        match: e => e.code === 'ArrowLeft',
        action: () => seek(-SEEK_STEP, <MdReplay10 size={48} />)
      },
      {
        match: e => e.code === 'ArrowRight',
        action: () => seek(SEEK_STEP, <MdForward10 size={48} />)
      },
      {
        match: e => e.key === 'j' || e.key === 'J',
        action: () => seek(-SEEK_STEP_LARGE, <MdReplay30 size={48} />)
      },
      {
        match: e => e.key === 'l' || e.key === 'L',
        action: () => seek(SEEK_STEP_LARGE, <MdForward30 size={48} />)
      },
      {
        match: e => e.code === 'Space' || e.key === 'k' || e.key === 'K',
        action: () =>
          setPlaying(p => {
            onActionIcon?.(!p ? <MdPlayArrow size={48} /> : <MdPause size={48} />)
            return !p
          })
      },
      { match: e => e.key === 'f' || e.key === 'F', action: () => toggleFullscreen() },
      { match: e => e.code === 'ArrowUp', action: () => adjustVolume(VOLUME_STEP) },
      { match: e => e.code === 'ArrowDown', action: () => adjustVolume(-VOLUME_STEP) },
      {
        match: e => e.key.length === 1 && e.key >= '0' && e.key <= '9' && duration > 0,
        action: e => jumpToPercent(Number.parseInt(e.key, 10) / 10)
      },
      {
        match: e => e.shiftKey && (e.key === '<' || e.key === ','),
        action: () => adjustPlaybackRate(-PLAYBACK_RATE_STEP)
      },
      {
        match: e => e.shiftKey && (e.key === '>' || e.key === '.'),
        action: () => adjustPlaybackRate(PLAYBACK_RATE_STEP)
      },
      { match: e => e.key === 'm' || e.key === 'M', action: () => toggleMute() }
    ]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      for (const { match, action } of keyActions) {
        if (match(e)) {
          e.preventDefault()
          action(e)
          shortcutActiveSetter(true)
          setTimeout(() => shortcutActiveSetter(false), SHORTCUT_ACTIVE_TIMEOUT)
          break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [
    playerRef,
    duration,
    setPlaying,
    setVolume,
    toggleFullscreen,
    shortcutActiveSetter,
    setPlaybackRate,
    playbackRate,
    onActionIcon,
    disable
  ])
}
