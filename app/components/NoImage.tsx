export function NoImage({ className = '', text = 'No Image', width = 'w-40', height = 'h-24' }) {
  return (
    <div
      className={`${width} ${height} bg-gray-700 flex items-center justify-center rounded ${className}`}
    >
      <span className='text-gray-400 text-xs'>{text}</span>
    </div>
  )
}
