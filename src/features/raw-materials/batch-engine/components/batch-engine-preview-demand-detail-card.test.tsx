// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { BatchOptimizerPlanLayoutDemandSummary } from '../types'
import { BatchEnginePreviewDemandDetailCard } from './batch-engine-preview-demand-detail-card'

afterEach(() => {
  cleanup()
})

function buildDemandSummary(overrides: Partial<BatchOptimizerPlanLayoutDemandSummary> = {}): BatchOptimizerPlanLayoutDemandSummary {
  return {
    demandLineId: 'demand-a',
    allocatedSets: 3,
    allocatedPieces: 9,
    rollCount: 2,
    remainingSets: 1,
    remainingPieces: 3,
    requiredSets: 4,
    requiredPieces: 12,
    fulfilled: false,
    mustFulfill: true,
    isSplitAcrossRolls: true,
    coveragePercent: 75,
    usageType: 'primary',
    priority: 1,
    rollIds: ['roll-a', 'roll-b'],
    zoneIds: ['zone-a', 'zone-b'],
    ...overrides,
  }
}

describe('BatchEnginePreviewDemandDetailCard', () => {
  it('shows fallback focus messaging when there is no explicit selection', () => {
    render(
      <BatchEnginePreviewDemandDetailCard
        explicitSelectedDemandLineId=''
        explicitSelectedDemand={undefined}
        effectiveSelectedDemandLineId='demand-a'
        effectiveSelectedDemand={buildDemandSummary()}
      />
    )

    expect(screen.getByText('当前未显式选择需求行，下面展示的是筛选结果中的默认焦点。')).not.toBeNull()
    expect(screen.getByText('ID: demand-a')).not.toBeNull()
    expect(screen.queryByText('当前展示的是你显式选择的需求行。')).toBeNull()
  })

  it('shows explicit selection messaging when explicit and effective focus match', () => {
    const demand = buildDemandSummary({ demandLineId: 'demand-explicit', coveragePercent: 88.5 })

    render(
      <BatchEnginePreviewDemandDetailCard
        explicitSelectedDemandLineId='demand-explicit'
        explicitSelectedDemand={demand}
        effectiveSelectedDemandLineId='demand-explicit'
        effectiveSelectedDemand={demand}
      />
    )

    expect(screen.getByText('当前展示的是你显式选择的需求行。')).not.toBeNull()
    expect(screen.getByText('ID: demand-explicit')).not.toBeNull()
    expect(screen.getByText('覆盖率: 88.50%')).not.toBeNull()
    expect(screen.queryByText(/当前未显式选择需求行/)).toBeNull()
    expect(screen.queryByText(/但当前筛选仅命中/)).toBeNull()
  })

  it('shows effective focus messaging when explicit selection no longer matches current filter result', () => {
    render(
      <BatchEnginePreviewDemandDetailCard
        explicitSelectedDemandLineId='demand-explicit'
        explicitSelectedDemand={buildDemandSummary({ demandLineId: 'demand-explicit' })}
        effectiveSelectedDemandLineId='demand-effective'
        effectiveSelectedDemand={buildDemandSummary({
          demandLineId: 'demand-effective',
          allocatedSets: 2,
          remainingSets: 0,
          isSplitAcrossRolls: false,
        })}
      />
    )

    expect(screen.getByText('已显式选择 demand-explicit，但当前筛选仅命中 demand-effective，以下为当前焦点详情。')).not.toBeNull()
    expect(screen.getByText('ID: demand-effective')).not.toBeNull()
    expect(screen.getByText('跨卷分配: 否')).not.toBeNull()
    expect(screen.queryByText('当前展示的是你显式选择的需求行。')).toBeNull()
  })

  it('shows empty state when there is no effective demand to display', () => {
    render(
      <BatchEnginePreviewDemandDetailCard
        explicitSelectedDemandLineId=''
        explicitSelectedDemand={undefined}
        effectiveSelectedDemandLineId=''
        effectiveSelectedDemand={undefined}
      />
    )

    expect(screen.getByText('当前未选中需求行。')).not.toBeNull()
    expect(screen.getByText('可从摘要区选择需求行，或直接点击正式方案画布中的区域。')).not.toBeNull()
    expect(screen.queryByText(/^ID:/)).toBeNull()
  })
})
