import type { Episode } from '../../types'
import type { useSyoboiSeasonSync } from '../../hooks/useSyoboiSeasonSync'

type SyncState = ReturnType<typeof useSyoboiSeasonSync>

export function SyoboiSeasonSyncPanel({
  sync,
  seriesTitle,
  episodes
}: {
  sync: SyncState
  seriesTitle: string
  episodes: Episode[]
}) {
  const {
    query: syoboiQuery,
    setQuery: setSyoboiQuery,
    results: syoboiResults,
    selected: syoboiSelected,
    setSelected: setSyoboiSelected,
    loading: syoboiLoading,
    error: syoboiError,
    searched: syoboiSearched,
    applyLoading: syoboiApplyLoading,
    appendLoading: syoboiAppendLoading,
    episodeLoading: syoboiEpisodeLoading,
    episodeProgress: syoboiEpisodeProgress,
    startEpisodeNumber,
    setStartEpisodeNumber,
    search: handleSyoboiSearch,
    applyEpisodeSchedule: handleSyoboiEpisodeApply,
    applySelected: handleSyoboiApply,
    appendSelected: handleSyoboiAppend
  } = sync

  return (
    <div className='mt-4 border-t border-border pt-4'>
      <div className='text-sm font-semibold mb-2'>しょぼいカレンダー連携</div>
      <div className='flex gap-2 mb-2'>
        <input
          type='text'
          value={syoboiQuery}
          onChange={e => setSyoboiQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleSyoboiSearch()
            }
          }}
          className='flex-1 bg-background text-foreground border border-border px-2 py-1 rounded'
          placeholder='タイトルで検索'
          disabled={syoboiLoading || syoboiApplyLoading}
        />
        <button
          className='px-2 py-1 text-xs text-muted-foreground border border-border rounded hover:text-foreground transition-colors'
          onClick={() => {
            setSyoboiQuery(seriesTitle)
            handleSyoboiSearch(seriesTitle)
          }}
          disabled={!seriesTitle || syoboiLoading || syoboiApplyLoading}
          type='button'
        >
          シリーズ名
        </button>
        <button
          className='px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded disabled:opacity-60'
          onClick={() => handleSyoboiSearch()}
          disabled={syoboiLoading || syoboiApplyLoading}
          type='button'
        >
          {syoboiLoading ? '検索中...' : '検索'}
        </button>
      </div>
      {syoboiError && <div className='text-red-400 text-xs mb-2'>{syoboiError}</div>}
      <div className='max-h-40 overflow-y-auto mb-2 syoboi-scroll'>
        <style>
          {`\n                .syoboi-scroll::-webkit-scrollbar { width: 6px; background: var(--scrollbar-track); }\n                .syoboi-scroll::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }\n                .syoboi-scroll::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-thumb-hover); }\n                .syoboi-scroll::-webkit-scrollbar-track { background: var(--scrollbar-track); }\n              `}
        </style>
        <ul>
          {syoboiSearched && syoboiResults.length === 0 && !syoboiLoading && (
            <li className='text-muted-foreground text-xs text-center py-2'>検索結果なし</li>
          )}
          {syoboiResults.map(item => (
            <li key={item.tid} className='mb-1'>
              <button
                className={`w-full text-left px-2 py-1 rounded text-xs transition ${
                  syoboiSelected?.tid === item.tid
                    ? 'bg-primary text-primary-foreground border border-primary/60 shadow-sm'
                    : 'bg-muted/70 text-foreground border border-border hover:bg-muted'
                }`}
                onClick={() => setSyoboiSelected(item)}
                type='button'
              >
                <div className='font-semibold'>{item.title}</div>
                <div
                  className={`text-[11px] ${
                    syoboiSelected?.tid === item.tid
                      ? 'text-primary-foreground/90'
                      : 'text-muted-foreground'
                  }`}
                >
                  {item.firstYear ? `${item.firstYear}/${item.firstMonth || ''}` : '不明'}
                  {item.firstEndYear ? ` 〜 ${item.firstEndYear}/${item.firstEndMonth || ''}` : ''}
                  {item.firstCh ? ` ・ ${item.firstCh}` : ''}
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className='flex flex-wrap gap-2'>
        <button
          className='px-3 py-1 bg-green-700 hover:bg-green-800 text-white rounded disabled:opacity-60'
          onClick={handleSyoboiApply}
          disabled={!syoboiSelected || syoboiApplyLoading || syoboiAppendLoading}
          type='button'
        >
          {syoboiApplyLoading ? '転写中...' : '選択した内容を転写'}
        </button>
        <button
          className='px-3 py-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded disabled:opacity-60'
          onClick={handleSyoboiAppend}
          disabled={!syoboiSelected || syoboiAppendLoading || syoboiApplyLoading}
          type='button'
        >
          {syoboiAppendLoading ? '追記中...' : '内容を追記'}
        </button>
      </div>
      <div className='mt-3 flex flex-wrap items-center gap-3'>
        <label className='flex items-center gap-2 text-xs text-muted-foreground'>
          開始する内部話数
          <input
            type='number'
            min={1}
            step={1}
            value={startEpisodeNumber}
            onChange={event => setStartEpisodeNumber(Math.max(1, Number(event.target.value) || 1))}
            className='w-20 rounded border border-border bg-background px-2 py-1 text-foreground'
            disabled={syoboiEpisodeLoading}
          />
        </label>
        <span className='basis-full text-xs text-muted-foreground'>
          内部話数と同じCountを優先し、放送情報がなければ開始内部話数からの相対Countで転写します
        </span>
        <button
          className='px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded disabled:opacity-60'
          onClick={handleSyoboiEpisodeApply}
          disabled={syoboiEpisodeLoading || episodes.length === 0}
          type='button'
        >
          {syoboiEpisodeLoading ? '各話を転写中...' : '各話の放送日/コメントを転写'}
        </button>
        {syoboiEpisodeLoading && (
          <span className='text-xs text-muted-foreground'>進捗: {syoboiEpisodeProgress}%</span>
        )}
      </div>
    </div>
  )
}
