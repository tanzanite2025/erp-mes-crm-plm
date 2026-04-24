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
import { formatCutSizeExpression } from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import { BatchEngineCuttingCanvas } from './batch-engine-cutting-canvas'

type BatchEngineCuttingPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  controls: BatchEngineControls
  simulation: BatchEngineSimulation
}

export function BatchEngineCuttingPreviewDialog(props: BatchEngineCuttingPreviewDialogProps) {
  const { t } = useLanguage()
  const { open, onOpenChange, controls, simulation } = props

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
            {t('rawMaterials.batchEngine.canvasPreview.title')}
          </DialogTitle>
          <DialogDescription className='text-xs font-semibold text-slate-600'>
            {t('rawMaterials.batchEngine.canvasPreview.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)]'>
          <div className='flex flex-wrap items-center gap-1.5 border-b border-dashed border-slate-200 bg-white px-4 py-2.5'>
            <SummaryPill
              label={t('rawMaterials.batchEngine.canvasPreview.summary.roll')}
              value={`${controls.rollLengthM || '--'}m x ${controls.rollWidthMm || '--'}mm`}
            />
            <SummaryPill
              label={t('rawMaterials.batchEngine.canvasPreview.summary.unit')}
              value={
                simulation.selectedUnit
                  ? `${simulation.selectedUnit.code} / ${formatCutSizeExpression(simulation.selectedUnit) || '--'}`
                  : '--'
              }
            />
            <SummaryPill
              label={t('rawMaterials.batchEngine.canvasPreview.summary.executableSets')}
              value={`${simulation.executableSets}`}
            />
            <SummaryPill
              label={t('rawMaterials.batchEngine.canvasPreview.summary.executablePieces')}
              value={`${simulation.executablePieceCount}`}
            />
            <SummaryPill
              label={t('rawMaterials.batchEngine.canvasPreview.summary.utilization')}
              value={`${simulation.utilizationPercent.toFixed(2)}%`}
            />
          </div>

          <div className='min-h-0 p-3'>
            <BatchEngineCuttingCanvas controls={controls} simulation={simulation} />
          </div>
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

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-700'>
      <span className='font-black text-slate-500'>{label}: </span>
      {value}
    </div>
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
