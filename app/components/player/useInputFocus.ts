import { useEffect, useState } from 'react'

export function useInputFocus() {
  const [inputFocused, setInputFocused] = useState(false)

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      ) {
        setInputFocused(true)
      }
    }
    const handleFocusOut = (e: FocusEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === 'INPUT' ||
        (e.target as HTMLElement)?.tagName === 'TEXTAREA'
      ) {
        setInputFocused(false)
      }
    }
    window.addEventListener('focusin', handleFocusIn)
    window.addEventListener('focusout', handleFocusOut)
    return () => {
      window.removeEventListener('focusin', handleFocusIn)
      window.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  return inputFocused
}
