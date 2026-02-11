import { useEffect } from 'react'
import { MdClose, MdShare, MdContentCopy } from 'react-icons/md'

type ShareDialogProps = {
  open: boolean
  onClose: () => void
  url: string
  onCopy: () => void
  includeTime: boolean
  setIncludeTime: (v: boolean) => void
}

export function ShareDialog({
  open,
  onClose,
  url,
  onCopy,
  includeTime,
  setIncludeTime
}: ShareDialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60'>
      <div
        className='bg-card text-card-foreground border border-border rounded shadow-lg p-6 min-w-[420px] max-w-[98vw] relative'
        style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.45)', width: '480px' }}
      >
        <button
          className='absolute top-2 right-2 text-muted-foreground hover:text-foreground cursor-pointer'
          onClick={onClose}
          aria-label='閉じる'
        >
          <MdClose size={24} />
        </button>
        <div className='mb-3 font-bold text-lg flex items-center gap-2'>
          <MdShare size={22} />
          共有リンク
        </div>
        <label className='flex items-center gap-2 mb-2 text-sm cursor-pointer select-none'>
          <input
            type='checkbox'
            checked={includeTime}
            onChange={e => setIncludeTime(e.target.checked)}
            className='accent-blue-500 cursor-pointer'
          />
          現在の再生位置を含める
        </label>
        <div className='flex items-center gap-2'>
          <input
            type='text'
            readOnly
            value={url}
            className='flex-1 border border-border rounded px-2 py-1 text-sm bg-background text-foreground'
            style={{ minWidth: 0 }}
            onFocus={e => e.target.select()}
          />
          <button
            className='p-2 bg-blue-600 hover:bg-blue-700 text-white rounded cursor-pointer'
            onClick={() => {
              navigator.clipboard.writeText(url)
              onCopy()
            }}
          >
            <MdContentCopy size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
