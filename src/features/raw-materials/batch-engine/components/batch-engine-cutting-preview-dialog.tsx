import { FileDown, Maximize2, Scissors } from 'lucide-react'
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
import type { BatchEngineControls, BatchEngineSimulation, BatchOptimizerPlan, BatchOptimizerPlanDiffSummary, BatchOptimizerPlanLayoutDemandSummary } from '../types'
import { exportBatchEngineReviewCsv, exportBatchEngineReviewJson, printBatchEngineReviewPdf } from '../services/export-batch-engine-review'
import { BatchEngineDiffBaselineSelector } from './batch-engine-diff-baseline-selector'
import { BatchEngineCuttingCanvas } from './batch-engine-cutting-canvas'
import { BatchEngineScoreBreakdownPanel } from './batch-engine-score-breakdown-panel'

type BatchEngineCuttingPreviewDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  controls: BatchEngineControls
  simulation: BatchEngineSimulation
  selectedPlan?: BatchOptimizerPlan
  plans: BatchOptimizerPlan[]
  baselinePlanRank: number | null
  activeDiffSummary?: BatchOptimizerPlanDiffSummary
  selectedDemand?: BatchOptimizerPlanLayoutDemandSummary
  selectedDemandLineId: string
  relatedRollIds: string[]
  filteredRollIds: string[]
  onSelectBaselinePlan: (rank: number) => void
  onSelectDemandLine: (demandLineId: string) => void
}

export function BatchEngineCuttingPreviewDialog(props: BatchEngineCuttingPreviewDialogProps) {
  const { t } = useLanguage()
  const { open, onOpenChange, controls, simulation, selectedPlan, plans, baselinePlanRank, activeDiffSummary, selectedDemand, selectedDemandLineId, relatedRollIds, filteredRollIds, onSelectBaselinePlan, onSelectDemandLine } = props

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
            {selectedPlan ? '正式方案视图' : t('rawMaterials.batchEngine.canvasPreview.title')}
          </DialogTitle>
          <DialogDescription className='text-xs font-semibold text-slate-600'>
            {selectedPlan ? '当前弹窗已切换到正式方案布局摘要视图，并与选中方案保持同步。' : t('rawMaterials.batchEngine.canvasPreview.description')}
          </DialogDescription>
        </DialogHeader>

        <div className='grid min-h-0 flex-1 xl:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='grid min-h-0 grid-rows-[auto_minmax(0,1fr)]'>
            <div className='flex flex-wrap items-center gap-1.5 border-b border-dashed border-slate-200 bg-white px-4 py-2.5'>
            <SummaryPill
              label={selectedPlan ? '视图模式' : t('rawMaterials.batchEngine.canvasPreview.summary.roll')}
              value={selectedPlan ? `方案 #${selectedPlan.rank} / ${selectedPlan.strategyKey}` : `${controls.rollLengthM || '--'}m x ${controls.rollWidthMm || '--'}mm`}
            />
            <SummaryPill
              label={selectedPlan ? '卷材数' : t('rawMaterials.batchEngine.canvasPreview.summary.unit')}
              value={
                selectedPlan
                  ? `${selectedPlan.layoutSummary.rollCount}`
                  : simulation.selectedPlanName
                    ? `${simulation.selectedPlanName}`
                    : '--'
              }
            />
            <SummaryPill
              label={selectedPlan ? '分配条目' : t('rawMaterials.batchEngine.canvasPreview.summary.executableSets')}
              value={selectedPlan ? `${selectedPlan.layoutSummary.assignmentCount}` : `${simulation.demandLineCount}`}
            />
            <SummaryPill
              label={selectedPlan ? '未满足需求' : t('rawMaterials.batchEngine.canvasPreview.summary.executablePieces')}
              value={selectedPlan ? `${selectedPlan.layoutSummary.unfulfilledDemandLineCount}` : `${simulation.totalRequiredPieces}`}
            />
            <SummaryPill
              label={t('rawMaterials.batchEngine.canvasPreview.summary.utilization')}
              value={selectedPlan ? `${selectedPlan.utilizationPercent.toFixed(2)}%` : `${simulation.utilizationPercent.toFixed(2)}%`}
            />
            </div>

            <div className='min-h-0 p-3'>
              <BatchEngineCuttingCanvas
                controls={controls}
                simulation={simulation}
                selectedPlan={selectedPlan}
                activeDiffSummary={activeDiffSummary}
                highlightedDemandLineId={selectedDemandLineId}
                filteredRollIds={filteredRollIds}
                onSelectDemandLine={onSelectDemandLine}
              />
            </div>
          </div>

          <div className='border-t border-dashed border-slate-200 bg-slate-50/70 p-3 xl:border-t-0 xl:border-l'>
            <div className='flex flex-col gap-3'>
              <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>方案概览</p>
                {selectedPlan ? (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>候选排名: #{selectedPlan.rank}</p>
                    <p>策略: {selectedPlan.strategyKey}</p>
                    <p>评分: {selectedPlan.score.toFixed(2)}</p>
                    <p>利用率: {selectedPlan.utilizationPercent.toFixed(2)}%</p>
                    <p>损耗: {selectedPlan.lossAreaM2.toFixed(3)} m2</p>
                    <p>已满足需求行: {selectedPlan.layoutSummary.fulfilledDemandLineCount}</p>
                    <p>未满足需求行: {selectedPlan.layoutSummary.unfulfilledDemandLineCount}</p>
                    <p>相对基准: Top{activeDiffSummary?.baselinePlanRank ?? selectedPlan.diffSummary.baselinePlanRank}</p>
                    <div className='mt-2 flex flex-wrap gap-2'>
                      <Button variant='outline' onClick={() => exportBatchEngineReviewJson(selectedPlan, activeDiffSummary ?? selectedPlan.diffSummary)} className='h-11 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'>
                        导出 JSON
                      </Button>
                      <Button variant='outline' onClick={() => exportBatchEngineReviewCsv(selectedPlan, activeDiffSummary ?? selectedPlan.diffSummary)} className='h-11 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'>
                        <FileDown className='size-4' />
                        导出 CSV
                      </Button>
                      <Button variant='outline' onClick={() => printBatchEngineReviewPdf(selectedPlan, activeDiffSummary ?? selectedPlan.diffSummary)} className='h-11 rounded-full px-4 text-[10px] font-black uppercase tracking-[0.18em]'>
                        导出 PDF
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>当前展示的是本地 preview 视图。</p>
                    <p>正式求解后重新打开弹窗，可查看候选方案布局摘要。</p>
                  </div>
                )}
              </div>

              <BatchEngineDiffBaselineSelector
                plans={plans}
                baselinePlanRank={baselinePlanRank}
                onChangeBaselinePlan={onSelectBaselinePlan}
              />

              <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>损耗构成</p>
                {selectedPlan ? (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>未用卷材面积: {selectedPlan.lossBreakdown.unusedRollAreaM2.toFixed(3)} m2</p>
                    <p>未满足需求面积: {selectedPlan.lossBreakdown.unfulfilledAreaM2.toFixed(3)} m2</p>
                    <p>预估修边损耗: {selectedPlan.lossBreakdown.trimLossAreaM2.toFixed(3)} m2</p>
                    <p>{selectedPlan.lossBreakdown.message}</p>
                  </div>
                ) : (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>当前损耗仍基于本地 preview 估算。</p>
                    <p>正式候选生成后，这里会切换为后端方案级损耗解释。</p>
                  </div>
                )}
              </div>

              <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>当前需求行</p>
                {selectedDemand ? (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>ID: {selectedDemand.demandLineId}</p>
                    <p>覆盖率: {selectedDemand.coveragePercent.toFixed(2)}%</p>
                    <p>需求套数: {selectedDemand.requiredSets}</p>
                    <p>已分配套数: {selectedDemand.allocatedSets}</p>
                    <p>剩余套数: {selectedDemand.remainingSets}</p>
                    <p>跨卷分配: {selectedDemand.isSplitAcrossRolls ? '是' : '否'}</p>
                  </div>
                ) : (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>当前未选中需求行。</p>
                    <p>可从摘要区选择需求行，或直接点击正式方案画布中的区域。</p>
                  </div>
                )}
              </div>

              <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>卷材布局摘要</p>
                {selectedPlan ? (
                  <div className='mt-3 grid gap-2'>
                    {selectedPlan.layoutSummary.rolls.map((roll) => (
                      <div
                        key={roll.rollId}
                        className={relatedRollIds.includes(roll.rollId)
                          ? 'rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-700'
                          : filteredRollIds.includes(roll.rollId)
                            ? 'rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-semibold text-slate-700'
                            : 'rounded-2xl border border-dashed border-slate-200 bg-slate-100/60 px-3 py-2 text-xs font-semibold text-slate-400'}
                      >
                        <p>{roll.rollId}</p>
                        <p>利用率: {roll.utilizationPercent.toFixed(2)}%</p>
                        <p>分配套数: {roll.allocatedSets}</p>
                        <p>分配块数: {roll.allocatedPieces}</p>
                        <p>剩余面积: {roll.unusedAreaM2.toFixed(3)} m2</p>
                        {relatedRollIds.includes(roll.rollId) ? <p>当前需求相关卷材</p> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>本地 preview 不包含正式候选的卷材聚合摘要。</p>
                  </div>
                )}
              </div>

              {selectedPlan ? <BatchEngineScoreBreakdownPanel plan={selectedPlan} compact /> : null}

              <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>Must 诊断</p>
                {selectedPlan ? (
                  selectedPlan.mustFulfillDiagnostics.length ? (
                    <div className='mt-3 grid gap-2'>
                      {selectedPlan.mustFulfillDiagnostics.map((item) => (
                        <div key={`${item.demandLineId}-${item.reasonCode}`} className={item.status === 'unfulfilled'
                          ? 'rounded-2xl border border-rose-200 bg-rose-500/10 px-3 py-3 text-xs font-semibold text-rose-700'
                          : 'rounded-2xl border border-emerald-200 bg-emerald-500/10 px-3 py-3 text-xs font-semibold text-emerald-700'}
                        >
                          <p>{item.demandLineId} / {item.reasonCode}</p>
                          <p className='mt-1'>{item.message}</p>
                          <p className='mt-1'>约束: {item.blockingConstraint}</p>
                          <p className='mt-1'>建议: {item.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                      <p>当前方案没有 mustFulfill 诊断信息。</p>
                    </div>
                  )
                ) : (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>本地 preview 不包含正式候选的 mustFulfill 诊断。</p>
                  </div>
                )}
              </div>

              <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/75'>候选差异摘要</p>
                {selectedPlan ? (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>新增区域: {(activeDiffSummary ?? selectedPlan.diffSummary).addedZoneIds.length}</p>
                    <p>移除区域: {(activeDiffSummary ?? selectedPlan.diffSummary).removedZoneIds.length}</p>
                    <p>变化需求: {(activeDiffSummary ?? selectedPlan.diffSummary).changedDemandLineIds.join(', ') || '--'}</p>
                    <p>变化卷材: {(activeDiffSummary ?? selectedPlan.diffSummary).changedRollIds.join(', ') || '--'}</p>
                    <p>热区数: {(activeDiffSummary ?? selectedPlan.diffSummary).highlightZoneIds.length}</p>
                  </div>
                ) : (
                  <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
                    <p>本地 preview 不包含正式候选差异摘要。</p>
                  </div>
                )}
              </div>
            </div>
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
