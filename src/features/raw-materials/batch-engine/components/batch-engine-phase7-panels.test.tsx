// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BatchOptimizerPlan, BatchOptimizerSolveResponse } from '../types'
import { BatchEngineDiffReviewSection } from './batch-engine-diff-review-section'
import { BatchEnginePlanComparePanel } from './batch-engine-plan-compare-panel'
import { BatchEngineSolutionOverviewSection } from './batch-engine-solution-overview-section'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.rank) {
        return `${key}-${params.rank}`
      }
      if (params?.count !== undefined) {
        return `${key}-${params.count}`
      }
      if (params?.score) {
        return `${key}-${params.score}`
      }
      return key
    },
  }),
}))

vi.mock('../services/export-batch-engine-review', () => ({
  exportBatchEngineReviewCsv: vi.fn(),
  exportBatchEngineReviewJson: vi.fn(),
  printBatchEngineReviewPdf: vi.fn(),
}))

vi.mock('./batch-engine-score-breakdown-panel', () => ({
  BatchEngineScoreBreakdownPanel: () => <div data-testid='score-breakdown-panel'>score-breakdown-panel</div>,
}))

afterEach(() => {
  cleanup()
})

function buildPlan(overrides: Partial<BatchOptimizerPlan> = {}): BatchOptimizerPlan {
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
      rollCount: 1,
      assignmentCount: 1,
      fulfilledDemandLineCount: 1,
      unfulfilledDemandLineCount: 0,
      rolls: [],
      demandLines: [],
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
      fulfilledDemandCount: 3,
      mustFulfillSatisfied: true,
      splitDemandCount: 1,
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
      fulfilledRatePercent: 100,
      fulfilledContribution: 35,
      utilizationContribution: 55,
      stabilityContribution: 10,
      assignmentPenalty: 0,
      unfulfilledPenalty: 0,
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
      addedZoneIds: ['zone-a'],
      removedZoneIds: ['zone-z'],
      changedDemandLineIds: ['line-a'],
      changedRollIds: ['roll-1'],
      highlightZoneIds: ['zone-a', 'zone-b'],
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
      dynamicStrategyStats: [
        {
          strategyKey: 'phase7-geometry-priority-first',
          inputCount: 3,
          targetQuota: 2,
          keptCount: 2,
          priorityScore: 87.2,
          rerankReason: 'targetQuota=2 / priority=87.20',
        },
      ],
    },
    budgetRerankReason: 'fulfilled=4 / broken=1 / cluster=1 / reuse=2',
    explainabilitySummary: {
      groupSegments: [],
      sequenceSegments: [],
      adjacencySegments: [],
      primaryBreakReasons: ['组连续段被打断'],
      heatZoneAttributions: [
        {
          zoneId: 'zone-a',
          segmentKind: 'group',
          segmentKey: 'grp-a',
          reason: '组连续段被打断',
          rollId: 'roll-1',
          demandLineIds: ['line-a', 'line-b'],
          clusterId: 'cluster-a',
          breakSliceIds: ['slice-1'],
        },
      ],
      breakSlices: [
        {
          id: 'slice-1',
          segmentKind: 'group',
          segmentKey: 'grp-a',
          rollId: 'roll-1',
          breakPosition: 1,
          breakBeforeDemandLineId: 'line-a',
          breakAfterDemandLineId: 'line-b',
          zoneIds: ['zone-a', 'zone-b'],
          clusterId: 'cluster-a',
          reason: '组连续段被打断',
          severityScore: 2.4,
        },
      ],
      zoneClusters: [
        {
          clusterId: 'cluster-a',
          zoneIds: ['zone-a', 'zone-b'],
          rollIds: ['roll-1'],
          demandLineIds: ['line-a', 'line-b'],
          breakSliceIds: ['slice-1'],
          dominantReason: '组连续段被打断',
          dominantDemandLineId: 'line-b',
          densityScore: 3.2,
        },
      ],
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
      highlightZoneCount: 2,
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
        dynamicStrategyStats: [
          {
            strategyKey: 'phase7-geometry-priority-first',
            inputCount: 3,
            targetQuota: 2,
            keptCount: 2,
            priorityScore: 87.2,
            rerankReason: 'targetQuota=2 / priority=87.20',
          },
        ],
      },
      budgetRerankReason: 'fulfilled=4 / broken=1 / cluster=1 / reuse=2',
      explainabilitySummary: {
        groupSegments: [],
        sequenceSegments: [],
        adjacencySegments: [],
        primaryBreakReasons: ['组连续段被打断'],
        heatZoneAttributions: [],
        breakSlices: [],
        zoneClusters: [],
      },
      comparisonSummary: {
        fulfilledDemandCount: 3,
        mustFulfillSatisfied: true,
        splitDemandCount: 1,
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
        fulfilledRatePercent: 100,
        fulfilledContribution: 35,
        utilizationContribution: 55,
        stabilityContribution: 10,
        assignmentPenalty: 0,
        unfulfilledPenalty: 0,
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
    ...overrides,
  }
}

describe('BatchEngine phase7 panels', () => {
  it('renders phase7 compare metrics and dynamic budget summary', () => {
    render(
      <BatchEnginePlanComparePanel
        plans={[buildPlan()]}
        selectedPlanRank={1}
        baselinePlanRank={1}
        onSelectPlan={() => undefined}
      />
    )

    expect(screen.getByText('Break Slice')).not.toBeNull()
    expect(screen.getByText('Zone Cluster')).not.toBeNull()
    expect(screen.getByText('Cluster 密度峰值')).not.toBeNull()
    expect(screen.getByText('Budget Rerank')).not.toBeNull()
    expect(screen.getByText('Dynamic Budget')).not.toBeNull()
    expect(screen.getByText('cluster 1')).not.toBeNull()
    expect(screen.getByText('slice slice-1')).not.toBeNull()
    expect(screen.getByText('quota 2')).not.toBeNull()
  })

  it('renders phase7 diff review cards and detail panels', () => {
    const plan = buildPlan()
    render(
      <BatchEngineDiffReviewSection
        plans={[plan]}
        selectedPlanRank={1}
        baselinePlanRank={1}
        selectedPlan={plan}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
        onSelectBaselinePlan={() => undefined}
      />
    )

    expect(screen.getByText('候选差异摘要')).not.toBeNull()
    expect(screen.getByText('Break Slice / Cluster')).not.toBeNull()
    expect(screen.getByText('动态预算重排')).not.toBeNull()
    expect(screen.getAllByText('budget rerank').length).toBeGreaterThan(0)
    expect(screen.getAllByText('severity 2.40').length).toBeGreaterThan(0)
    expect(screen.getAllByText('priority 87.20').length).toBeGreaterThan(0)
  })

  it('renders phase7 solution overview metrics and rerank diagnostics', () => {
    const plan = buildPlan()
    const solution: BatchOptimizerSolveResponse = {
      requestId: 'req-1',
      summary: {
        solverStatus: 'phase7_seeded_multi_task',
        message: '第七批真几何候选增强流程已执行。',
        planCount: 1,
      },
      plans: [plan],
    }

    render(
      <BatchEngineSolutionOverviewSection
        solution={solution}
        isSolving={false}
        solveError=''
        selectedPlanRank={1}
        selectedPlan={plan}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
      />
    )

    expect(screen.getAllByText('Break Slice').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Zone Cluster').length).toBeGreaterThan(0)
    expect(screen.getByText(/预算重排:/)).not.toBeNull()
    expect(screen.getByText(/Target Quota:/)).not.toBeNull()
    expect(screen.getAllByText('cluster 1').length).toBeGreaterThan(0)
    expect(screen.getByText('budget rerank')).not.toBeNull()
    expect(screen.getAllByText('quota 2').length).toBeGreaterThan(0)
  })
})
