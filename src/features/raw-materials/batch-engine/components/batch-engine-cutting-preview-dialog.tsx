import { useMemo } from 'react'
import { Maximize2, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/context/language-provider'
import type { BatchEngineControls, BatchEngineNormalizedControls, BatchEngineSimulation, BatchOptimizerPlan, BatchOptimizerPlanDiffSummary, BatchOptimizerPlanLayoutDemandSummary } from '../types'
import {
  resolveBatchEnginePreviewDialogDescription,
  resolveBatchEnginePreviewDialogTitle,
  resolveBatchEnginePreviewDisplayState,
} from '../services/batch-engine-preview-display'
import {
  resolveBatchEngineExplainabilityHighlightZoneIds,
  type BatchEngineExplainabilityTargetKind,
} from '../services/batch-engine-phase7-visualization'
import { BatchEngineCuttingCanvas } from './batch-engine-cutting-canvas'
import { BatchEnginePreviewSidePanel } from './batch-engine-preview-side-panel'
import { BatchEnginePreviewSummaryStrip } from './batch-engine-preview-summary-strip'

type BatchEngineCuttingPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  controls: BatchEngineControls
  normalizedControls: BatchEngineNormalizedControls
  simulation: BatchEngineSimulation
  selectedPlan?: BatchOptimizerPlan
  plans: BatchOptimizerPlan[]
  baselinePlanRank: number | null
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  explicitSelectedDemandLineId: string
  explicitSelectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  effectiveSelectedDemandLineId: string
  effectiveSelectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  selectedDemandLineId: string
  relatedRollIds: string[]
  filteredRollIds: string[]
  onSelectBaselinePlan: (rank: number) => void
  onSelectDemandLine: (demandLineId: string) => void
  selectedExplainabilityTargetId: string
  selectedExplainabilityTargetKind: BatchEngineExplainabilityTargetKind
  onSelectExplainabilityTarget: (targetId: string, targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''>) => void
}

export function BatchEngineCuttingPreviewDialog(props: BatchEngineCuttingPreviewDialogProps) {
  const { t } = useLanguage()
  const {
    open,
    onOpenChange,
    controls,
    normalizedControls,
    simulation,
    selectedPlan,
    plans,
    baselinePlanRank,
    activeDiffSummary,
    explicitSelectedDemandLineId,
    explicitSelectedDemand,
    effectiveSelectedDemandLineId,
    effectiveSelectedDemand,
    selectedDemandLineId,
    relatedRollIds,
    filteredRollIds,
    onSelectBaselinePlan,
    onSelectDemandLine,
    selectedExplainabilityTargetId,
    selectedExplainabilityTargetKind,
    onSelectExplainabilityTarget,
  } = props

  const linkedHighlightZoneIds = useMemo(
    () => resolveBatchEngineExplainabilityHighlightZoneIds(selectedPlan, selectedExplainabilityTargetId, selectedExplainabilityTargetKind),
    [selectedExplainabilityTargetId, selectedExplainabilityTargetKind, selectedPlan]
  )
  const displayState = useMemo(
    () => resolveBatchEnginePreviewDisplayState(selectedPlan, activeDiffSummary),
    [activeDiffSummary, selectedPlan]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton
        className='flex min-h-0 max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[1500px] flex-col gap-0 overflow-hidden rounded-[24px] p-0 sm:w-[calc(100vw-2rem)] sm:max-w-[1500px]'
      >
        <DialogHeader className='border-b border-dashed border-slate-200 bg-slate-50/80 px-4 py-3'>
          <DialogTitle className='flex items-center gap-2 text-lg font-black tracking-tight text-slate-900'>
            <Maximize2 className='size-5 text-cyan-700' />
            {resolveBatchEnginePreviewDialogTitle(displayState, t('rawMaterials.batchEngine.canvasPreview.title'))}
          </DialogTitle>
          <DialogDescription className='text-xs font-semibold text-slate-600'>
            {resolveBatchEnginePreviewDialogDescription(displayState, t('rawMaterials.batchEngine.canvasPreview.description'))}
          </DialogDescription>
        </DialogHeader>

        <div className='grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
            <BatchEnginePreviewSummaryStrip
              displayState={displayState}
              controls={controls}
              simulation={simulation}
            />

            <div className='min-h-0 p-3'>
              <BatchEngineCuttingCanvas
                controls={normalizedControls}
                simulation={simulation}
                selectedPlan={selectedPlan}
                activeDiffSummary={activeDiffSummary}
                highlightedDemandLineId={selectedDemandLineId}
                highlightedZoneIds={linkedHighlightZoneIds}
                filteredRollIds={filteredRollIds}
                onSelectDemandLine={onSelectDemandLine}
              />
            </div>
          </div>

          <BatchEnginePreviewSidePanel
            displayState={displayState}
            plans={plans}
            baselinePlanRank={baselinePlanRank}
            explicitSelectedDemandLineId={explicitSelectedDemandLineId}
            explicitSelectedDemand={explicitSelectedDemand}
            effectiveSelectedDemandLineId={effectiveSelectedDemandLineId}
            effectiveSelectedDemand={effectiveSelectedDemand}
            relatedRollIds={relatedRollIds}
            filteredRollIds={filteredRollIds}
            onSelectBaselinePlan={onSelectBaselinePlan}
            selectedExplainabilityTargetId={selectedExplainabilityTargetId}
            selectedExplainabilityTargetKind={selectedExplainabilityTargetKind}
            onSelectExplainabilityTarget={onSelectExplainabilityTarget}
          />
        </div>

        <DialogFooter className='border-t border-dashed border-slate-200 bg-slate-50/70 px-4 py-2.5 sm:items-center sm:justify-between'>
          <div className='flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-semibold text-slate-600'>
            <LegendDot color='bg-slate-900' label={t('rawMaterials.batchEngine.canvasPreview.legend.roll')} />
            <LegendDot color='bg-cyan-500' label={t('rawMaterials.batchEngine.canvasPreview.legend.strip')} />
            <LegendDot color='bg-emerald-500' label={t('rawMaterials.batchEngine.canvasPreview.legend.piece')} />
            <LegendDot color='bg-amber-400' label={t('rawMaterials.batchEngine.canvasPreview.legend.loss')} />
            <LegendDot
              color='bg-slate-400'
              label={t('rawMaterials.batchEngine.canvasPreview.legend.aggregate')}
            />
          </div>
          <Button variant='outline' onClick={() => onOpenChange(false)} className='shrink-0 rounded-full px-5 font-black'>
            <Scissors className='size-4' />
            {t('rawMaterials.batchEngine.canvasPreview.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className='inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1'>
      <span className={`size-2 rounded-full ${color}`} />
      {label}
    </span>
  )
}
