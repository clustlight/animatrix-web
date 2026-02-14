import React from 'react'

type SearchProps = {
  placeholder: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const Search: React.FC<SearchProps> = ({ placeholder, value, onChange, onKeyDown }) => {
  return (
    <input
      type='text'
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className='
        border rounded
        px-2 py-1 text-sm
        sm:px-3 sm:py-2 sm:text-base
        w-full
        focus:outline-none focus:ring-orange-400 focus:border-orange-400
      '
      aria-label={placeholder}
    />
  )
}
