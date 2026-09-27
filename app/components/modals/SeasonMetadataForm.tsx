import type { SeasonMetadata } from '../../types'

export function SeasonMetadataForm({
  metadata,
  onChange,
  onSave,
  loading
}: {
  metadata: SeasonMetadata
  onChange: <K extends keyof SeasonMetadata>(key: K, value: SeasonMetadata[K]) => void
  onSave: () => void
  loading: boolean
}) {
  return (
    <section className='space-y-3 border-b border-border pb-4'>
      <h3 className='text-sm font-semibold'>基本情報</h3>
      <label className='block space-y-1 text-sm'>
        <span>シーズン名</span>
        <input
          type='text'
          value={metadata.season_title}
          onChange={event => onChange('season_title', event.target.value)}
          disabled={loading}
          className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
        />
      </label>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        <label className='block space-y-1 text-sm'>
          <span>読み</span>
          <input
            type='text'
            value={metadata.season_title_yomi}
            onChange={event => onChange('season_title_yomi', event.target.value)}
            disabled={loading}
            className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
          />
        </label>
        <label className='block space-y-1 text-sm'>
          <span>シーズン番号</span>
          <input
            type='number'
            min={0}
            value={metadata.season_number || ''}
            onChange={event => onChange('season_number', Number(event.target.value) || 0)}
            disabled={loading}
            className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
          />
        </label>
        <label className='block space-y-1 text-sm'>
          <span>しょぼいカレンダー ID</span>
          <input
            type='number'
            min={0}
            value={metadata.shoboi_tid || ''}
            onChange={event => onChange('shoboi_tid', Number(event.target.value) || 0)}
            disabled={loading}
            className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
          />
        </label>
      </div>
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {(
          [
            ['first_year', '開始年'],
            ['first_month', '開始月'],
            ['first_end_year', '終了年'],
            ['first_end_month', '終了月']
          ] as const
        ).map(([key, label]) => (
          <label key={key} className='block space-y-1 text-sm'>
            <span>{label}</span>
            <input
              type='number'
              min={0}
              max={key.endsWith('month') ? 12 : undefined}
              value={metadata[key] || ''}
              onChange={event => onChange(key, Number(event.target.value) || 0)}
              disabled={loading}
              className='w-full rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
            />
          </label>
        ))}
      </div>
      <label className='block space-y-1 text-sm'>
        <span>説明</span>
        <textarea
          value={metadata.description}
          onChange={event => onChange('description', event.target.value)}
          disabled={loading}
          rows={8}
          className='w-full min-h-48 resize-y rounded border border-border bg-background px-2 py-1.5 text-foreground disabled:opacity-60'
        />
      </label>
      <div className='flex justify-end'>
        <button
          type='button'
          onClick={onSave}
          disabled={loading || !metadata.season_title.trim()}
          className='rounded bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-60'
        >
          {loading ? '保存中…' : 'シーズン情報を保存'}
        </button>
      </div>
    </section>
  )
}
