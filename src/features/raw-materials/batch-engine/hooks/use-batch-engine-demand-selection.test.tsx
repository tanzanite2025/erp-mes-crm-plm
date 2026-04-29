// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BatchOptimizerPlan } from '../types'
import { useBatchEngineDemandSelection } from './use-batch-engine-demand-selection'

function buildPlan(): BatchOptimizerPlan {
  return {
    rank: 1,
    strategyKey: 'phase7-geometry-priority-first',
    score: 98.2,
    utilizationPercent: 91.2,
    lossAreaM2: 0.012,
    explanation: 'phase7 explainability',
    assignments: [],
    unfulfilledLines: [],
    layoutSummary: {
      canvasWidthMm: 200,
      canvasHeightMm: 120,
      rollCount: 2,
      assignmentCount: 2,
      fulfilledDemandLineCount: 1,
      unfulfilledDemandLineCount: 1,
      rolls: [
        {
          rollId: 'roll-a',
          allocatedSets: 2,
          allocatedPieces: 4,
          utilizedAreaM2: 0.8,
          utilizationPercent: 80,
          unusedAreaM2: 0.2,
          isUsed: true,
        },
        {
          rollId: 'roll-b',
          allocatedSets: 1,
          allocatedPieces: 2,
          utilizedAreaM2: 0.4,
          utilizationPercent: 40,
          unusedAreaM2: 0.6,
          isUsed: true,
        },
      ],
      demandLines: [
        {
          demandLineId: 'line-a',
          usageType: 'A',
          requiredSets: 2,
          requiredPieces: 4,
          allocatedSets: 1,
          allocatedPieces: 2,
          rollCount: 1,
          remainingSets: 1,
          remainingPieces: 2,
          fulfilled: false,
          mustFulfill: false,
          isSplitAcrossRolls: false,
          coveragePercent: 50,
          priority: 1,
          rollIds: ['roll-a'],
          zoneIds: ['zone-a'],
        },
        {
          demandLineId: 'line-b',
          usageType: 'B',
          requiredSets: 2,
          requiredPieces: 4,
          allocatedSets: 2,
          allocatedPieces: 4,
          rollCount: 1,
          remainingSets: 0,
          remainingPieces: 0,
          fulfilled: true,
          mustFulfill: false,
          isSplitAcrossRolls: false,
          coveragePercent: 100,
          priority: 2,
          rollIds: ['roll-b'],
          zoneIds: ['zone-b'],
        },
      ],
      zones: [],
    },
    geometryLayoutSummary: {
      canvasWidthMm: 200,
      canvasHeightMm: 120,
      zones: [],
    },
    lossBreakdown: {
      unusedRollAreaM2: 0,
      unfulfilledAreaM2: 0,
      trimLossAreaM2: 0,
      message: '--',
    },
    comparisonSummary: {
      fulfilledDemandCount: 1,
      mustFulfillSatisfied: true,
      splitDemandCount: 0,
      usedRollCount: 2,
      usedRollPercent: 100,
      unusedRollAreaM2: 0.001,
      unfulfilledAreaM2: 0,
      trimLossAreaM2: 0,
    },
    scoreBreakdown: {
      objectivePreset: 'yield-first',
      appliedWeights: {
        fulfilledWeight: 35,
        utilizationWeight: 55,
        stabilityWeight: 10,
        assignmentPenaltyWeight: 4,
        unfulfilledPenaltyWeight: 12,
        splitPenaltyWeight: 6,
        mustPenaltyWeight: 45,
      },
      fulfilledRatePercent: 50,
      fulfilledContribution: 17.5,
      utilizationContribution: 55,
      stabilityContribution: 10,
      assignmentPenalty: 0,
      unfulfilledPenalty: 12,
      splitPenalty: 0,
      mustFulfillPenalty: 0,
      groupSplitCount: 1,
      sequenceViolationCount: 0,
      adjacencyBreakCount: 2,
      directionSwitchCount: 1,
      mixViolationCount: 0,
      rollSwitchCount: 1,
      geometryReuseHitCount: 2,
      reusableResidualAreaM2: 0.001,
      finalScore: 98.2,
    },
    mustFulfillDiagnostics: [],
    diffSummary: {
      baselinePlanRank: 1,
      baselineStrategyKey: 'phase7-geometry-priority-first',
      mode: 'baseline',
      addedZoneIds: [],
      removedZoneIds: [],
      changedDemandLineIds: ['line-a'],
      changedRollIds: ['roll-a'],
      highlightZoneIds: ['zone-a'],
    },
    diffSummaries: [],
    searchConfig: {
      presetKey: 'yield-first',
      beamWidth: 8,
      maxSearchDepth: 6,
      perDemandBranchingLimit: 3,
      residualReuseBias: 2,
      convergenceAreaBucketM2: 0.001,
    },
    candidateBudgetSummary: {
      perStrategyQuota: 2,
      globalBudget: 4,
      mergedCandidateCount: 2,
      strategyStats: [],
      dynamicStrategyStats: [],
    },
    budgetRerankReason: '',
    explainabilitySummary: {
      groupSegments: [],
      sequenceSegments: [],
      adjacencySegments: [],
      primaryBreakReasons: [],
      heatZoneAttributions: [],
      breakSlices: [],
      zoneClusters: [],
    },
    reportSummary: {
      planRank: 1,
      strategyKey: 'phase7-geometry-priority-first',
      objectivePreset: 'yield-first',
      appliedWeights: {
        fulfilledWeight: 35,
        utilizationWeight: 55,
        stabilityWeight: 10,
        assignmentPenaltyWeight: 4,
        unfulfilledPenaltyWeight: 12,
        splitPenaltyWeight: 6,
        mustPenaltyWeight: 45,
      },
      baselinePlanRank: 1,
      baselineStrategyKey: 'phase7-geometry-priority-first',
      score: 98.2,
      utilizationPercent: 91.2,
      lossAreaM2: 0.012,
      mustFulfillRiskCount: 0,
      changedDemandLineCount: 1,
      changedRollCount: 1,
      highlightZoneCount: 1,
      adjacencyBreakCount: 2,
      rollSwitchCount: 1,
      geometryReuseHitCount: 2,
      reusableResidualAreaM2: 0.001,
      searchConfig: {
        presetKey: 'yield-first',
        beamWidth: 8,
        maxSearchDepth: 6,
        perDemandBranchingLimit: 3,
        residualReuseBias: 2,
        convergenceAreaBucketM2: 0.001,
      },
      candidateBudgetSummary: {
        perStrategyQuota: 2,
        globalBudget: 4,
        mergedCandidateCount: 2,
        strategyStats: [],
        dynamicStrategyStats: [],
      },
      budgetRerankReason: '',
      explainabilitySummary: {
        groupSegments: [],
        sequenceSegments: [],
        adjacencySegments: [],
        primaryBreakReasons: [],
        heatZoneAttributions: [],
        breakSlices: [],
        zoneClusters: [],
      },
      comparisonSummary: {
        fulfilledDemandCount: 1,
        mustFulfillSatisfied: true,
        splitDemandCount: 0,
        usedRollCount: 2,
        usedRollPercent: 100,
        unusedRollAreaM2: 0.001,
        unfulfilledAreaM2: 0,
        trimLossAreaM2: 0,
      },
      scoreBreakdown: {
        objectivePreset: 'yield-first',
        appliedWeights: {
          fulfilledWeight: 35,
          utilizationWeight: 55,
          stabilityWeight: 10,
          assignmentPenaltyWeight: 4,
          unfulfilledPenaltyWeight: 12,
          splitPenaltyWeight: 6,
          mustPenaltyWeight: 45,
        },
        fulfilledRatePercent: 50,
        fulfilledContribution: 17.5,
        utilizationContribution: 55,
        stabilityContribution: 10,
        assignmentPenalty: 0,
        unfulfilledPenalty: 12,
        splitPenalty: 0,
        mustFulfillPenalty: 0,
        groupSplitCount: 1,
        sequenceViolationCount: 0,
        adjacencyBreakCount: 2,
        directionSwitchCount: 1,
        mixViolationCount: 0,
        rollSwitchCount: 1,
        geometryReuseHitCount: 2,
        reusableResidualAreaM2: 0.001,
        finalScore: 98.2,
      },
    },
  }
}

describe('useBatchEngineDemandSelection', () => {
  it('separates explicit selection from effective fallback after filters change', () => {
    const plan = buildPlan()
    const { result } = renderHook(() => useBatchEngineDemandSelection({ selectedPlan: plan, activeDiffSummary: plan.diffSummary }))

    act(() => {
      result.current.selectDemandLine('line-b')
    })

    expect(result.current.selectedDemandLineId).toBe('line-b')
    expect(result.current.selectedDemand?.demandLineId).toBe('line-b')

    act(() => {
      result.current.setFilterMode('unfulfilled')
    })

    expect(result.current.explicitSelectedDemandLineId).toBe('line-b')
    expect(result.current.explicitSelectedDemand?.demandLineId).toBe('line-b')
    expect(result.current.effectiveSelectedDemandLineId).toBe('line-a')
    expect(result.current.selectedDemandLineId).toBe('line-a')
    expect(result.current.selectedDemand?.demandLineId).toBe('line-a')
    expect(result.current.relatedRollIds).toEqual(['roll-a'])
  })
})
