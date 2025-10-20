import { useState } from 'react'
import { NoImage } from './NoImage'

export function PortraitImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false)
  if (!src || error) return <NoImage width='w-40' height='h-60' />
  return (
    <img
      src={src}
      alt={alt}
      className='w-40 h-60 object-cover rounded shadow'
      onError={() => setError(true)}
    />
  )
}
