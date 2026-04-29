// @vitest-environment jsdom

import { useState, type ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BatchEngineControls, BatchEngineSimulation, BatchOptimizerPlan } from '../types'
import type { BatchEngineExplainabilityTargetKind, BatchEngineExplainabilityTargetSource } from '../services/batch-engine-phase7-visualization'
import { BatchEngineCuttingPreviewDialog } from './batch-engine-cutting-preview-dialog'
import { BatchEngineSummaryPanel } from './batch-engine-summary-panel'
import { resolveBatchEngineControls } from '../services/resolve-batch-engine-controls'

const cuttingCanvasMock = vi.fn()

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, variant }: { children: ReactNode; onClick?: () => void; className?: string; variant?: string }) => (
    <button type='button' data-variant={variant} className={className} onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div data-testid='dialog-root'>{children}</div> : null),
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../services/export-batch-engine-review', () => ({
  exportBatchEngineReviewCsv: vi.fn(),
  exportBatchEngineReviewJson: vi.fn(),
  printBatchEngineReviewPdf: vi.fn(),
}))

vi.mock('./batch-engine-diff-baseline-selector', () => ({
  BatchEngineDiffBaselineSelector: () => <div data-testid='diff-baseline-selector'>diff-baseline-selector</div>,
}))

vi.mock('./batch-engine-score-breakdown-panel', () => ({
  BatchEngineScoreBreakdownPanel: () => <div data-testid='score-breakdown-panel'>score-breakdown-panel</div>,
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

vi.mock('./batch-engine-cutting-canvas', () => ({
  BatchEngineCuttingCanvas: (props: { highlightedZoneIds?: string[] }) => {
    cuttingCanvasMock(props)
    return <div data-testid='cutting-canvas-highlight'>{(props.highlightedZoneIds ?? []).join(',')}</div>
  },
}))

afterEach(() => {
  cleanup()
  cuttingCanvasMock.mockClear()
})

function buildControls(): BatchEngineControls {
  return {
    selectedPrepregSpecId: 'prepreg-1',
    selectedCuttingPlanId: 'cutting-plan-1',
    rollWidthMm: '1000',
    rollLengthM: '10',
    knifeGapMm: '3',
    edgeTrimMm: '5',
    objectivePreset: 'yield-first',
    fulfilledWeight: '35',
    utilizationWeight: '55',
    stabilityWeight: '10',
    assignmentPenaltyWeight: '4',
    unfulfilledPenaltyWeight: '12',
    splitPenaltyWeight: '6',
    mustPenaltyWeight: '45',
  }
}

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
      rolls: [
        {
          rollId: 'roll-1',
          allocatedSets: 2,
          allocatedPieces: 4,
          utilizedAreaM2: 0.8,
          utilizationPercent: 80,
          unusedAreaM2: 0.2,
          isUsed: true,
        },
      ],
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
      ],
      zoneClusters: [
        {
          clusterId: 'cluster-a',
          zoneIds: ['zone-a', 'zone-b', 'zone-c'],
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

function ControlledPreviewDialogHarness() {
  const plan = buildPlan()
  const [open, setOpen] = useState(false)
  const [selectedExplainabilityTargetId, setSelectedExplainabilityTargetId] = useState('')
  const [selectedExplainabilityTargetKind, setSelectedExplainabilityTargetKind] = useState<BatchEngineExplainabilityTargetKind>('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedExplainabilityTargetId('')
      setSelectedExplainabilityTargetKind('')
    }
    setOpen(nextOpen)
  }

  const handleSelectExplainabilityTarget = (
    targetId: string,
    targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''>
  ) => {
    setSelectedExplainabilityTargetId(targetId)
    setSelectedExplainabilityTargetKind(targetKind)
  }

  return (
    <>
      <button
        type='button'
        onClick={() => {
          setSelectedExplainabilityTargetId('slice-1')
          setSelectedExplainabilityTargetKind('break-slice')
          setOpen(true)
        }}
      >
        打开 Break Slice 入口
      </button>
      <button
        type='button'
        onClick={() => {
          setSelectedExplainabilityTargetId('slice-2')
          setSelectedExplainabilityTargetKind('break-slice')
          setOpen(true)
        }}
      >
        打开 Break Slice 快捷入口
      </button>
      <button
        type='button'
        onClick={() => {
          setSelectedExplainabilityTargetId('cluster-a')
          setSelectedExplainabilityTargetKind('zone-cluster')
          setOpen(true)
        }}
      >
        打开 Zone Cluster 入口
      </button>
      <button
        type='button'
        onClick={() => {
          setSelectedExplainabilityTargetId('cluster-b')
          setSelectedExplainabilityTargetKind('zone-cluster')
          setOpen(true)
        }}
      >
        打开 Zone Cluster 快捷入口
      </button>
      <BatchEngineCuttingPreviewDialog
        open={open}
        onOpenChange={handleOpenChange}
        controls={buildControls()}
        normalizedControls={resolveBatchEngineControls(buildControls()).normalizedControls}
        simulation={buildSimulation()}
        selectedPlan={plan}
        plans={[plan]}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        explicitSelectedDemandLineId=''
        explicitSelectedDemand={undefined}
        effectiveSelectedDemandLineId=''
        effectiveSelectedDemand={undefined}
        selectedDemandLineId=''
        relatedRollIds={[]}
        filteredRollIds={[]}
        onSelectBaselinePlan={() => undefined}
        onSelectDemandLine={() => undefined}
        selectedExplainabilityTargetId={selectedExplainabilityTargetId}
        selectedExplainabilityTargetKind={selectedExplainabilityTargetKind}
        onSelectExplainabilityTarget={handleSelectExplainabilityTarget}
      />
    </>
  )
}

function ControlledPreviewSummaryHarness() {
  const plan = buildPlan()
  const [open, setOpen] = useState(false)
  const [selectedExplainabilityTargetId, setSelectedExplainabilityTargetId] = useState('')
  const [selectedExplainabilityTargetKind, setSelectedExplainabilityTargetKind] = useState<BatchEngineExplainabilityTargetKind>('')
  const [selectedExplainabilityTargetSource, setSelectedExplainabilityTargetSource] = useState<BatchEngineExplainabilityTargetSource>('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedExplainabilityTargetId('')
      setSelectedExplainabilityTargetKind('')
      setSelectedExplainabilityTargetSource('')
    }
    setOpen(nextOpen)
  }

  const handleOpenExplainabilityTarget = (
    target: { targetId: string; targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''> }
  ) => {
    setSelectedExplainabilityTargetId(target.targetId)
    setSelectedExplainabilityTargetKind(target.targetKind)
    setSelectedExplainabilityTargetSource('home-entry')
    setOpen(true)
  }

  const handleSelectExplainabilityTarget = (
    targetId: string,
    targetKind: Exclude<BatchEngineExplainabilityTargetKind, ''>
  ) => {
    setSelectedExplainabilityTargetId(targetId)
    setSelectedExplainabilityTargetKind(targetKind)
    setSelectedExplainabilityTargetSource('preview-switch')
  }

  return (
    <>
      <BatchEngineSummaryPanel
        simulation={buildSimulation()}
        solution={{
          requestId: 'req-1',
          summary: {
            solverStatus: 'phase7_seeded_multi_task',
            message: '第七批真几何候选增强流程已执行。',
            planCount: 1,
          },
          plans: [plan],
        }}
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
        onOpenExplainabilityTarget={handleOpenExplainabilityTarget}
        selectedExplainabilityTargetId={selectedExplainabilityTargetId}
        selectedExplainabilityTargetKind={selectedExplainabilityTargetKind}
        selectedExplainabilityTargetSource={selectedExplainabilityTargetSource}
      />
      <BatchEngineCuttingPreviewDialog
        open={open}
        onOpenChange={handleOpenChange}
        controls={buildControls()}
        normalizedControls={resolveBatchEngineControls(buildControls()).normalizedControls}
        simulation={buildSimulation()}
        selectedPlan={plan}
        plans={[plan]}
        baselinePlanRank={1}
        activeDiffSummary={plan.diffSummary}
        explicitSelectedDemandLineId=''
        explicitSelectedDemand={undefined}
        effectiveSelectedDemandLineId=''
        effectiveSelectedDemand={undefined}
        selectedDemandLineId=''
        relatedRollIds={[]}
        filteredRollIds={[]}
        onSelectBaselinePlan={() => undefined}
        onSelectDemandLine={() => undefined}
        selectedExplainabilityTargetId={selectedExplainabilityTargetId}
        selectedExplainabilityTargetKind={selectedExplainabilityTargetKind}
        onSelectExplainabilityTarget={handleSelectExplainabilityTarget}
      />
    </>
  )
}

describe('BatchEngineCuttingPreviewDialog interactions', () => {
  it('initializes highlight from summary entry, supports in-dialog switching, and resets after close then reopen', async () => {
    const user = userEvent.setup()
    render(<ControlledPreviewDialogHarness />)

    await user.click(screen.getByRole('button', { name: '打开 Break Slice 入口' }))
    expect(screen.getByTestId('cutting-canvas-highlight').textContent).toBe('zone-a,zone-b')

    await user.click(screen.getByRole('button', { name: /cluster-a/i }))
    expect(screen.getByTestId('cutting-canvas-highlight').textContent).toBe('zone-a,zone-b,zone-c')

    await user.click(screen.getByRole('button', { name: /rawMaterials\.batchEngine\.canvasPreview\.close/i }))

    await user.click(screen.getByRole('button', { name: '打开 Zone Cluster 入口' }))
    expect(screen.getByTestId('cutting-canvas-highlight').textContent).toBe('zone-a,zone-b,zone-c')

    await user.click(screen.getByRole('button', { name: /rawMaterials\.batchEngine\.canvasPreview\.close/i }))

    await user.click(screen.getByRole('button', { name: '打开 Break Slice 快捷入口' }))
    expect(screen.getByTestId('cutting-canvas-highlight').textContent).toBe('zone-c')

    await user.click(screen.getByRole('button', { name: /rawMaterials\.batchEngine\.canvasPreview\.close/i }))

    await user.click(screen.getByRole('button', { name: '打开 Zone Cluster 快捷入口' }))
    expect(screen.getByTestId('cutting-canvas-highlight').textContent).toBe('zone-c')
  })

  it('syncs summary active state with preview focus and clears it after close', async () => {
    const user = userEvent.setup()
    render(<ControlledPreviewSummaryHarness />)

    await user.click(screen.getByRole('button', { name: 'Break Slice 联动预览' }))
    expect(screen.getByRole('button', { name: 'Break Slice 联动预览' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Break Slice 快捷入口 grp-b' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('来源')).not.toBeNull()
    expect(screen.getByText('首页入口')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /cluster-b.*顺序段波动/i }))
    expect(screen.getByRole('button', { name: 'Break Slice 联动预览' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Zone Cluster 快捷入口 cluster-b' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByText('首页入口')).toBeNull()
    expect(screen.getByText('弹窗切换')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: /rawMaterials\.batchEngine\.canvasPreview\.close/i }))
    expect(screen.getByRole('button', { name: 'Break Slice 联动预览' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Zone Cluster 快捷入口 cluster-b' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.queryByText('首页入口')).toBeNull()
    expect(screen.queryByText('弹窗切换')).toBeNull()
  })
})
