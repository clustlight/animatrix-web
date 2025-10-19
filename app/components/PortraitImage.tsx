import { useState } from 'react'
import { NoImage } from './NoImage'

export function PortraitImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false)
  if (!src || error) return <NoImage width='w-36' height='h-52' />
  return (
    <img
      src={src}
      alt={alt}
      className='w-36 h-52 object-cover rounded shadow'
      onError={() => setError(true)}
    />
  )
}
