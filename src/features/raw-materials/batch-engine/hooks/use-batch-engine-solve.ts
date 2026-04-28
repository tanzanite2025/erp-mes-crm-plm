import { useEffect, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import { toPositiveNumber } from '../../cut-size-library/domain/cut-size-geometry'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import { BatchEngineApi } from '../services/batch-engine-api'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import type { BatchOptimizerSolveRequest } from '../types/batch-engine-api'
import type { BuildBatchEngineDemandLinesResult } from '../domain/build-batch-engine-demand-lines-from-cutting-plan'

type UseBatchEngineSolveOptions = {
  controls: BatchEngineControls
  selectedCuttingPlan?: CuttingPlan
  selectedPrepregSpec?: PrepregMaterialSpec
  mappedDemandLines: BuildBatchEngineDemandLinesResult
  simulation: BatchEngineSimulation
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function buildBatchEngineSolveRequest(
  options: UseBatchEngineSolveOptions
): BatchOptimizerSolveRequest | null {
  const { controls, selectedCuttingPlan, selectedPrepregSpec, mappedDemandLines, simulation } = options
  if (!selectedPrepregSpec || !selectedCuttingPlan || !simulation.ready) {
    return null
  }

  const rollWidthMm = toPositiveNumber(controls.rollWidthMm)
  const rollLengthM = toPositiveNumber(controls.rollLengthM)
  const knifeGapMm = toPositiveNumber(controls.knifeGapMm)
  const defaultEdgeTrimMm = toPositiveNumber(controls.edgeTrimMm)
  const validDemandLines = mappedDemandLines.validLines
  const rollAreaM2 = round((rollWidthMm * rollLengthM * 1000) / 1_000_000, 3)

  if (!rollWidthMm || !rollLengthM || validDemandLines.length <= 0) {
    return null
  }

  return {
    rolls: [
      {
        rollId: selectedPrepregSpec.id,
        prepregSpecId: selectedPrepregSpec.id,
        rollWidthMm,
        rollLengthM,
        remainingAreaM2: rollAreaM2,
        edgeTrimMm: defaultEdgeTrimMm,
        status: selectedPrepregSpec.status,
      },
    ],
    demandLines: validDemandLines.map((item) => ({
      demandLineId: item.demandLineId,
      cutSizeUnitId: item.cutSizeUnitId,
      widthMm: item.widthMm,
      lengthMm: item.lengthMm,
      pieceCountPerSet: item.pieceCountPerSet,
      requiredSets: item.requiredSets,
      requiredPieces: item.requiredPieces,
      layupCount: item.layupCount,
      cutAngle: item.cutAngle,
      usageType: item.usageType,
      priority: item.priority,
      allowMixedPlan: item.allowMixedPlan,
      mustFulfill: item.mustFulfill,
      rollGroupKey: item.rollGroupKey,
      orderSequence: item.orderSequence,
      yarnDirectionMode: item.yarnDirectionMode,
      processTags: item.processTags,
      noteKeywords: item.noteKeywords,
    })),
    knifeGapMm,
    defaultEdgeTrimMm,
    objectivePreset: controls.objectivePreset,
    scoreWeights: {
      fulfilledWeight: toPositiveNumber(controls.fulfilledWeight),
      utilizationWeight: toPositiveNumber(controls.utilizationWeight),
      stabilityWeight: toPositiveNumber(controls.stabilityWeight),
      assignmentPenaltyWeight: toPositiveNumber(controls.assignmentPenaltyWeight),
      unfulfilledPenaltyWeight: toPositiveNumber(controls.unfulfilledPenaltyWeight),
      splitPenaltyWeight: toPositiveNumber(controls.splitPenaltyWeight),
      mustPenaltyWeight: toPositiveNumber(controls.mustPenaltyWeight),
    },
    maxCandidatePlans: 3,
    timeLimitMs: 2000,
  }
}

/**
 * 管理 batch-engine 的正式后端求解调用，并与本地 preview 状态保持分离。
 */
export function useBatchEngineSolve(options: UseBatchEngineSolveOptions) {
  const { controls, selectedCuttingPlan, selectedPrepregSpec, mappedDemandLines, simulation } = options
  const request = useMemo(
    () =>
      buildBatchEngineSolveRequest({
        controls,
        selectedCuttingPlan,
        selectedPrepregSpec,
        mappedDemandLines,
        simulation,
      }),
    [controls, mappedDemandLines, selectedCuttingPlan, selectedPrepregSpec, simulation]
  )
  const requestSignature = useMemo(() => JSON.stringify(request ?? null), [request])
  const mutation = useMutation({
    mutationFn: (payload: BatchOptimizerSolveRequest) => BatchEngineApi.solve(payload),
  })
  const { reset, mutate, mutateAsync, data, isPending, error } = mutation

  useEffect(() => {
    reset()
  }, [requestSignature, reset])

  const solveDisabledReason = useMemo(() => {
    if (!selectedPrepregSpec) {
      return '请选择预浸料规格'
    }
    if (!selectedCuttingPlan) {
      return '请选择裁纱单据'
    }
    if (mappedDemandLines.validLines.length <= 0) {
      return mappedDemandLines.invalidLines.length > 0
        ? '裁纱单据缺少可用于求解的有效行'
        : '当前裁纱单据没有可求解行'
    }
    if (!simulation.ready) {
      return simulation.reason || '当前输入不足以触发正式求解'
    }
    if (!request) {
      return '当前输入不足以生成正式求解请求'
    }
    return ''
  }, [mappedDemandLines.invalidLines.length, mappedDemandLines.validLines.length, request, selectedCuttingPlan, selectedPrepregSpec, simulation])

  return {
    canSolve: Boolean(request),
    solveDisabledReason,
    solution: data,
    isSolving: isPending,
    solveError:
      error instanceof Error
        ? error.message
        : error
          ? '正式求解失败'
          : '',
    solve: () => {
      if (!request) {
        return
      }
      mutate(request)
    },
    solveAsync: async () => {
      if (!request) {
        throw new Error(solveDisabledReason || '当前输入不足以生成正式求解请求')
      }
      return mutateAsync(request)
    },
    resetSolution: reset,
  }
}
