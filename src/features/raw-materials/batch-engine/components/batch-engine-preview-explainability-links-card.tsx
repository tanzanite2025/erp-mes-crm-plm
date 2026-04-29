import type { ReactNode } from 'react'
import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEnginePreviewStateCard } from './batch-engine-preview-state-card'

type BatchEnginePreviewExplainabilityLinksCardProps = {
  displayState: BatchEnginePreviewDisplayState
  title: string
  emptyText: string
  previewText: string
  items?: Array<{ key: string; active: boolean; onClick: () => void; content: ReactNode }>
  activeClassName: string
  idleClassName: string
}

export function BatchEnginePreviewExplainabilityLinksCard(props: BatchEnginePreviewExplainabilityLinksCardProps) {
  const { displayState, title, emptyText, previewText, items, activeClassName, idleClassName } = props

  return (
    <BatchEnginePreviewStateCard
      title={title}
      mode={displayState.mode}
      solvedContent={items?.length ? (
          <div className='mt-3 grid gap-2'>
            {items.map((item) => (
              <button
                key={item.key}
                type='button'
                onClick={item.onClick}
                className={item.active ? activeClassName : idleClassName}
              >
                {item.content}
              </button>
            ))}
          </div>
      ) : (
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>{emptyText}</p>
        </div>
      )}
      previewContent={(
        <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
          <p>{previewText}</p>
        </div>
      )}
    />
  )
}
