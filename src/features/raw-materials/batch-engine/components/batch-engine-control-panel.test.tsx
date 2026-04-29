// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { CuttingPlan } from '@/features/engineering-db/data/cutting-plan-schema'
import type { PrepregMaterialSpec } from '../../data/prepreg-material-spec-schema'
import type { BatchEngineControls, BatchEngineSimulation } from '../types'
import { BatchEngineControlPanel } from './batch-engine-control-panel'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, readOnly, placeholder, className }: { value?: string; onChange?: (event: { target: { value: string } }) => void; readOnly?: boolean; placeholder?: string; className?: string }) => (
    <input
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      className={className}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
    />
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children, className }: { children: ReactNode; className?: string }) => <div className={className}>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
}))

afterEach(() => {
  cleanup()
})

function buildControls(): BatchEngineControls {
  return {
    selectedPrepregSpecId: 'prepreg-1',
    selectedCuttingPlanId: 'plan-1',
    rollWidthMm: '1000',
    rollLengthM: '12',
    knifeGapMm: '2',
    edgeTrimMm: '0',
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
    selectedPlanName: 'Plan 1',
    demandLineCount: 2,
    validDemandLineCount: 2,
    invalidDemandLineCount: 1,
    totalRequiredSets: 3,
    totalRequiredPieces: 6,
    totalDemandAreaM2: 1.2,
    totalOccupiedAreaM2: 1.3,
    stripsPerRoll: 2,
    piecesPerStrip: 3,
    executableSets: 3,
    executablePieceCount: 6,
    consumedRawPieces: 6,
    rollAreaM2: 12,
    netAreaM2: 10,
    lossAreaM2: 2,
    utilizationPercent: 83.33,
    leftoverWidthMm: 20,
    leftoverLengthMm: 100,
  }
}

function buildCuttingPlan(): CuttingPlan {
  return {
    id: 'plan-1',
    name: 'Plan 1',
    productId: '',
    productCode: 'P-001',
    productName: '',
    holeCount: '',
    documentNo: 'DOC-1',
    revisionNo: 'A1',
    effectiveDate: '',
    carbonFiberModel: '',
    resinModel: '',
    resinContentPercent: '',
    prepregSpecId: 'prepreg-1',
    prepregSpecLabel: '',
    totalInnerMaterialWeightG: '',
    totalMaterialWeightG: '',
    status: 'Active',
    version: 1,
    lines: [],
    createdAt: '',
  }
}

function buildPrepregSpec(): PrepregMaterialSpec {
  return {
    id: 'prepreg-1',
    code: 'PP-1',
    displayAlias: 'alias-1',
    widthMm: '1000',
    lengthM: '12',
    status: 'Active',
  } as PrepregMaterialSpec
}

describe('BatchEngineControlPanel', () => {
  it('renders roll section, plan section, and metrics grid after section extraction', () => {
    render(
      <BatchEngineControlPanel
        metrics={[
          { key: 'roll', label: '卷材', value: '12m x 1000mm', hint: 'hint-roll' },
          { key: 'loss', label: '损耗', value: '2.000 m2', hint: 'hint-loss' },
        ]}
        controls={buildControls()}
        updateControl={() => undefined}
        prepregSpecs={[buildPrepregSpec()]}
        prepregLoading={false}
        selectedPrepregSpec={buildPrepregSpec()}
        cuttingPlans={[buildCuttingPlan()]}
        cuttingPlanLoading={false}
        selectedCuttingPlan={buildCuttingPlan()}
        simulation={buildSimulation()}
      />
    )

    expect(screen.getByText('rawMaterials.batchEngine.sections.control.title')).not.toBeNull()
    expect(screen.getByText('rawMaterials.batchEngine.sections.control.blocks.roll.title')).not.toBeNull()
    expect(screen.getByText('rawMaterials.batchEngine.sections.control.blocks.plan.title')).not.toBeNull()
    expect(screen.getByText('卷材')).not.toBeNull()
    expect(screen.getByText('损耗')).not.toBeNull()
    expect(screen.getByText('hint-roll')).not.toBeNull()
    expect(screen.getByText('hint-loss')).not.toBeNull()
  })
})
