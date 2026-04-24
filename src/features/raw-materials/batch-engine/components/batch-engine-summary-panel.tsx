import { ClipboardCheck, MoveRight, ScrollText } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { BatchEngineSimulation } from '../types'

type BatchEngineSummaryPanelProps = {
  simulation: BatchEngineSimulation
}

export function BatchEngineSummaryPanel({ simulation }: BatchEngineSummaryPanelProps) {
  const { t } = useLanguage()

  return (
    <section className='rounded-[26px] border border-dashed border-slate-300/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.8))] p-4 shadow-none'>
      <div className='flex items-start gap-3'>
        <div className='flex size-10 shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white/85 text-slate-600'>
          <ClipboardCheck className='size-4' />
        </div>
        <div>
          <p className='text-[10px] font-black uppercase tracking-[0.24em] text-slate-500/75'>
            {t('rawMaterials.batchEngine.sections.summary.kicker')}
          </p>
          <h2 className='mt-2 text-base font-black tracking-tight text-slate-900'>
            {t('rawMaterials.batchEngine.sections.summary.title')}
          </h2>
          <p className='mt-1 text-xs leading-5 text-slate-600/85'>
            {t('rawMaterials.batchEngine.sections.summary.description')}
          </p>
        </div>
      </div>

      <div className='mt-4 grid gap-3'>
        <div className='rounded-[22px] border border-slate-200 bg-white/85 p-4'>
          <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            <ScrollText className='size-4 text-cyan-700' />
            {t('rawMaterials.batchEngine.sections.summary.cards.output.title')}
          </div>
          {simulation.ready ? (
            <div className='mt-3 grid gap-2 text-xs font-semibold text-slate-700'>
              <p>可执行套数: {simulation.executableSets}</p>
              <p>可执行块数: {simulation.executablePieceCount}</p>
              <p>消耗原始裁块: {simulation.consumedRawPieces}</p>
              <p>利用率: {simulation.utilizationPercent.toFixed(2)}%</p>
              <p>损耗面积: {simulation.lossAreaM2.toFixed(3)} m2</p>
            </div>
          ) : (
            <p className='mt-3 text-sm font-semibold text-slate-800'>
              {simulation.reason || t('rawMaterials.batchEngine.sections.summary.cards.output.value')}
            </p>
          )}
          <p className='mt-1 text-xs leading-5 text-slate-600/80'>
            {t('rawMaterials.batchEngine.sections.summary.cards.output.hint')}
          </p>
        </div>

        <div className='rounded-[22px] border border-slate-200 bg-white/85 p-4'>
          <div className='flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            <MoveRight className='size-4 text-cyan-700' />
            {t('rawMaterials.batchEngine.sections.summary.cards.linkage.title')}
          </div>
          <ol className='mt-3 grid gap-2 text-xs leading-5 text-slate-700'>
            <li>{t('rawMaterials.batchEngine.sections.summary.cards.linkage.step1')}</li>
            <li>{t('rawMaterials.batchEngine.sections.summary.cards.linkage.step2')}</li>
            <li>{t('rawMaterials.batchEngine.sections.summary.cards.linkage.step3')}</li>
          </ol>
        </div>

        <div className='rounded-[22px] border border-dashed border-slate-300 bg-slate-50/70 p-4'>
          <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/70'>
            {t('rawMaterials.batchEngine.sections.summary.todoTitle')}
          </p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {[
              t('rawMaterials.batchEngine.todo.rollBinding'),
              t('rawMaterials.batchEngine.todo.cutRule'),
              t('rawMaterials.batchEngine.todo.lossModel'),
              t('rawMaterials.batchEngine.todo.issuanceLink'),
            ].map((item) => (
              <span
                key={item}
                className='rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600'
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
