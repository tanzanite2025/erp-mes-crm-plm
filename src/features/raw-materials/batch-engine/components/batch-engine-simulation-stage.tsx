import { ChartColumnIncreasing, Scissors } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { formatCutSizeExpression } from '../../cut-size-library/data/cut-size-library-schema'
import type { BatchEngineLegendItem, BatchEngineSimulation } from '../types'

type BatchEngineSimulationStageProps = {
  legend: BatchEngineLegendItem[]
  simulation: BatchEngineSimulation
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
  const { legend, simulation } = props

  return (
    <section className='rounded-[28px] border border-cyan-300/55 bg-[linear-gradient(180deg,rgba(236,254,255,0.9),rgba(255,255,255,0.98))] p-4 shadow-[0_18px_50px_-34px_rgba(8,145,178,0.45)]'>
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-lg shadow-cyan-600/20'>
              <Scissors className='size-4' />
            </div>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.24em] text-cyan-700/75'>
                {t('rawMaterials.batchEngine.sections.stage.kicker')}
              </p>
              <h2 className='mt-2 text-base font-black tracking-tight text-slate-950'>
                {t('rawMaterials.batchEngine.sections.stage.title')}
              </h2>
              <p className='mt-1 text-xs leading-5 text-slate-600/85'>
                {t('rawMaterials.batchEngine.sections.stage.description')}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap gap-2'>
            {legend.map((item) => (
              <span
                key={item.key}
                className='inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'
              >
                <span className={`size-2.5 rounded-full ${getLegendToneClassName(item.tone)}`} />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className='rounded-[24px] border border-white/80 bg-white/85 p-4 shadow-inner'>
          <div className='flex items-center justify-between gap-3'>
            <div>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
                {t('rawMaterials.batchEngine.sections.stage.rollCanvasLabel')}
              </p>
              <p className='mt-1 text-sm font-semibold text-slate-800'>
                {simulation.selectedUnit
                  ? `尺寸单元: ${simulation.selectedUnit.code} / ${formatCutSizeExpression(simulation.selectedUnit) || '--'}`
                  : t('rawMaterials.batchEngine.sections.stage.rollCanvasHint')}
              </p>
            </div>
            <div className='inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'>
              <ChartColumnIncreasing className='size-4 text-cyan-700' />
              {simulation.ready ? '长条优先已计算' : t('rawMaterials.batchEngine.sections.stage.simulationStatus')}
            </div>
          </div>

          <div className='mt-4 rounded-[22px] border border-dashed border-slate-300/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] p-4'>
            <div className='rounded-[18px] border border-cyan-400/30 bg-slate-950/70 p-4'>
              {!simulation.ready ? (
                <div className='rounded-2xl border border-dashed border-cyan-500/40 bg-cyan-500/10 px-4 py-6 text-center text-sm font-semibold text-cyan-100/85'>
                  {simulation.reason || '等待输入参数'}
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='grid gap-2 md:grid-cols-3'>
                    <StatPill label='长条数量' value={`${simulation.stripsPerRoll}`} />
                    <StatPill label='每条可切块' value={`${simulation.piecesPerStrip}`} />
                    <StatPill label='可执行套数' value={`${simulation.executableSets}`} />
                  </div>

                  <div className='grid gap-3'>
                    {simulation.stripVisuals.map((strip) => (
                      <div key={strip.id} className='rounded-[16px] border border-cyan-500/20 bg-cyan-500/8 p-3'>
                        <div className='flex items-center justify-between gap-3'>
                          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/75'>
                            {strip.title}
                          </p>
                          <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-200/90'>
                            可切 {strip.pieceCount} 块
                          </p>
                        </div>
                        <div className='mt-2 flex flex-wrap gap-2'>
                          {Array.from({ length: strip.previewPieceCount }).map((_, index) => (
                            <div
                              key={`${strip.id}-piece-${index + 1}`}
                              className='min-w-[74px] rounded-xl border border-emerald-400/25 bg-emerald-400/15 px-2 py-1 text-center text-[10px] font-black tracking-[0.14em] text-emerald-100'
                            >
                              P{index + 1}
                            </div>
                          ))}
                          {strip.pieceCount > strip.previewPieceCount ? (
                            <div className='min-w-[74px] rounded-xl border border-slate-400/30 bg-slate-400/15 px-2 py-1 text-center text-[10px] font-black tracking-[0.14em] text-slate-100'>
                              +{strip.pieceCount - strip.previewPieceCount}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className='grid gap-2 md:grid-cols-2'>
                    <StatPill label='余宽 (mm)' value={simulation.leftoverWidthMm.toFixed(1)} />
                    <StatPill label='余长 (mm)' value={simulation.leftoverLengthMm.toFixed(1)} />
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
