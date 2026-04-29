// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BatchEngineSimulation, BatchOptimizerPlan, BatchOptimizerSolveResponse } from '../types'
import { BatchEngineSummaryPanel } from './batch-engine-summary-panel'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('./batch-engine-demand-review-section', () => ({
  BatchEngineDemandReviewSection: () => <div data-testid='demand-review-section'>demand-review-section</div>,
}))

vi.mock('./batch-engine-diff-review-section', () => ({
  BatchEngineDiffReviewSection: () => <div data-testid='diff-review-section'>diff-review-section</div>,
}))

vi.mock('./batch-engine-must-fulfill-review-section', () => ({
  BatchEngineMustFulfillReviewSection: () => <div data-testid='must-fulfill-review-section'>must-fulfill-review-section</div>,
}))

vi.mock('./batch-engine-solution-overview-section', () => ({
  BatchEngineSolutionOverviewSection: () => <div data-testid='solution-overview-section'>solution-overview-section</div>,
}))

afterEach(() => {
  cleanup()
})

function buildSimulation(): BatchEngineSimulation {
  return {
    ready: true,
    selectedPlanName: 'cutting-plan-a',
    demandLineCount: 3,
    validDemandLineCount: 3,
    invalidDemandLineCount: 0,
    totalRequiredSets: 3,
    totalRequiredPieces: 9,
    totalDemandAreaM2: 1.2,
    totalOccupiedAreaM2: 1.28,
    stripsPerRoll: 2,
    piecesPerStrip: 4,
    executableSets: 3,
    executablePieceCount: 9,
    consumedRawPieces: 9,
    rollAreaM2: 1.5,
    netAreaM2: 1.3,
    lossAreaM2: 0.08,
    utilizationPercent: 85.33,
    leftoverWidthMm: 20,
    leftoverLengthMm: 120,
  }
}

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
      rollCount: 1,
      assignmentCount: 1,
      fulfilledDemandLineCount: 3,
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
      heatZoneAttributions: [],
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
        {
          id: 'slice-2',
          segmentKind: 'group',
          segmentKey: 'grp-b',
          rollId: 'roll-1',
          breakPosition: 2,
          breakBeforeDemandLineId: 'line-c',
          breakAfterDemandLineId: 'line-d',
          zoneIds: ['zone-c'],
          clusterId: 'cluster-b',
          reason: '顺序段波动',
          severityScore: 1.8,
        },
        {
          id: 'slice-3',
          segmentKind: 'adjacency',
          segmentKey: 'grp-c',
          rollId: 'roll-2',
          breakPosition: 3,
          breakBeforeDemandLineId: 'line-e',
          breakAfterDemandLineId: 'line-f',
          zoneIds: ['zone-d'],
          clusterId: 'cluster-c',
          reason: '相邻性破坏',
          severityScore: 1.2,
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
        {
          clusterId: 'cluster-b',
          zoneIds: ['zone-c'],
          rollIds: ['roll-1'],
          demandLineIds: ['line-c'],
          breakSliceIds: ['slice-2'],
          dominantReason: '顺序段波动',
          dominantDemandLineId: 'line-c',
          densityScore: 2.6,
        },
        {
          clusterId: 'cluster-c',
          zoneIds: ['zone-d'],
          rollIds: ['roll-2'],
          demandLineIds: ['line-e'],
          breakSliceIds: ['slice-3'],
          dominantReason: '相邻性破坏',
          dominantDemandLineId: 'line-e',
          densityScore: 1.9,
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
  }
}

describe('BatchEngineSummaryPanel phase7 hero cards', () => {
  it('renders phase7 hero metrics and rerank summaries on summary home panel', () => {
    const plan = buildPlan()
    const onOpenExplainabilityTarget = vi.fn()
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
      <BatchEngineSummaryPanel
        simulation={buildSimulation()}
        solution={solution}
        isSolving={false}
        solveError=''
        selectedPlanRank={1}
        selectedPlan={plan}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
        onSelectBaselinePlan={() => undefined}
        demandSearchQuery=''
        onDemandSearchQueryChange={() => undefined}
        demandFilterMode='all'
        onDemandFilterModeChange={() => undefined}
        rollFilterMode='all-rolls'
        onRollFilterModeChange={() => undefined}
        demandGroupMode='status'
        onDemandGroupModeChange={() => undefined}
        filteredDemandLines={[]}
        groupedDemandLines={[]}
        selectedDemandLineId=''
        selectedDemand={undefined}
        onSelectDemandLine={() => undefined}
        onOpenExplainabilityTarget={onOpenExplainabilityTarget}
        selectedExplainabilityTargetId=''
        selectedExplainabilityTargetKind=''
        selectedExplainabilityTargetSource=''
      />
    )

    expect(screen.getByText('Phase7 首页摘要')).not.toBeNull()
    expect(screen.getByText('Break Slice')).not.toBeNull()
    expect(screen.getAllByText('Zone Cluster').length).toBeGreaterThan(0)
    expect(screen.getByText('动态配额策略')).not.toBeNull()
    expect(screen.getByText('Cluster 密度峰值')).not.toBeNull()
    expect(screen.getByText('Break Summary')).not.toBeNull()
    expect(screen.getByText('Dynamic Budget')).not.toBeNull()
    expect(screen.getByText(/fulfilled=4 \/ broken=1 \/ cluster=1 \/ reuse=2/)).not.toBeNull()
  })

  it('opens preview linkage from break slice and zone cluster hero cards', async () => {
    const user = userEvent.setup()
    const plan = buildPlan()
    const onOpenExplainabilityTarget = vi.fn()
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
      <BatchEngineSummaryPanel
        simulation={buildSimulation()}
        solution={solution}
        isSolving={false}
        solveError=''
        selectedPlanRank={1}
        selectedPlan={plan}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
        onSelectBaselinePlan={() => undefined}
        demandSearchQuery=''
        onDemandSearchQueryChange={() => undefined}
        demandFilterMode='all'
        onDemandFilterModeChange={() => undefined}
        rollFilterMode='all-rolls'
        onRollFilterModeChange={() => undefined}
        demandGroupMode='status'
        onDemandGroupModeChange={() => undefined}
        filteredDemandLines={[]}
        groupedDemandLines={[]}
        selectedDemandLineId=''
        selectedDemand={undefined}
        onSelectDemandLine={() => undefined}
        onOpenExplainabilityTarget={onOpenExplainabilityTarget}
        selectedExplainabilityTargetId=''
        selectedExplainabilityTargetKind=''
        selectedExplainabilityTargetSource=''
      />
    )

    await user.click(screen.getByRole('button', { name: 'Break Slice 联动预览' }))
    expect(onOpenExplainabilityTarget).toHaveBeenNthCalledWith(1, {
      targetId: 'slice-1',
      targetKind: 'break-slice',
    })

    await user.click(screen.getByRole('button', { name: 'Zone Cluster 联动预览' }))
    expect(onOpenExplainabilityTarget).toHaveBeenNthCalledWith(2, {
      targetId: 'cluster-a',
      targetKind: 'zone-cluster',
    })

    await user.click(screen.getByRole('button', { name: 'Break Slice 快捷入口 grp-b' }))
    expect(onOpenExplainabilityTarget).toHaveBeenNthCalledWith(3, {
      targetId: 'slice-2',
      targetKind: 'break-slice',
    })

    await user.click(screen.getByRole('button', { name: 'Zone Cluster 快捷入口 cluster-b' }))
    expect(onOpenExplainabilityTarget).toHaveBeenNthCalledWith(4, {
      targetId: 'cluster-b',
      targetKind: 'zone-cluster',
    })
  })

  it('highlights active hero card and quick action based on current preview focus', () => {
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

    const { rerender } = render(
      <BatchEngineSummaryPanel
        simulation={buildSimulation()}
        solution={solution}
        isSolving={false}
        solveError=''
        selectedPlanRank={1}
        selectedPlan={plan}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
        onSelectBaselinePlan={() => undefined}
        demandSearchQuery=''
        onDemandSearchQueryChange={() => undefined}
        demandFilterMode='all'
        onDemandFilterModeChange={() => undefined}
        rollFilterMode='all-rolls'
        onRollFilterModeChange={() => undefined}
        demandGroupMode='status'
        onDemandGroupModeChange={() => undefined}
        filteredDemandLines={[]}
        groupedDemandLines={[]}
        selectedDemandLineId=''
        selectedDemand={undefined}
        onSelectDemandLine={() => undefined}
        onOpenExplainabilityTarget={() => undefined}
        selectedExplainabilityTargetId='slice-1'
        selectedExplainabilityTargetKind='break-slice'
        selectedExplainabilityTargetSource='home-entry'
      />
    )

    expect(screen.getByRole('button', { name: 'Break Slice 联动预览' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Break Slice 快捷入口 grp-b' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('来源')).not.toBeNull()
    expect(screen.getByText('首页入口')).not.toBeNull()

    rerender(
      <BatchEngineSummaryPanel
        simulation={buildSimulation()}
        solution={solution}
        isSolving={false}
        solveError=''
        selectedPlanRank={1}
        selectedPlan={plan}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
        onSelectBaselinePlan={() => undefined}
        demandSearchQuery=''
        onDemandSearchQueryChange={() => undefined}
        demandFilterMode='all'
        onDemandFilterModeChange={() => undefined}
        rollFilterMode='all-rolls'
        onRollFilterModeChange={() => undefined}
        demandGroupMode='status'
        onDemandGroupModeChange={() => undefined}
        filteredDemandLines={[]}
        groupedDemandLines={[]}
        selectedDemandLineId=''
        selectedDemand={undefined}
        onSelectDemandLine={() => undefined}
        onOpenExplainabilityTarget={() => undefined}
        selectedExplainabilityTargetId='cluster-b'
        selectedExplainabilityTargetKind='zone-cluster'
        selectedExplainabilityTargetSource='preview-switch'
      />
    )

    expect(screen.getByRole('button', { name: 'Zone Cluster 联动预览' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Zone Cluster 快捷入口 cluster-b' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('首页入口')).toBeNull()
    expect(screen.getByText('弹窗切换')).not.toBeNull()

    rerender(
      <BatchEngineSummaryPanel
        simulation={buildSimulation()}
        solution={solution}
        isSolving={false}
        solveError=''
        selectedPlanRank={1}
        selectedPlan={plan}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        onSelectPlan={() => undefined}
        onSelectBaselinePlan={() => undefined}
        demandSearchQuery=''
        onDemandSearchQueryChange={() => undefined}
        demandFilterMode='all'
        onDemandFilterModeChange={() => undefined}
        rollFilterMode='all-rolls'
        onRollFilterModeChange={() => undefined}
        demandGroupMode='status'
        onDemandGroupModeChange={() => undefined}
        filteredDemandLines={[]}
        groupedDemandLines={[]}
        selectedDemandLineId=''
        selectedDemand={undefined}
        onSelectDemandLine={() => undefined}
        onOpenExplainabilityTarget={() => undefined}
        selectedExplainabilityTargetId=''
        selectedExplainabilityTargetKind=''
        selectedExplainabilityTargetSource=''
      />
    )

    expect(screen.getByRole('button', { name: 'Break Slice 联动预览' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Zone Cluster 快捷入口 cluster-b' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByText('首页入口')).toBeNull()
    expect(screen.queryByText('弹窗切换')).toBeNull()
  })
})
