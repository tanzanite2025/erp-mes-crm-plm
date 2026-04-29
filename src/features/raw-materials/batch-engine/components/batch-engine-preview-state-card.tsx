import type { ReactNode } from 'react'
import type { BatchEnginePreviewDisplayMode } from '../services/batch-engine-preview-display'

type BatchEnginePreviewStateCardProps = {
  title: string
  mode: BatchEnginePreviewDisplayMode
  solvedContent: ReactNode
  previewContent: ReactNode
}

export function BatchEnginePreviewStateCard(props: BatchEnginePreviewStateCardProps) {
  const { title, mode, solvedContent, previewContent } = props

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>{title}</p>
      {mode === 'solved-plan' ? solvedContent : previewContent}
    </div>
  )
}
