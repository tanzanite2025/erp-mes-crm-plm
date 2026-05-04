import { ChartColumnIncreasing, Maximize2, Scissors } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/context/language-provider'
import type { BatchEngineLegendItem, BatchEngineSimulation } from '../types'

type BatchEngineSimulationStageProps = {
  legend: BatchEngineLegendItem[]
  simulation: BatchEngineSimulation
  canSolve: boolean
  solveDisabledReason: string
  isSolving: boolean
  onSolve: () => void
  onOpenPreview: () => void
}

function getLegendToneClassName(tone: BatchEngineLegendItem['tone']) {
  switch (tone) {
    case 'roll':
      return 'bg-slate-900'
    case 'strip':
      return 'bg-cyan-600'
    case 'piece':
      return 'bg-emerald-500'
    case 'loss':
      return 'bg-amber-400'
    default:
      return 'bg-slate-300'
  }
}

export function BatchEngineSimulationStage(props: BatchEngineSimulationStageProps) {
  const { t } = useLanguage()
  const { legend, simulation, canSolve, solveDisabledReason, isSolving, onSolve, onOpenPreview } = props

  return (
    <section className='rounded-[28px] border border-border/50 bg-card p-4 shadow-none'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/10'>
              <Scissors className='size-4' />
            </div>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-primary/70'>
                {t('rawMaterials.batchEngine.sections.stage.kicker')}
              </p>
              <h2 className='mt-2 text-base font-black tracking-tight text-foreground'>
                {t('rawMaterials.batchEngine.sections.stage.title')}
              </h2>
              <p className='mt-1 text-xs leading-5 text-muted-foreground/80'>
                {t('rawMaterials.batchEngine.sections.stage.description')}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            {legend.map((item) => (
              <span
                key={item.key}
                className='inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground'
              >
                <span className={`size-2.5 rounded-full ${getLegendToneClassName(item.tone)}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className='rounded-[24px] border border-border/40 bg-muted/5 p-4 shadow-inner'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60'>
                {t('rawMaterials.batchEngine.sections.stage.rollCanvasLabel')}
              </p>
              <p className='mt-1 text-sm font-semibold text-foreground/90'>
                {simulation.selectedPlanName
                  ? `${t('rawMaterials.batchEngine.sections.stage.planPrefix')}: ${simulation.selectedPlanName} / ${simulation.demandLineCount}`
                  : t('rawMaterials.batchEngine.sections.stage.rollCanvasHint')}
              </p>
            </div>

            <div className='flex items-center gap-2'>
              <div className='inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground'>
                <ChartColumnIncreasing className='size-4 text-primary/80' />
                {simulation.ready
                  ? t('rawMaterials.batchEngine.sections.stage.computedStatus')
                  : t('rawMaterials.batchEngine.sections.stage.simulationStatus')}
              </div>
              <Button
                type='button'
                className='h-8 rounded-full px-3 text-xs font-black uppercase tracking-wider'
                disabled={!canSolve || isSolving}
                onClick={onSolve}
              >
                {isSolving ? '正式求解中' : '正式求解'}
              </Button>
              <Button
                type='button'
                variant='outline'
                className='h-8 rounded-full px-3 text-xs font-black'
                onClick={onOpenPreview}
              >
                <Maximize2 className='size-4' />
                {t('rawMaterials.batchEngine.sections.stage.openCanvas')}
              </Button>
            </div>
          </div>

          {!canSolve && solveDisabledReason ? (
            <p className='mt-3 text-xs font-semibold text-destructive/80'>{solveDisabledReason}</p>
          ) : null}

          <div className='mt-4 rounded-[22px] border border-dashed border-border/40 bg-background/50 p-4'>
            <div className='rounded-[18px] border border-primary/20 bg-muted/5 p-4'>
              {!simulation.ready ? (
                <div className='rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-6 text-center text-sm font-semibold text-primary/70'>
                  {simulation.reason || t('rawMaterials.batchEngine.sections.stage.pendingHint')}
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='grid gap-2 md:grid-cols-5'>
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.demandLines')}
                      value={`${simulation.demandLineCount}`}
                    />
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.validDemandLines')}
                      value={`${simulation.validDemandLineCount}`}
                    />
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.totalRequiredPieces')}
                      value={`${simulation.totalRequiredPieces}`}
                    />
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.totalDemandArea')}
                      value={simulation.totalDemandAreaM2.toFixed(3)}
                    />
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.totalOccupiedArea')}
                      value={simulation.totalOccupiedAreaM2.toFixed(3)}
                    />
                  </div>

                  <div className='grid gap-2 md:grid-cols-2'>
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.leftoverWidth')}
                      value={simulation.leftoverWidthMm.toFixed(1)}
                    />
                    <StatPill
                      label={t('rawMaterials.batchEngine.sections.stage.stats.leftoverLength')}
                      value={simulation.leftoverLengthMm.toFixed(1)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 py-2'>
      <p className='text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/70'>{label}</p>
      <p className='mt-1 text-sm font-black text-cyan-50'>{value}</p>
    </div>
  )
}
