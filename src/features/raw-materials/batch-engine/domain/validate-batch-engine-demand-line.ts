import type { CuttingPlanLine } from '@/features/engineering-db/data/cutting-plan-schema'
import {
  toPositiveNumber,
  type CutSizeDisplaySnapshot,
  type CutSizeGeometryProjection,
} from '../../cut-size-library/domain/cut-size-geometry'
import type { BatchEngineInvalidDemandLine } from './batch-engine-demand-line-types'
import { getBatchEngineDemandLineLabel } from './map-batch-engine-demand-line'

function hasExplicitInvalidPositiveInteger(value: string | undefined) {
  const raw = value?.trim() || ''
  if (!raw) return false
  return Math.floor(toPositiveNumber(raw)) <= 0
}

export function validateBatchEngineDemandLine(
  line: CuttingPlanLine,
  demandLineId: string,
  cutSizeGeometry: CutSizeGeometryProjection,
  cutSizeDisplay: CutSizeDisplaySnapshot
): BatchEngineInvalidDemandLine | null {
  if (!cutSizeGeometry.widthMm || !cutSizeGeometry.lengthMm) {
    return {
      demandLineId,
      sequenceNo: line.sequenceNo,
      lineLabel: getBatchEngineDemandLineLabel(line, cutSizeDisplay),
      reason: '尺寸单元缺少有效宽长',
      line,
    }
  }

  if (hasExplicitInvalidPositiveInteger(line.requiredSets)) {
    return {
      demandLineId,
      sequenceNo: line.sequenceNo,
      lineLabel: getBatchEngineDemandLineLabel(line, cutSizeDisplay),
      reason: '需求套数必须为大于 0 的整数',
      line,
    }
  }

  if (hasExplicitInvalidPositiveInteger(line.priority)) {
    return {
      demandLineId,
      sequenceNo: line.sequenceNo,
      lineLabel: getBatchEngineDemandLineLabel(line, cutSizeDisplay),
      reason: '优先级必须为大于 0 的整数',
      line,
    }
  }

  return null
}
