import type { CuttingPlanLine } from '@/features/engineering-db/data/cutting-plan-schema'
import type { CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import { toPositiveNumber } from '../../cut-size-library/domain/cut-size-geometry'
import type { BatchEngineResolvedDemandLineRules } from './batch-engine-demand-line-types'

function normalizePriority(line: CuttingPlanLine, index: number) {
  const explicitPriority = Math.floor(toPositiveNumber(line.priority))
  if (explicitPriority > 0) return explicitPriority

  const orderedPriority = Math.floor(
    toPositiveNumber(line.constraintProfile?.orderSequence)
  )
  if (orderedPriority > 0) {
    return Math.max(1, 10_000 - orderedPriority)
  }

  return Math.max(1, 100 - index)
}

function resolveAllowMixedPlan(line: CuttingPlanLine) {
  if (typeof line.allowMixedPlan === 'boolean') return line.allowMixedPlan
  return !(
    line.constraintProfile?.processTags?.some(
      (item) => item.toLowerCase() === 'no-mix'
    ) ||
    line.constraintProfile?.noteKeywords?.some(
      (item) => item.toLowerCase() === 'no-mix'
    )
  )
}

function resolveMustFulfill(line: CuttingPlanLine) {
  if (typeof line.mustFulfill === 'boolean') return line.mustFulfill
  return !line.constraintProfile?.noteKeywords?.some(
    (item) => item.toLowerCase() === 'optional'
  )
}

function resolveUsageType(line: CuttingPlanLine, unit: CutSizeUnit) {
  return (
    line.constraintProfile?.yarnDirectionMode?.trim() ||
    line.yarnDirection?.trim() ||
    unit.usageType?.trim() ||
    'default'
  )
}

function normalizeRuleStringArray(values: string[] | undefined) {
  return (values || []).map((item) => item.trim()).filter(Boolean)
}

export function resolveBatchEngineDemandLineRules(
  line: CuttingPlanLine,
  unit: CutSizeUnit,
  index: number
): BatchEngineResolvedDemandLineRules {
  return {
    priority: normalizePriority(line, index),
    allowMixedPlan: resolveAllowMixedPlan(line),
    mustFulfill: resolveMustFulfill(line),
    usageType: resolveUsageType(line, unit),
    rollGroupKey: line.constraintProfile?.rollGroupKey?.trim() || '',
    orderSequence: Math.floor(
      toPositiveNumber(line.constraintProfile?.orderSequence)
    ),
    yarnDirectionMode:
      line.constraintProfile?.yarnDirectionMode?.trim() ||
      line.yarnDirection?.trim() ||
      '',
    processTags: normalizeRuleStringArray(line.constraintProfile?.processTags),
    noteKeywords: normalizeRuleStringArray(
      line.constraintProfile?.noteKeywords
    ),
  }
}
