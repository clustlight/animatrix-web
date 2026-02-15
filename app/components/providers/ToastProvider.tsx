import React, { createContext, useContext, useState, useCallback } from 'react'
import { MdInfoOutline, MdErrorOutline } from 'react-icons/md'

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

type ToastContextType = {
  showToast: (message: string, type?: 'success' | 'error') => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`flex items-center gap-3 px-6 py-3 rounded shadow font-semibold
      ${type === 'success' ? 'bg-blue-800 text-white' : 'bg-red-800 text-white'}`}
    >
      {type === 'success' ? (
        <MdInfoOutline size={26} className='shrink-0' />
      ) : (
        <MdErrorOutline size={26} className='shrink-0' />
      )}
      <span className='text-base'>{message}</span>
    </div>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className='fixed bottom-6 right-6 z-9999 flex flex-col gap-2 items-end pointer-events-none'>
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              animate-fade-in
              pointer-events-auto
              min-w-65 max-w-lg
            `}
            style={{ opacity: 0.95 }}
          >
            <Toast type={t.type} message={t.message} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
