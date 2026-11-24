// @vitest-environment jsdom
import type { ReactNode } from 'react'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { Standard } from '../data/schema'
import { buildControlledProtocolStandard } from '../services/controlled-protocol-standard-factory'
import type { ControlledProtocolDraft } from '../types/controlled-protocol'
import { ControlledProtocolDialog } from './controlled-protocol-dialog'
import { StandardPreviewMatrixTable } from './standard-preview-matrix-table'

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }))
vi.mock('@/features/engineering/hooks/use-products', () => ({
  useGetProducts: () => ({
    data: [{ id: 'product-r50', name: 'R50' }],
    isLoading: false,
  }),
}))
vi.mock('@/features/engineering/display/product-display-v2', () => ({
  resolveProductDisplayV2: () => ({ title: 'R50' }),
}))
vi.mock('@/features/engineering/display/product-display-v2-metadata', () => ({
  resolveProductDisplayMetadataV2: () => ({ projection: { title: 'R50' } }),
}))
vi.mock('@/features/basic-settings/hooks/use-units-query', () => ({
  useUnitsQuery: () => ({
    units: [{ code: 'G', status: 'active' }],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('../hooks/use-quality-inspection-stages', () => ({
  useQualityInspectionStages: () => ({
    data: [
      { id: 'inner-stage', name: '成型检验站', active: true },
      { id: 'machining-station', name: '机加检验站', active: true },
      { id: 'fine-inspection-station', name: '精细检验站', active: true },
      { id: 'coated-stage', name: '涂装检验站', active: true },
    ],
    isLoading: false,
    isError: false,
  }),
}))
vi.mock('./controlled-protocol-configured-unit-select', () => ({
  ControlledProtocolConfiguredUnitSelect: ({
    id,
    value,
    disabled,
    onValueChange,
  }: {
    id: string
    value: string
    disabled: boolean
    onValueChange: (value: string) => void
  }) => (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>选择单位</option>
      <option value='G'>克</option>
    </select>
  ),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

afterEach(cleanup)

function renderQualityHierarchyWithChineseLabels(children: ReactNode) {
  return render(
    <LanguageProvider
      defaultLocale='zh-CN'
      storageKey='quality-internal-hierarchy-tests'
    >
      {children}
    </LanguageProvider>
  )
}

function fillNewWeightInspectionItemAndDefaultGradeRanges(
  name: string,
  centerValue: string
) {
  const unnamedItem = screen.getByRole('region', {
    name: '当前检验项目',
  })
  fireEvent.change(within(unnamedItem).getByLabelText('检验项目'), {
    target: { value: name },
  })
  const item = screen.getByRole('region', { name })
  fireEvent.change(within(item).getByLabelText('中心值'), {
    target: { value: centerValue },
  })
  fireEvent.change(within(item).getByLabelText('单位'), {
    target: { value: 'G' },
  })
  for (const [index, tolerance] of [
    [1, '5'],
    [2, '8'],
  ] as const) {
    fireEvent.change(within(item).getAllByLabelText('下偏差允许量')[index], {
      target: { value: tolerance },
    })
    fireEvent.change(within(item).getAllByLabelText('上偏差允许量')[index], {
      target: { value: tolerance },
    })
  }
  return item
}

describe('quality standard internal inspection stage, weight item and grade hierarchy', () => {
  it('creates independent items inside stage groups and displays the saved hierarchy in details', () => {
    const onSubmit = vi.fn()
    renderQualityHierarchyWithChineseLabels(
      <ControlledProtocolDialog
        open
        initialValue={{
          productId: 'product-r50',
          productName: 'R50',
          criteria: [],
        }}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    )
    expect(screen.getByRole('button', { name: '新增重量项目' })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('新增重量项目的检验站'), {
      target: { value: 'inner-stage' },
    })
    fireEvent.click(screen.getByRole('button', { name: '新增重量项目' }))
    const firstItem = fillNewWeightInspectionItemAndDefaultGradeRanges(
      '内圈重量',
      '450'
    )
    fireEvent.change(within(firstItem).getAllByLabelText('等级名称')[0], {
      target: { value: '优等' },
    })
    fireEvent.change(within(firstItem).getAllByLabelText('上偏差允许量')[0], {
      target: { value: '1' },
    })
    const innerStage = screen.getByRole('region', {
      name: '检验站 · 成型检验站',
    })
    fireEvent.click(
      within(innerStage).getByRole('button', {
        name: '新增重量项目',
      })
    )
    fillNewWeightInspectionItemAndDefaultGradeRanges('内圈复核重量', '451')
    fireEvent.change(screen.getByLabelText('新增重量项目的检验站'), {
      target: { value: 'coated-stage' },
    })
    fireEvent.click(screen.getAllByRole('button', { name: '新增重量项目' })[0])
    fillNewWeightInspectionItemAndDefaultGradeRanges('涂装后重量', '470')
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    const savedDraft = onSubmit.mock.calls[0][0] as ControlledProtocolDraft
    expect(savedDraft.productId).toBe('product-r50')
    expect(savedDraft.criteria).toHaveLength(3)
    expect(savedDraft.criteria[0]).toMatchObject({
      inspectionStageId: 'inner-stage',
      inspectionStageName: '成型检验站',
      targetWeight: 450,
      levels: [
        { level: '优等', upperTolerance: 1 },
        { level: 'A' },
        { level: 'B' },
      ],
    })
    expect(savedDraft.criteria[1]).toMatchObject({
      inspectionStageId: 'inner-stage',
      targetWeight: 451,
      levels: [
        { level: 'S', upperTolerance: 0 },
        { level: 'A' },
        { level: 'B' },
      ],
    })
    expect(savedDraft.criteria[2]).toMatchObject({
      inspectionStageId: 'coated-stage',
      targetWeight: 470,
    })
    const standard = {
      id: 'created-standard',
      ...buildControlledProtocolStandard(savedDraft),
    } as Standard
    cleanup()
    renderQualityHierarchyWithChineseLabels(
      <StandardPreviewMatrixTable
        standard={standard}
        primaryActionLabel='编辑'
        onPrimaryAction={vi.fn()}
      />
    )
    const innerDetails = screen.getByRole('rowgroup', {
      name: '检验站 · 成型检验站',
    })
    expect(within(innerDetails).getByText('内圈重量')).toBeInTheDocument()
    expect(within(innerDetails).getByText('内圈复核重量')).toBeInTheDocument()
    expect(within(innerDetails).getByText('优等')).toBeInTheDocument()
    expect(
      within(innerDetails).queryByText('涂装后重量')
    ).not.toBeInTheDocument()
    const coatedDetails = screen.getByRole('rowgroup', {
      name: '检验站 · 涂装检验站',
    })
    expect(within(coatedDetails).getByText('涂装后重量')).toBeInTheDocument()
    expect(within(coatedDetails).queryByText('优等')).not.toBeInTheDocument()
    expect(standard.items.map((item) => item.name)).toEqual([
      '内圈重量',
      '内圈复核重量',
      '涂装后重量',
    ])
  })

  it('edits grades within the selected inspection stage', () => {
    const originalDraft: ControlledProtocolDraft = {
      productId: 'product-r50',
      productName: 'R50',
      criteria: [
        {
          id: 'inner-weight',
          itemName: '内圈重量',
          inspectionStageId: 'inner-stage',
          inspectionStageName: '成型检验站',
          targetWeight: 450,
          unit: 'G',
          gradingMode: 'DEVIATION_BANDS',
          levels: [
            {
              level: 'S',
              lowerTolerance: 0,
              upperTolerance: 0,
              result: 'PASS',
            },
            {
              level: 'A',
              lowerTolerance: 5,
              upperTolerance: 5,
              result: 'PASS',
            },
            {
              level: 'B',
              lowerTolerance: 8,
              upperTolerance: 8,
              result: 'PASS',
            },
          ],
        },
      ],
    }
    const onSubmit = vi.fn()
    renderQualityHierarchyWithChineseLabels(
      <ControlledProtocolDialog
        open
        mode='edit'
        initialValue={originalDraft}
        onOpenChange={vi.fn()}
        onSubmit={onSubmit}
      />
    )
    const innerStage = screen.getByRole('region', {
      name: '检验站 · 成型检验站',
    })
    const gradeRules = within(innerStage).getByRole('region', {
      name: '内圈重量 · 等级规则',
    })
    expect(within(gradeRules).getAllByLabelText('下偏差允许量')[1]).toHaveValue(
      5
    )
    expect(within(gradeRules).getAllByLabelText('上偏差允许量')[2]).toHaveValue(
      8
    )
    expect(
      within(gradeRules).queryByLabelText('A 级允许偏差（±）')
    ).not.toBeInTheDocument()
    fireEvent.change(within(gradeRules).getAllByLabelText('上偏差允许量')[2], {
      target: { value: '9' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认' }))
    expect(onSubmit.mock.calls[0][0].criteria[0].levels[2]).toEqual({
      level: 'B',
      lowerTolerance: 8,
      upperTolerance: 9,
      result: 'PASS',
    })
    expect(onSubmit.mock.calls[0][0].criteria[0]).not.toHaveProperty(
      'bLevelTolerance'
    )
    expect(originalDraft.criteria[0].levels[2].upperTolerance).toBe(8)
  })

  it.each([
    [450.123456, 0.000001, 0.000002, '450.123456', '450.123455', '450.123458'],
    [0.1, 0.3, 0.2, '0.1', '-0.2', '0.3'],
    [0.2, 0.2, 0.1, '0.2', '0', '0.3'],
    [1e-7, 1e-8, 2e-7, '1e-7', '0.00000009', '0.0000003'],
    [
      1e21,
      1e20,
      2e20,
      '1e+21',
      '900000000000000000000',
      '1200000000000000000000',
    ],
  ] as const)(
    'displays center %s and its exact decimal grade bounds without rounding away the configured precision',
    (
      centerValue,
      lowerTolerance,
      upperTolerance,
      expectedCenter,
      expectedLower,
      expectedUpper
    ) => {
      const standard = {
        id: 'precise-weight-standard',
        ...buildControlledProtocolStandard({
          productId: 'product-r50',
          productName: 'R50',
          criteria: [
            {
              id: 'precise-weight-item',
              itemName: '精密重量',
              inspectionStageId: 'inner-stage',
              inspectionStageName: '成型检验站',
              targetWeight: centerValue,
              unit: 'G',
              gradingMode: 'DEVIATION_BANDS',
              levels: [
                {
                  level: '合格',
                  lowerTolerance,
                  upperTolerance,
                  result: 'PASS',
                },
              ],
            },
          ],
        }),
      } as Standard
      renderQualityHierarchyWithChineseLabels(
        <StandardPreviewMatrixTable
          standard={standard}
          primaryActionLabel='编辑'
          onPrimaryAction={vi.fn()}
        />
      )
      const stage = screen.getByRole('rowgroup', {
        name: '检验站 · 成型检验站',
      })
      const cells = within(within(stage).getAllByRole('row')[1]).getAllByRole(
        'cell'
      )
      expect(cells[2].textContent).toBe(expectedCenter)
      expect(cells[5].textContent).toBe(expectedLower)
      expect(cells[6].textContent).toBe(expectedUpper)
    }
  )

  it('groups interleaved items by stage without mutating their stored order', () => {
    const baseItem = {
      id: 'first',
      name: '首项',
      order: 1,
      centerValue: 450,
      unit: 'G',
      isRequired: true,
      gradingMode: 'DEVIATION_BANDS',
      levels: [
        { level: '优', lowerTolerance: 1, upperTolerance: 2, result: 'PASS' },
      ],
      inspectionStageId: 'inner-stage',
      inspectionStageName: '成型检验站',
    }
    const standard = {
      id: 'standard',
      code: 'STD',
      name: '标准',
      version: 1,
      status: 'DRAFT',
      type: 'FQC',
      items: [
        baseItem,
        {
          ...baseItem,
          id: 'coated',
          name: '涂装重量',
          order: 2,
          inspectionStageId: 'coated-stage',
          inspectionStageName: '涂装检验站',
        },
        { ...baseItem, id: 'last', name: '末项', order: 3 },
      ],
    } as Standard
    const original = structuredClone(standard)
    renderQualityHierarchyWithChineseLabels(
      <StandardPreviewMatrixTable
        standard={standard}
        primaryActionLabel='编辑'
        onPrimaryAction={vi.fn()}
      />
    )
    const stage = screen.getByRole('rowgroup', { name: '检验站 · 成型检验站' })
    expect(within(stage).getByText('首项')).toBeInTheDocument()
    expect(within(stage).getByText('末项')).toBeInTheDocument()
    expect(within(stage).queryByText('涂装重量')).not.toBeInTheDocument()
    expect(
      screen.getByRole('rowgroup', { name: '检验站 · 涂装检验站' })
    ).toHaveTextContent('涂装重量')
    expect(standard).toEqual(original)
  })
})
