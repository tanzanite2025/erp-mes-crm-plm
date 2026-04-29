import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import { type CutSizeUnit } from '../../cut-size-library/data/cut-size-library-schema'
import {
  resolveCutSizeGeometryProjection,
} from '../../cut-size-library/domain/cut-size-geometry'
import {
  type BatchEngineInvalidDemandLine,
  type BatchEngineResolvedDemandLine,
  type BuildBatchEngineDemandLinesResult,
} from './batch-engine-demand-line-types'
import { mapBatchEngineDemandLine, getBatchEngineDemandLineLabel } from './map-batch-engine-demand-line'
import { resolveBatchEngineDemandLineRules } from './resolve-batch-engine-demand-line-rules'
import { validateBatchEngineDemandLine } from './validate-batch-engine-demand-line'

export type { BuildBatchEngineDemandLinesResult } from './batch-engine-demand-line-types'

export function buildBatchEngineDemandLinesFromCuttingPlan(
  cuttingPlan: CuttingPlan | undefined,
  cutSizeUnits: CutSizeUnit[]
): BuildBatchEngineDemandLinesResult {
  if (!cuttingPlan) {
    return {
      validLines: [],
      invalidLines: [],
    }
  }

  const validLines: BatchEngineResolvedDemandLine[] = []
  const invalidLines: BatchEngineInvalidDemandLine[] = []

  cuttingPlan.lines.forEach((line, index) => {
    const demandLineId = line.id || `${cuttingPlan.id}-line-${index + 1}`
    const baseLabel = getBatchEngineDemandLineLabel(line)

    if (!line.cutSizeId?.trim()) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: baseLabel,
        reason: '未绑定尺寸单元',
        line,
      })
      return
    }

    const cutSizeUnit = cutSizeUnits.find((item) => item.id === line.cutSizeId)
    if (!cutSizeUnit) {
      invalidLines.push({
        demandLineId,
        sequenceNo: line.sequenceNo,
        lineLabel: baseLabel,
        reason: '关联尺寸单元不存在或未启用',
        line,
      })
      return
    }

    const { geometry: cutSizeGeometry, display: cutSizeDisplay } = resolveCutSizeGeometryProjection(cutSizeUnit)
    const invalidLine = validateBatchEngineDemandLine(
      line,
      demandLineId,
      cutSizeGeometry,
      cutSizeDisplay
    )

    if (invalidLine) {
      invalidLines.push(invalidLine)
      return
    }

    const rules = resolveBatchEngineDemandLineRules(line, cutSizeUnit, index)

    validLines.push(
      mapBatchEngineDemandLine({
        demandLineId,
        line,
        cutSizeGeometry,
        cutSizeDisplay,
        rules,
      })
    )
  })

  return {
    validLines,
    invalidLines,
  }
}
