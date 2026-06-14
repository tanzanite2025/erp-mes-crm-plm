import { useLanguage } from '@/context/language-provider'
import type { BatchOptimizerPlan } from '../types'

type BatchEngineScoreBreakdownPanelProps = {
  plan: BatchOptimizerPlan
  compact?: boolean
}

export function BatchEngineScoreBreakdownPanel(
  props: BatchEngineScoreBreakdownPanelProps
) {
  const { t } = useLanguage()
  const { plan, compact = false } = props
  const breakdown = plan.scoreBreakdown
  const structuredRuleRiskCount =
    breakdown.groupSplitCount +
    breakdown.sequenceViolationCount +
    breakdown.directionSwitchCount +
    breakdown.mixViolationCount

  return (
    <div className='rounded-[24px] border border-dashed border-slate-300 bg-white/90 p-4'>
      <p className='text-[10px] font-black tracking-[0.2em] text-slate-500/75 uppercase italic'>
        {t('rawMaterials.batchEngine.scoreBreakdown.title')}
      </p>
      <p className='mt-1 text-[9px] font-black tracking-[0.18em] text-slate-400 uppercase'>
        {t('rawMaterials.batchEngine.scoreBreakdown.subtitle')}
      </p>

      <div
        className={
          compact ? 'mt-3 grid gap-2' : 'mt-3 grid gap-2 md:grid-cols-2'
        }
      >
        <ScoreMetric
          label={t('rawMaterials.batchEngine.scoreBreakdown.fields.finalScore')}
          value={breakdown.finalScore.toFixed(2)}
          tone='healthy'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.fulfilledRate'
          )}
          value={`${breakdown.fulfilledRatePercent.toFixed(2)}%`}
          tone='neutral'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.structuredRuleRisk'
          )}
          value={`${structuredRuleRiskCount}`}
          tone={structuredRuleRiskCount > 0 ? 'critical' : 'healthy'}
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.fulfilledContribution'
          )}
          value={`+${breakdown.fulfilledContribution.toFixed(2)}`}
          tone='healthy'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.utilizationContribution'
          )}
          value={`+${breakdown.utilizationContribution.toFixed(2)}`}
          tone='healthy'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.assignmentPenalty'
          )}
          value={`-${breakdown.assignmentPenalty.toFixed(2)}`}
          tone='alert'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.unfulfilledPenalty'
          )}
          value={`-${breakdown.unfulfilledPenalty.toFixed(2)}`}
          tone='alert'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.splitPenalty'
          )}
          value={`-${breakdown.splitPenalty.toFixed(2)}`}
          tone='alert'
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.mustPenalty'
          )}
          value={`-${breakdown.mustFulfillPenalty.toFixed(2)}`}
          tone={breakdown.mustFulfillPenalty > 0 ? 'critical' : 'neutral'}
        />
        <ScoreMetric
          label={t('rawMaterials.batchEngine.scoreBreakdown.fields.groupSplit')}
          value={`${breakdown.groupSplitCount}`}
          tone={breakdown.groupSplitCount > 0 ? 'alert' : 'healthy'}
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.sequenceViolation'
          )}
          value={`${breakdown.sequenceViolationCount}`}
          tone={breakdown.sequenceViolationCount > 0 ? 'alert' : 'healthy'}
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.directionSwitch'
          )}
          value={`${breakdown.directionSwitchCount}`}
          tone={breakdown.directionSwitchCount > 0 ? 'alert' : 'healthy'}
        />
        <ScoreMetric
          label={t(
            'rawMaterials.batchEngine.scoreBreakdown.fields.mixViolation'
          )}
          value={`${breakdown.mixViolationCount}`}
          tone={breakdown.mixViolationCount > 0 ? 'critical' : 'healthy'}
        />
      </div>
    </div>
  )
}

function ScoreMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'healthy' | 'alert' | 'critical' | 'neutral'
}) {
  const className =
    tone === 'healthy'
      ? 'border-emerald-200 bg-emerald-500/10 text-emerald-700'
      : tone === 'alert'
        ? 'border-amber-200 bg-amber-500/10 text-amber-700'
        : tone === 'critical'
          ? 'border-rose-200 bg-rose-500/10 text-rose-700'
          : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div className={`rounded-2xl border px-3 py-2 ${className}`}>
      <p className='text-[8px] font-black tracking-[0.18em] text-current/70 uppercase'>
        {label}
      </p>
      <p className='mt-1 text-xs font-black text-current'>{value}</p>
    </div>
  )
}
