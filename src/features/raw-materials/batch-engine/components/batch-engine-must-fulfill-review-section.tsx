import { useLanguage } from '@/context/language-provider'
import type {
  BatchEngineTranslate,
  BatchOptimizerMustFulfillDiagnostic,
  BatchOptimizerPlan,
} from '../types'

type BatchEngineMustFulfillReviewSectionProps = {
  selectedPlan?: BatchOptimizerPlan
}

function getMustDiagnosticTone(status: string) {
  return status === 'unfulfilled'
    ? 'border-rose-200 bg-rose-500/10 text-rose-700'
    : 'border-emerald-200 bg-emerald-500/10 text-emerald-700'
}

function getMustDiagnosticStatusLabel(
  item: BatchOptimizerMustFulfillDiagnostic,
  t: BatchEngineTranslate
) {
  return item.status === 'unfulfilled'
    ? t('rawMaterials.batchEngine.mustReview.statuses.unfulfilled')
    : t('rawMaterials.batchEngine.mustReview.statuses.fulfilled')
}

function getMustDiagnosticConstraintLabel(
  item: BatchOptimizerMustFulfillDiagnostic,
  t: BatchEngineTranslate
) {
  switch (item.blockingConstraintCode) {
    case 'group':
      return t('rawMaterials.batchEngine.mustReview.constraints.group')
    case 'sequence':
      return t('rawMaterials.batchEngine.mustReview.constraints.sequence')
    case 'direction':
      return t('rawMaterials.batchEngine.mustReview.constraints.direction')
    case 'mix':
      return t('rawMaterials.batchEngine.mustReview.constraints.mix')
    case 'capacity':
      return t('rawMaterials.batchEngine.mustReview.constraints.capacity')
    default:
      return t('rawMaterials.batchEngine.mustReview.constraints.none')
  }
}

export function BatchEngineMustFulfillReviewSection(
  props: BatchEngineMustFulfillReviewSectionProps
) {
  const { t } = useLanguage()
  const { selectedPlan } = props

  if (!selectedPlan) {
    return null
  }

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase'>
        {t('rawMaterials.batchEngine.mustReview.title')}
      </p>
      <div className='mt-3 grid gap-2'>
        {selectedPlan.mustFulfillDiagnostics.length ? (
          selectedPlan.mustFulfillDiagnostics.map((item) => (
            <div
              key={`${item.demandLineId}-${item.reasonCode}`}
              className={`rounded-2xl border px-3 py-3 text-xs font-semibold ${getMustDiagnosticTone(item.status)}`}
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <p className='text-[10px] font-black tracking-[0.16em] uppercase'>
                  {item.demandLineId}
                </p>
                <span className='rounded-full border border-current/20 bg-white/60 px-2 py-1 font-mono text-[8px]'>
                  {getMustDiagnosticStatusLabel(item, t)}
                </span>
              </div>
              <div className='mt-2 flex flex-wrap gap-2'>
                <span className='rounded-full border border-current/20 bg-white/60 px-2 py-1 font-mono text-[8px]'>
                  {getMustDiagnosticConstraintLabel(item, t)}
                </span>
                <span className='rounded-full border border-current/20 bg-white/60 px-2 py-1 font-mono text-[8px]'>
                  {item.reasonCode}
                </span>
              </div>
              <div className='mt-2 grid gap-1.5'>
                <p>{item.message}</p>
                <p>
                  {t('rawMaterials.batchEngine.mustReview.labels.constraint')}:{' '}
                  {item.blockingConstraint}
                </p>
                <p>
                  {t('rawMaterials.batchEngine.mustReview.labels.suggestion')}:{' '}
                  {item.suggestion}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-xs font-semibold text-slate-600'>
            {t('rawMaterials.batchEngine.mustReview.empty')}
          </div>
        )}
      </div>
    </div>
  )
}
