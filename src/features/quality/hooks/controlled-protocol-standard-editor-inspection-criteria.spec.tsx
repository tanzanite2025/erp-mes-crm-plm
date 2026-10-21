// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StandardEditorContent } from '../components/standard-editor-content'
import type { Standard } from '../data/schema'
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
          targetWeight: 450,
          unit: 'G',
          aLevelTolerance: 5,
          bLevelTolerance: 6,
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
        onTypeChange={(value) => editor.updateField('type', value)}
        onRemarksChange={(value) => editor.updateField('remarks', value)}
      />
      <button onClick={() => onSave(editor.buildSubmitPayload())}>
        Save test draft
      </button>
    </>
  )
}

function getInspectionCriterionInput(field: string) {
  return screen.getByLabelText(
    `quality.standards.dialog.controlledProtocol.fields.${field}`
  )
}

describe('controlled protocol inspection criteria in the standard editor', () => {
  afterEach(() => {
    cleanup()
    configuredUnitResource.isLoading = false
    configuredUnitResource.error = null
  })

  it('fills existing weights and saves edited rules as a top-level items delta', () => {
    const standard = createEditableControlledProtocolStandard()
    standard.items[0].isRequired = false
    standard.items[0].formula = 'measuredWeight'
    const onSave = vi.fn()
    render(
      <ControlledProtocolEditorTestForm standard={standard} onSave={onSave} />
    )
    expect(getInspectionCriterionInput('targetWeight')).toHaveValue(450)
    expect(getInspectionCriterionInput('aLevelTolerance')).toHaveValue(5)
    expect(getInspectionCriterionInput('bLevelTolerance')).toHaveValue(6)
    fireEvent.change(getInspectionCriterionInput('targetWeight'), {
      target: { value: '460' },
    })
    fireEvent.change(getInspectionCriterionInput('bLevelTolerance'), {
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
      centerValue: 460,
      formula: 'measuredWeight',
      isRequired: false,
      unit: 'G',
      levels: [
        { level: 'S', min: 460, max: 460 },
        {
          level: 'A',
          min: 455,
          max: 465,
          tolerance: 5,
          deviationMinExclusive: 0,
        },
        {
          level: 'B',
          min: 450,
          max: 470,
          tolerance: 10,
          deviationMinExclusive: 5,
        },
      ],
    })
    expect(payload.data.items[0].remarks).toContain('10G 判定报废')
    expect(standard.items[0].centerValue).toBe(450)
  })

  it.each([
    ['targetWeight', '', 'weightRequired'],
    ['itemName', ' ', 'itemNameRequired'],
    ['aLevelTolerance', '', 'deviationLimitsInvalid'],
    ['aLevelTolerance', '-1', 'deviationLimitsInvalid'],
    ['aLevelTolerance', '0', 'deviationLimitsInvalid'],
    ['bLevelTolerance', '5', 'deviationLimitsInvalid'],
    ['bLevelTolerance', '4', 'deviationLimitsInvalid'],
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
    fireEvent.click(
      screen.getByRole('button', {
        name: 'quality.standards.dialog.controlledProtocol.actions.addCriterion',
      })
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
      'aLevelTolerance',
      'bLevelTolerance',
    ]) {
      expect(getInspectionCriterionInput(field)).toBeDisabled()
    }
    expect(
      screen.getByRole('button', {
        name: 'quality.standards.dialog.controlledProtocol.actions.addCriterion',
      })
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

  it('keeps unrelated standards and their inspection models unchanged', () => {
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
    expect(result.current.inspectionCriteria).toBeNull()
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
