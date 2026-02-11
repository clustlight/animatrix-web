import { useState } from 'react'
import { NoImage } from './NoImage'

type PortraitImageProps = {
  src?: string
  alt: string
  className?: string
}

export function PortraitImage({ src, alt, className }: PortraitImageProps) {
  const [error, setError] = useState(false)
  const sizeClass = className ?? 'w-full h-full'

  if (!src || error) return <NoImage width='w-full' height='h-full' className={sizeClass} />
  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClass} object-cover rounded shadow`}
      onError={() => setError(true)}
    />
  )
}
