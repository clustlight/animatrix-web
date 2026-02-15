export function NoImage({
  className = '',
  text = 'No Image',
  width = 'w-40',
  height = 'h-24'
}: {
  className?: string
  text?: string
  width?: string
  height?: string
}) {
  return (
    <div
      className={`${width} ${height} bg-muted flex items-center justify-center rounded ${className}`}
    >
      <span className='text-muted-foreground text-xs'>{text}</span>
    </div>
  )
}
