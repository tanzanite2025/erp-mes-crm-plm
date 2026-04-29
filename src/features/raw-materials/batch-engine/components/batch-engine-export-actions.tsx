import { Download, FileDown, ScrollText } from 'lucide-react'
import type { BatchOptimizerPlan, BatchOptimizerPlanDiffSummary } from '../types'
import {
  exportBatchEngineReviewCsv,
  exportBatchEngineReviewJson,
  printBatchEngineReviewPdf,
} from '../services/export-batch-engine-review'

type BatchEngineExportActionsProps = {
  plan: BatchOptimizerPlan
  diffSummary: BatchOptimizerPlanDiffSummary
  className?: string
  buttonClassName?: string
}

export function BatchEngineExportActions(props: BatchEngineExportActionsProps) {
  const { plan, diffSummary, className, buttonClassName } = props
  const mergedButtonClassName = buttonClassName ?? 'inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700'

  return (
    <div className={className ?? 'mt-3 flex flex-wrap gap-2'}>
      <button
        type='button'
        onClick={() => exportBatchEngineReviewJson(plan, diffSummary)}
        className={mergedButtonClassName}
      >
        <Download className='size-4' />
        导出 JSON
      </button>
      <button
        type='button'
        onClick={() => exportBatchEngineReviewCsv(plan, diffSummary)}
        className={mergedButtonClassName}
      >
        <FileDown className='size-4' />
        导出 CSV
      </button>
      <button
        type='button'
        onClick={() => printBatchEngineReviewPdf(plan, diffSummary)}
        className={mergedButtonClassName}
      >
        <ScrollText className='size-4' />
        导出 PDF
      </button>
    </div>
  )
}
