import { useCallback, useState } from 'react'
import type { Episode } from '../types'

type DownloaderResult = {
  progress: number | null
  download: () => Promise<void>
  error: string | null
}

export function useEpisodeDownloader(episodeData: Episode): DownloaderResult {
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const download = useCallback(async () => {
    setProgress(0)
    setError(null)
    try {
      const res = await fetch(episodeData.video_url, { credentials: 'include' })
      if (!res.body) throw new Error('Streaming is not supported')
      const contentLength = Number(res.headers.get('Content-Length'))
      const reader = res.body.getReader()
      let receivedLength = 0
      const chunks: Uint8Array[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
          receivedLength += value.length
          if (contentLength) setProgress(Math.round((receivedLength / contentLength) * 100))
        }
      }

      const merged = new Uint8Array(receivedLength)
      let position = 0
      for (const chunk of chunks) {
        merged.set(chunk, position)
        position += chunk.length
      }
      const url = URL.createObjectURL(new Blob([merged]))
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${episodeData.episode_id}__${episodeData.title}.mp4`
      document.body.appendChild(anchor)
      anchor.click()
      setTimeout(() => {
        document.body.removeChild(anchor)
        URL.revokeObjectURL(url)
      }, 1000)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Download failed')
    } finally {
      setProgress(null)
    }
  }, [episodeData.video_url, episodeData.episode_id, episodeData.title])

  return { progress, download, error }
}
