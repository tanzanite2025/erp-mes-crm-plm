import { useLanguage } from '@/context/language-provider'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'

type BatchEnginePreviewSummaryStripProps = {
  displayState: BatchEnginePreviewDisplayState
  controls: BatchEngineControls
  simulation: BatchEngineSimulation
}

export function BatchEnginePreviewSummaryStrip(props: BatchEnginePreviewSummaryStripProps) {
  const { t } = useLanguage()
  const { displayState, controls, simulation } = props
  const { selectedPlan } = displayState

  return (
    <div className='flex flex-wrap items-center gap-1.5 border-b border-dashed border-slate-200 bg-white px-4 py-2.5'>
      <SummaryPill
        label={displayState.mode === 'solved-plan' ? '视图模式' : t('rawMaterials.batchEngine.canvasPreview.summary.roll')}
        value={selectedPlan ? `方案 #${selectedPlan.rank} / ${selectedPlan.strategyKey}` : `${controls.rollLengthM || '--'}m x ${controls.rollWidthMm || '--'}mm`}
      />
      <SummaryPill
        label={displayState.mode === 'solved-plan' ? '卷材数' : t('rawMaterials.batchEngine.canvasPreview.summary.unit')}
        value={
          selectedPlan
            ? `${selectedPlan.layoutSummary.rollCount}`
            : simulation.selectedPlanName
              ? `${simulation.selectedPlanName}`
              : '--'
        }
      />
      <SummaryPill
        label={displayState.mode === 'solved-plan' ? '分配条目' : t('rawMaterials.batchEngine.canvasPreview.summary.executableSets')}
        value={selectedPlan ? `${selectedPlan.layoutSummary.assignmentCount}` : `${simulation.demandLineCount}`}
      />
      <SummaryPill
        label={displayState.mode === 'solved-plan' ? '未满足需求' : t('rawMaterials.batchEngine.canvasPreview.summary.executablePieces')}
        value={selectedPlan ? `${selectedPlan.layoutSummary.unfulfilledDemandLineCount}` : `${simulation.totalRequiredPieces}`}
      />
      <SummaryPill
        label={t('rawMaterials.batchEngine.canvasPreview.summary.utilization')}
        value={selectedPlan ? `${selectedPlan.utilizationPercent.toFixed(2)}%` : `${simulation.utilizationPercent.toFixed(2)}%`}
      />
    </div>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700'>
      <span className='font-black text-slate-500'>{label}: </span>
      {value}
    </div>
  )
}
