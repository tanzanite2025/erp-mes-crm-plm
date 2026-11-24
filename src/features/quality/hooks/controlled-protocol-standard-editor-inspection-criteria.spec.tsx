// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ControlledProtocolInspectionCriteriaEditor } from '../components/controlled-protocol-inspection-criteria-editor'
import { StandardEditorContent } from '../components/standard-editor-content'
import type { Standard } from '../data/schema'
import { createControlledProtocolInspectionCriteriaFormValues } from '../services/controlled-protocol-inspection-criteria-editor'
import { buildControlledProtocolStandard } from '../services/controlled-protocol-standard-factory'
import {
  useStandardEditorForm,
  type StandardEditorSubmitPayload,
} from './use-standard-editor-form'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
const configuredUnitResource = vi.hoisted(() => ({
  units: [
    {
      id: 'gram',
      code: 'G',
      name: '克',
      category: 'WEIGHT',
      status: 'active',
      precision: 2,
      isSystem: true,
    },
    {
      id: 'kilogram',
      code: 'KG',
      name: '千克',
      category: 'WEIGHT',
      status: 'active',
      precision: 2,
      isSystem: true,
    },
    {
      id: 'inactive-unit',
      code: 'INACTIVE',
      name: '停用单位',
      category: 'OTHER',
      status: 'inactive',
      precision: 2,
      isSystem: false,
    },
  ],
  isLoading: false,
  error: null as Error | null,
  refetch: vi.fn(),
}))
vi.mock('@/features/basic-settings/hooks/use-units-query', () => ({
  useUnitsQuery: () => configuredUnitResource,
}))
const configuredInspectionStageResource = vi.hoisted(() => ({
  data: [
    { id: 'forming-inspection-station', name: '成型检验站', active: true },
    { id: 'painting-inspection-station', name: '涂装检验站', active: true },
    { id: 'stage-inactive', name: '已停用检验站', active: false },
  ],
  isLoading: false,
  isError: false,
}))
vi.mock('./use-quality-inspection-stages', () => ({
  useQualityInspectionStages: () => configuredInspectionStageResource,
}))

function createEditableControlledProtocolStandard(): Standard {
  return {
    id: 'editable-protocol',
    ...buildControlledProtocolStandard({
      productId: 'product',
      productName: 'R50',
      criteria: [
        {
          id: 'weight-inspection',
          itemName: '重量检测',
          inspectionStageId: 'forming-inspection-station',
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
              lowerTolerance: 6,
              upperTolerance: 6,
              result: 'PASS',
            },
          ],
        },
      ],
    }),
  } as Standard
}

function ControlledProtocolEditorTestForm({
  standard,
  readOnly = false,
  onSave,
}: {
  standard: Standard
  readOnly?: boolean
  onSave: (payload: StandardEditorSubmitPayload | null) => void
}) {
  const editor = useStandardEditorForm({
    initialStandard: standard,
    resetKey: `${standard.id}-${standard.version}`,
    mode: 'edit',
  })
  return (
    <>
      <StandardEditorContent
        mode='edit'
        formData={editor.formData}
        isDirty={editor.isDirty}
        readOnly={readOnly}
        inspectionCriteria={editor.inspectionCriteria}
        onInspectionCriteriaChange={editor.updateInspectionCriteria}
        onCodeChange={(value) => editor.updateField('code', value)}
        onNameChange={(value) => editor.updateField('name', value)}
        onRemarksChange={(value) => editor.updateField('remarks', value)}
      />
      <button onClick={() => onSave(editor.buildSubmitPayload())}>
        Save test draft
      </button>
    </>
  )
}

function getInspectionCriterionInput(field: string) {
  if (field.startsWith('grade-')) {
    return document.getElementById(
      `inspection-${field.replace('grade-', 'grade-weight-inspection-')}`
    )!
  }
  return screen.getByLabelText(
    `quality.standards.dialog.controlledProtocol.fields.${field}`
  )
}

describe('controlled protocol inspection criteria in the standard editor', () => {
  it('loads saved deviation rules into the grade table without dirtying the draft', () => {
    const standard = createEditableControlledProtocolStandard()
    const original = structuredClone(standard)
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    expect(
      screen
        .getAllByLabelText('quality.grading.upperTolerance')
        .map((input) => (input as HTMLInputElement).value)
    ).toEqual(['0', '5', '6'])
    expect(
      screen.queryByRole('button', { name: 'quality.grading.configure' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.aLevelTolerance'
      )
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('quality.standards.workspace.editorDirty')
    ).not.toBeInTheDocument()
    fireEvent.change(screen.getAllByLabelText('quality.grading.level')[2], {
      target: { value: '普通' },
    })
    fireEvent.click(screen.getByText('Save test draft'))
    expect(onSave.mock.calls[0][0].data.items[0]).toMatchObject({
      gradingMode: 'DEVIATION_BANDS',
      levels: [
        { level: 'S', lowerTolerance: 0, upperTolerance: 0 },
        { level: 'A', lowerTolerance: 5, upperTolerance: 5 },
        { level: '普通', lowerTolerance: 6, upperTolerance: 6 },
      ],
    })
    expect(standard).toEqual(original)
  })
  it('groups items by stage identity while preserving item order and independent rules', () => {
    const standard = createEditableControlledProtocolStandard()
    const originalItem = standard.items[0]
    standard.items = [
      {
        ...originalItem,
        inspectionStageId: 'forming-inspection-station',
        inspectionStageName: '成型检验站',
      },
      {
        ...originalItem,
        id: 'coated-weight',
        name: '涂装重量',
        order: 2,
        inspectionStageId: 'painting-inspection-station',
        inspectionStageName: '涂装检验站',
      },
      {
        ...originalItem,
        id: 'second-inner-weight',
        name: '内圈复核重量',
        order: 3,
        inspectionStageId: 'forming-inspection-station',
        inspectionStageName: '成型检验站',
      },
    ]
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    const innerStage = screen.getByRole('region', {
      name: 'quality.standards.inspectionStages.stageGroup · 成型检验站',
    })
    expect(
      within(innerStage).getByRole('region', { name: '重量检测' })
    ).toBeInTheDocument()
    expect(
      within(innerStage).getByRole('region', { name: '内圈复核重量' })
    ).toBeInTheDocument()
    expect(
      within(innerStage).queryByRole('region', { name: '涂装重量' })
    ).not.toBeInTheDocument()
    fireEvent.change(
      within(innerStage).getAllByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.targetWeight'
      )[0],
      { target: { value: '460' } }
    )
    fireEvent.click(screen.getByText('Save test draft'))
    const payload = onSave.mock.calls[0][0] as StandardEditorSubmitPayload
    expect(payload.data.items.map((item) => item.id)).toEqual(
      standard.items.map((item) => item.id)
    )
    expect(payload.data.items[0]).toMatchObject({
      centerValue: 460,
      inspectionStageName: '成型检验站',
    })
    expect(payload.data.items[1]).toEqual(standard.items[1])
    expect(payload.data.items[2]).toEqual(standard.items[2])
  })

  it('adds a weight item within its stage using the current catalog identity without changing existing rules', () => {
    const standard = createEditableControlledProtocolStandard()
    Object.assign(standard.items[0], {
      inspectionStageId: 'forming-inspection-station',
      inspectionStageName: '成型检验站',
    })
    const criteria = createControlledProtocolInspectionCriteriaFormValues(
      standard.items
    )
    const onCriteriaChange = vi.fn()
    render(
      <ControlledProtocolInspectionCriteriaEditor
        criteria={criteria}
        readOnly={false}
        onCriteriaChange={onCriteriaChange}
      />
    )
    const innerStage = screen.getByRole('region', {
      name: 'quality.standards.inspectionStages.stageGroup · 成型检验站',
    })
    fireEvent.click(
      within(innerStage).getByRole('button', {
        name: 'quality.standards.inspectionStages.addWeightItem',
      })
    )
    const nextCriteria = onCriteriaChange.mock.calls[0][0]
    expect(nextCriteria).toHaveLength(2)
    expect(nextCriteria[0]).toEqual(criteria[0])
    expect(nextCriteria[1]).toMatchObject({
      inspectionStageId: 'forming-inspection-station',
      inspectionStageName: '成型检验站',
      gradingMode: 'DEVIATION_BANDS',
      grades: [{ level: 'S' }, { level: 'A' }, { level: 'B' }],
    })
    expect(nextCriteria[1].id).not.toBe(criteria[0].id)
  })

  it('disables adding items to an inactive stage', () => {
    const standard = createEditableControlledProtocolStandard()
    Object.assign(standard.items[0], {
      inspectionStageId: 'stage-inactive',
      inspectionStageName: '停用检验站',
    })
    const onCriteriaChange = vi.fn()
    render(
      <ControlledProtocolInspectionCriteriaEditor
        criteria={createControlledProtocolInspectionCriteriaFormValues(
          standard.items
        )}
        readOnly={false}
        onCriteriaChange={onCriteriaChange}
      />
    )
    const inactiveStage = screen.getByRole('region', {
      name: 'quality.standards.inspectionStages.stageGroup · 停用检验站',
    })
    expect(within(inactiveStage).getByDisplayValue(450)).toBeInTheDocument()
    const addWeightItem = within(inactiveStage).getByRole('button', {
      name: 'quality.standards.inspectionStages.addWeightItem',
    })
    expect(addWeightItem).toBeDisabled()
    fireEvent.click(addWeightItem)
    expect(onCriteriaChange).not.toHaveBeenCalled()
  })

  it('keeps grades owned by each inspection item when items share a stage or change stages', () => {
    const standard = createEditableControlledProtocolStandard()
    standard.items = [
      {
        ...standard.items[0],
        inspectionStageId: 'forming-inspection-station',
        inspectionStageName: '成型检验站',
        gradingMode: 'DEVIATION_BANDS',
        levels: [
          { level: '优', lowerTolerance: 1, upperTolerance: 2, result: 'PASS' },
          {
            level: '合格',
            lowerTolerance: 5,
            upperTolerance: 6,
            result: 'PASS',
          },
        ],
      },
      {
        ...standard.items[0],
        id: 'second-inspection-item',
        name: '第二检测项目',
        inspectionStageId: 'forming-inspection-station',
        inspectionStageName: '成型检验站',
        centerValue: 100,
        gradingMode: 'DEVIATION_BANDS',
        levels: [
          {
            level: '特等',
            lowerTolerance: 0,
            upperTolerance: 0,
            result: 'PASS',
          },
          {
            level: '普通',
            lowerTolerance: 3,
            upperTolerance: 4,
            result: 'PASS',
          },
        ],
      },
    ]
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    const weightInspectionItem = screen.getByRole('region', {
      name: '重量检测',
    })
    const secondInspectionItem = screen.getByRole('region', {
      name: '第二检测项目',
    })
    fireEvent.change(
      within(weightInspectionItem).getAllByLabelText(
        'quality.grading.upperTolerance'
      )[0],
      { target: { value: '3' } }
    )
    fireEvent.change(
      within(weightInspectionItem).getByRole('combobox', {
        name: 'quality.standards.inspectionStages.stage',
      }),
      { target: { value: 'painting-inspection-station' } }
    )
    expect(
      within(secondInspectionItem).getAllByLabelText(
        'quality.grading.upperTolerance'
      )[0]
    ).toHaveValue(0)
    fireEvent.click(screen.getByText('Save test draft'))
    const payload = onSave.mock.calls[0][0] as StandardEditorSubmitPayload
    expect(payload.data.items[0]).toMatchObject({
      inspectionStageId: 'painting-inspection-station',
      levels: [
        { level: '优', lowerTolerance: 1, upperTolerance: 3, result: 'PASS' },
        { level: '合格', lowerTolerance: 5, upperTolerance: 6, result: 'PASS' },
      ],
    })
    expect(payload.data.items[1]).toMatchObject({
      inspectionStageId: 'forming-inspection-station',
      centerValue: 100,
      levels: standard.items[1].levels,
    })
    expect(standard.items[0].levels[0].upperTolerance).toBe(2)
  })

  it('saves and reloads the selected stage identity and name without changing the weight rules', () => {
    const standard = createEditableControlledProtocolStandard()
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'quality.standards.inspectionStages.stage',
      }),
      { target: { value: 'painting-inspection-station' } }
    )
    fireEvent.click(screen.getByText('Save test draft'))
    const payload = onSave.mock.calls[0][0] as StandardEditorSubmitPayload
    expect(payload.data.items[0]).toMatchObject({
      inspectionStageId: 'painting-inspection-station',
      inspectionStageName: '涂装检验站',
      name: standard.items[0].name,
      centerValue: 450,
    })
    expect(payload.data.items[0].levels).toEqual(standard.items[0].levels)
    cleanup()
    render(
      <ControlledProtocolEditorTestForm
        standard={{ ...payload.data, version: 1.1 }}
        onSave={vi.fn()}
      />
    )
    expect(
      screen.getByRole('combobox', {
        name: 'quality.standards.inspectionStages.stage',
      })
    ).toHaveValue('painting-inspection-station')
  })

  it('rejects missing stage references on save and approval submission', () => {
    const standard = createEditableControlledProtocolStandard()
    const { result } = renderHook(() =>
      useStandardEditorForm({
        initialStandard: standard,
        resetKey: standard.id,
        mode: 'edit',
      })
    )
    act(() =>
      result.current.updateInspectionCriteria([
        {
          ...result.current.inspectionCriteria![0],
          inspectionStageId: '',
          inspectionStageName: '',
        },
      ])
    )
    expect(result.current.buildSubmitPayload()).toBeNull()
    expect(
      result.current.buildSubmitPayloadWithOverrides({
        status: 'PENDING_APPROVAL',
      })
    ).toBeNull()
    expect(toast.error).toHaveBeenCalledWith(
      'quality.standards.dialog.controlledProtocol.validation.inspectionStageRequired'
    )
  })

  it('prevents choosing inactive stages and disables stage selection in controlled read-only standards', () => {
    render(
      <ControlledProtocolEditorTestForm
        standard={createEditableControlledProtocolStandard()}
        readOnly
        onSave={vi.fn()}
      />
    )
    expect(
      screen.getByRole('combobox', {
        name: 'quality.standards.inspectionStages.stage',
      })
    ).toBeDisabled()
    for (const inactiveStageOption of screen.getAllByRole('option', {
      name: /已停用检验站/,
    })) {
      expect(inactiveStageOption).toBeDisabled()
    }
  })

  afterEach(() => {
    cleanup()
    configuredUnitResource.isLoading = false
    configuredUnitResource.error = null
    configuredInspectionStageResource.data = [
      { id: 'forming-inspection-station', name: '成型检验站', active: true },
      { id: 'painting-inspection-station', name: '涂装检验站', active: true },
      { id: 'stage-inactive', name: '已停用检验站', active: false },
    ]
    configuredInspectionStageResource.isLoading = false
    configuredInspectionStageResource.isError = false
  })

  it('requires explicit re-selection of a renamed stage and saves its current name without changing weight rules', () => {
    const standard = createEditableControlledProtocolStandard()
    configuredInspectionStageResource.data[0].name = '成型复检站'
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    const stageSelect = screen.getByRole('combobox', {
      name: 'quality.standards.inspectionStages.stage',
    })
    expect(stageSelect).toHaveValue('')
    fireEvent.change(stageSelect, {
      target: { value: 'forming-inspection-station' },
    })
    fireEvent.click(screen.getByText('Save test draft'))
    const saved = (onSave.mock.calls[0][0] as StandardEditorSubmitPayload).data
      .items[0]
    expect(saved.inspectionStageName).toBe('成型复检站')
    expect(saved.centerValue).toBe(standard.items[0].centerValue)
    expect(saved.levels).toEqual(standard.items[0].levels)
  })

  it.each(['loading', 'failed'] as const)(
    'shows the selected stage while its catalog is %s',
    (state) => {
      configuredInspectionStageResource.data = []
      configuredInspectionStageResource.isLoading = state === 'loading'
      configuredInspectionStageResource.isError = state === 'failed'
      render(
        <ControlledProtocolEditorTestForm
          standard={createEditableControlledProtocolStandard()}
          onSave={vi.fn()}
        />
      )
      const stageSelect = screen.getByRole('combobox', {
        name: 'quality.standards.inspectionStages.stage',
      })
      expect(stageSelect).toBeDisabled()
      expect(stageSelect).toHaveValue('forming-inspection-station')
      expect(stageSelect).toHaveTextContent('成型检验站')
    }
  )

  it('fills existing weights and saves edited rules as a top-level items delta', () => {
    const standard = createEditableControlledProtocolStandard()
    standard.items[0].order = 7
    standard.items[0].isRequired = false
    standard.items[0].remarks = '保留本项目的检测说明'
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    expect(getInspectionCriterionInput('targetWeight')).toHaveValue(450)
    expect(getInspectionCriterionInput('grade-1-lowerTolerance')).toHaveValue(5)
    expect(getInspectionCriterionInput('grade-2-upperTolerance')).toHaveValue(6)
    fireEvent.change(getInspectionCriterionInput('targetWeight'), {
      target: { value: '460' },
    })
    fireEvent.change(getInspectionCriterionInput('grade-2-lowerTolerance'), {
      target: { value: '10' },
    })
    fireEvent.change(getInspectionCriterionInput('grade-2-upperTolerance'), {
      target: { value: '10' },
    })
    fireEvent.change(getInspectionCriterionInput('itemName'), {
      target: { value: ' 成品重量 ' },
    })
    fireEvent.click(screen.getByText('Save test draft'))
    const payload = onSave.mock.calls[0][0] as StandardEditorSubmitPayload
    expect(payload.isPatch).toBe(true)
    expect(Object.keys(payload.delta ?? {})).toEqual(['items'])
    expect(payload.delta?.items.o).toEqual(standard.items)
    expect(payload.delta?.items.n).toEqual(payload.data.items)
    expect(payload.data.items[0]).toMatchObject({
      id: 'weight-inspection',
      name: '成品重量',
      order: 7,
      centerValue: 460,
      isRequired: false,
      remarks: '保留本项目的检测说明',
      unit: 'G',
      levels: [
        { level: 'S', lowerTolerance: 0, upperTolerance: 0, result: 'PASS' },
        {
          level: 'A',
          lowerTolerance: 5,
          upperTolerance: 5,
          result: 'PASS',
        },
        {
          level: 'B',
          lowerTolerance: 10,
          upperTolerance: 10,
          result: 'PASS',
        },
      ],
    })
    expect(standard.items[0].centerValue).toBe(450)
  })

  it('preserves surviving item metadata when removing an item and appending a weight item in another stage', () => {
    const standard = createEditableControlledProtocolStandard()
    const originalWeightItem = standard.items[0]
    standard.items = [
      { ...originalWeightItem, order: 10 },
      {
        ...structuredClone(originalWeightItem),
        id: 'weight-recheck',
        name: '重量复核',
        order: 30,
        isRequired: false,
        remarks: '只保留本项目说明',
      },
    ]
    const { result } = renderHook(() =>
      useStandardEditorForm({
        initialStandard: standard,
        resetKey: standard.id,
        mode: 'edit',
      })
    )
    const original = structuredClone(standard)
    const criteria = result.current.inspectionCriteria!
    act(() =>
      result.current.updateInspectionCriteria([
        criteria[1],
        {
          ...criteria[0],
          id: 'new-coated-weight',
          itemName: '涂装重量',
          inspectionStageId: 'painting-inspection-station',
          inspectionStageName: '涂装检验站',
          targetWeight: '470',
        },
      ])
    )
    const payload = result.current.buildSubmitPayload()!
    expect(payload.data.items[0]).toEqual(original.items[1])
    expect(payload.data.items[1]).toMatchObject({
      id: 'new-coated-weight',
      order: 31,
      centerValue: 470,
      inspectionStageId: 'painting-inspection-station',
      isRequired: true,
      remarks: '超出全部等级范围为不合格，处置另行记录。',
    })
    expect(standard).toEqual(original)
  })

  it.each([
    ['targetWeight', '', 'weightRequired'],
    ['itemName', ' ', 'itemNameRequired'],
    ['grade-1-lowerTolerance', '', 'deviationLimitsInvalid'],
    ['grade-1-lowerTolerance', '-1', 'deviationLimitsInvalid'],
    ['grade-1-lowerTolerance', '0', 'deviationLimitsInvalid'],
    ['grade-2-upperTolerance', '5', 'deviationLimitsInvalid'],
    ['grade-2-upperTolerance', '4', 'deviationLimitsInvalid'],
  ])('rejects invalid %s = %s before saving', (field, value, error) => {
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm
        standard={createEditableControlledProtocolStandard()}
        onSave={onSave}
      />
    )
    fireEvent.change(getInspectionCriterionInput(field), { target: { value } })
    fireEvent.click(screen.getByText('Save test draft'))
    expect(onSave).toHaveBeenCalledWith(null)
    expect(toast.error).toHaveBeenCalledWith(
      `quality.standards.dialog.controlledProtocol.validation.${error}`
    )
  })

  it('supports adding and removing inspection items and requires one item', () => {
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm
        standard={createEditableControlledProtocolStandard()}
        onSave={onSave}
      />
    )
    const addWeightItemButton = screen.getAllByRole('button', {
      name: 'quality.standards.inspectionStages.addWeightItem',
    })[0]
    expect(addWeightItemButton).toBeDisabled()
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'quality.standards.inspectionStages.newItemStage',
      }),
      { target: { value: 'forming-inspection-station' } }
    )
    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'quality.standards.inspectionStages.addWeightItem',
      })[0]
    )
    expect(
      screen.getAllByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.itemName'
      )
    ).toHaveLength(2)
    screen
      .getAllByRole('button', {
        name: 'quality.standards.dialog.controlledProtocol.actions.removeCriterion',
      })
      .forEach((button) => fireEvent.click(button))
    fireEvent.click(screen.getByText('Save test draft'))
    expect(onSave).toHaveBeenCalledWith(null)
    expect(toast.error).toHaveBeenCalledWith(
      'quality.standards.dialog.controlledProtocol.validation.criterionRequired'
    )
  })

  it('disables inspection inputs, add/remove actions and the standard name in read-only mode', () => {
    render(
      <ControlledProtocolEditorTestForm
        standard={createEditableControlledProtocolStandard()}
        readOnly
        onSave={vi.fn()}
      />
    )
    for (const field of [
      'itemName',
      'targetWeight',
      'unit',
      'grade-1-lowerTolerance',
      'grade-2-upperTolerance',
    ]) {
      expect(getInspectionCriterionInput(field)).toBeDisabled()
    }
    expect(
      screen.getAllByRole('button', {
        name: 'quality.standards.inspectionStages.addWeightItem',
      })[0]
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'quality.standards.dialog.controlledProtocol.actions.removeCriterion',
      })
    ).toBeDisabled()
    expect(
      screen.getByPlaceholderText(
        'quality.standards.dialog.action.placeholders.name'
      )
    ).toBeDisabled()
  })

  it('validates rules when submitting for approval and resets to the saved version', () => {
    const standard = createEditableControlledProtocolStandard()
    const { result, rerender } = renderHook(
      ({ currentStandard }) =>
        useStandardEditorForm({
          initialStandard: currentStandard,
          resetKey: `${currentStandard.id}-${currentStandard.version}`,
          mode: 'edit',
        }),
      { initialProps: { currentStandard: standard } }
    )
    act(() =>
      result.current.updateInspectionCriteria([
        { ...result.current.inspectionCriteria![0], targetWeight: '' },
      ])
    )
    expect(result.current.isDirty).toBe(true)
    expect(
      result.current.buildSubmitPayloadWithOverrides({
        status: 'PENDING_APPROVAL',
      })
    ).toBeNull()
    act(() =>
      result.current.updateInspectionCriteria([
        { ...result.current.inspectionCriteria![0], targetWeight: '470' },
      ])
    )
    const payload = result.current.buildSubmitPayloadWithOverrides({
      status: 'PENDING_APPROVAL',
    })!
    expect(payload.delta?.status.n).toBe('PENDING_APPROVAL')
    expect(payload.data.items[0].centerValue).toBe(470)
    rerender({ currentStandard: { ...payload.data, version: 1.1 } })
    expect(result.current.inspectionCriteria![0].targetWeight).toBe('470')
    expect(result.current.isDirty).toBe(false)
  })

  it('edits supported numeric rules regardless of the standard code prefix', () => {
    const standard = {
      ...createEditableControlledProtocolStandard(),
      code: 'STD-OTHER',
    }
    const { result } = renderHook(() =>
      useStandardEditorForm({
        initialStandard: standard,
        resetKey: standard.id,
        mode: 'edit',
      })
    )
    expect(result.current.inspectionCriteria).not.toBeNull()
    act(() => result.current.updateField('name', 'Updated standard'))
    const payload = result.current.buildSubmitPayload()!
    expect(payload.delta?.items).toBeUndefined()
    expect(payload.data.items).toEqual(standard.items)
  })

  it.each(['', 'g', 'UNCONFIGURED', 'INACTIVE'])(
    'rejects a missing or unconfigured unit %s on save and approval submission',
    (unit) => {
      const standard = createEditableControlledProtocolStandard()
      const { result } = renderHook(() =>
        useStandardEditorForm({
          initialStandard: standard,
          resetKey: standard.id,
          mode: 'edit',
        })
      )
      act(() =>
        result.current.updateInspectionCriteria([
          { ...result.current.inspectionCriteria![0], unit },
        ])
      )
      expect(result.current.buildSubmitPayload()).toBeNull()
      expect(
        result.current.buildSubmitPayloadWithOverrides({
          status: 'PENDING_APPROVAL',
        })
      ).toBeNull()
      expect(toast.error).toHaveBeenCalledWith(
        'quality.standards.dialog.controlledProtocol.validation.unitRequired'
      )
    }
  )

  it.each(['loading', 'failed'] as const)(
    'blocks saving while units are %s',
    (state) => {
      configuredUnitResource.isLoading = state === 'loading'
      configuredUnitResource.error =
        state === 'failed' ? new Error('Units unavailable') : null
      const standard = createEditableControlledProtocolStandard()
      const { result } = renderHook(() =>
        useStandardEditorForm({
          initialStandard: standard,
          resetKey: standard.id,
          mode: 'edit',
        })
      )
      expect(result.current.buildSubmitPayload()).toBeNull()
      expect(toast.error).toHaveBeenCalledWith(
        `quality.standards.dialog.controlledProtocol.validation.${state === 'loading' ? 'unitsLoading' : 'unitsLoadFailed'}`
      )
    }
  )

  it('renders the system unit name and code in a selector instead of a text input', () => {
    render(
      <ControlledProtocolEditorTestForm
        standard={createEditableControlledProtocolStandard()}
        onSave={vi.fn()}
      />
    )
    expect(
      screen.getByRole('combobox', {
        name: 'quality.standards.dialog.controlledProtocol.fields.unit',
      })
    ).toHaveTextContent('克 (G)')
    expect(
      screen.queryByRole('textbox', {
        name: 'quality.standards.dialog.controlledProtocol.fields.unit',
      })
    ).not.toBeInTheDocument()
  })
})
