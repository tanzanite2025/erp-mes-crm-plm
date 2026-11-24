// @vitest-environment jsdom
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QualityInspection } from '@/features/production-quality/tabs/quality-inspection'
import type { StandardItem } from '../data/schema'
import { hasValidConfigurableInspectionGradeFormValues } from '../services/configurable-inspection-deviation-grade-rules'
import {
  buildEditedControlledProtocolInspectionStandardItems,
  createControlledProtocolInspectionCriteriaFormValues,
} from '../services/controlled-protocol-inspection-criteria-editor'
import {
  QualityCoreService,
  type QualityTask,
} from '../services/quality-core-service'
import { QualityMaintenanceService } from '../services/quality-maintenance-service'
import { ConfigurableInspectionDeviationGradeEditor } from './configurable-inspection-deviation-grade-editor'
import { QualityInspectionMeasurementSubmissionDialog } from './quality-inspection-measurement-submission-dialog'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@/lib/handle-server-error', () => ({ handleServerError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const configuredWeightInspectionItem: StandardItem = {
  id: 'weight',
  name: '轮圈重量',
  order: 1,
  centerValue: 450,
  unit: 'G',
  inspectionStageId: 'forming-inspection-station',
  inspectionStageName: '成型检验站',
  gradingMode: 'DEVIATION_BANDS',
  isRequired: true,
  levels: [
    { level: '优', lowerTolerance: 1, upperTolerance: 2, result: 'PASS' },
    { level: '隔离', lowerTolerance: 5, upperTolerance: 8, result: 'FAIL' },
  ],
}
const publishedWeightInspectionStandard = {
  id: 'standard',
  code: 'WEIGHT-1',
  name: '重量标准',
  productId: 'product',
  productName: 'R50',
  version: 1.3,
  type: 'FQC' as const,
  status: 'PUBLISHED' as const,
  items: [configuredWeightInspectionItem],
}
const pendingWeightInspectionTask: QualityTask = {
  id: 'task',
  standardId: 'standard',
  productId: 'product',
  batchNo: 'batch',
  result: 'PENDING',
}

beforeEach(() => {
  vi.spyOn(QualityCoreService, 'getStandardById').mockResolvedValue(
    structuredClone(publishedWeightInspectionStandard)
  )
  vi.spyOn(QualityCoreService, 'getStandards').mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    metadata: {},
  } as never)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderMeasurementDialogForTask(task = pendingWeightInspectionTask) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <QualityInspectionMeasurementSubmissionDialog
        task={task}
        onClose={vi.fn()}
      />
    </QueryClientProvider>
  )
}

describe('configurable inspection rules and immutable measurement results', () => {
  it('keeps pending tasks out of quantity settlement and never submits a PASS while recording quantities', async () => {
    vi.spyOn(QualityCoreService, 'getTasks').mockResolvedValue({
      total: 2,
      items: [
        { ...pendingWeightInspectionTask, productionPlanId: 'plan' },
        {
          ...pendingWeightInspectionTask,
          id: 'completed',
          result: 'PASS',
          productionPlanId: 'plan',
        },
      ],
    })
    vi.spyOn(QualityCoreService, 'getInspectionStats').mockResolvedValue({
      pendingCount: 1,
      passCount: 1,
      failCount: 0,
    })
    const submitMeasurements = vi.spyOn(
      QualityMaintenanceService,
      'executeInspection'
    )
    const submitQuantities = vi
      .spyOn(QualityMaintenanceService, 'confirmQuantitySettlement')
      .mockResolvedValue({})
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    render(
      <QueryClientProvider client={client}>
        <QualityInspection />
      </QueryClientProvider>
    )
    const actions = await screen.findAllByRole('button', {
      name: 'quality.inspection.page.recordQuantity',
    })
    expect(actions[0]).toBeDisabled()
    expect(actions[1]).toBeEnabled()
    fireEvent.click(actions[1])
    fireEvent.change(
      screen.getByLabelText(/quality.inspection.page.inputQuantity/),
      { target: { value: '10' } }
    )
    fireEvent.change(
      screen.getByLabelText(/quality.inspection.page.qualifiedQuantity/),
      { target: { value: '10' } }
    )
    fireEvent.change(
      screen.getByLabelText(/quality.inspection.page.quantityUnit/),
      { target: { value: 'PCS' } }
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'quality.inspection.page.confirmQuantity',
      })
    )
    await waitFor(() => expect(submitQuantities).toHaveBeenCalledTimes(1))
    expect(submitMeasurements).not.toHaveBeenCalled()
    expect(submitQuantities.mock.calls[0][0]).toMatchObject({
      inspectionTaskId: 'completed',
      inputQuantity: 10,
      qualifiedQuantity: 10,
    })
  })

  it('preserves custom names, asymmetric limits and optional status across editing', () => {
    const original = { ...configuredWeightInspectionItem, isRequired: false }
    const form = createControlledProtocolInspectionCriteriaFormValues([
      original,
    ])
    form[0].grades![0].upperTolerance = '3'
    const [saved] = buildEditedControlledProtocolInspectionStandardItems(form, [
      original,
    ])
    expect(saved.levels).toEqual([
      { level: '优', lowerTolerance: 1, upperTolerance: 3, result: 'PASS' },
      { level: '隔离', lowerTolerance: 5, upperTolerance: 8, result: 'FAIL' },
    ])
    expect(saved).toMatchObject({
      isRequired: false,
      inspectionStageId: 'forming-inspection-station',
    })
    expect(
      saved.levels.some((grade) => 'min' in grade || 'tolerance' in grade)
    ).toBe(false)
  })

  it('rejects duplicate names, shrinking boundaries and a passing grade after a failing grade', () => {
    const grades = createControlledProtocolInspectionCriteriaFormValues([
      configuredWeightInspectionItem,
    ])[0].grades!
    expect(hasValidConfigurableInspectionGradeFormValues(grades, 450)).toBe(
      true
    )
    for (const invalid of [
      [grades[0], { ...grades[1], level: '优' }],
      [grades[0], { ...grades[1], lowerTolerance: '1' }],
      [
        { ...grades[0], result: 'FAIL' as const },
        { ...grades[1], result: 'PASS' as const },
      ],
    ])
      expect(hasValidConfigurableInspectionGradeFormValues(invalid, 450)).toBe(
        false
      )
  })

  it('adds, edits and removes grades and disables changes in read-only mode', () => {
    function EditableGradeRules() {
      const [criterion, setCriterion] = useState(
        createControlledProtocolInspectionCriteriaFormValues([
          configuredWeightInspectionItem,
        ])[0]
      )
      return (
        <ConfigurableInspectionDeviationGradeEditor
          criterion={criterion}
          disabled={false}
          onChange={setCriterion}
        />
      )
    }
    const editor = render(<EditableGradeRules />)
    fireEvent.click(screen.getByRole('button', { name: 'quality.grading.add' }))
    expect(screen.getAllByLabelText('quality.grading.level')).toHaveLength(3)
    fireEvent.change(screen.getAllByLabelText('quality.grading.level')[2], {
      target: { value: '超差' },
    })
    expect(screen.getByDisplayValue('超差')).toBeInTheDocument()
    fireEvent.click(
      screen.getAllByRole('button', { name: 'quality.grading.remove' })[2]
    )
    expect(screen.queryByDisplayValue('超差')).not.toBeInTheDocument()
    editor.unmount()
    render(
      <ConfigurableInspectionDeviationGradeEditor
        criterion={
          createControlledProtocolInspectionCriteriaFormValues([
            configuredWeightInspectionItem,
          ])[0]
        }
        disabled
        onChange={vi.fn()}
      />
    )
    for (const control of [
      ...screen.getAllByRole('textbox'),
      ...screen.getAllByRole('spinbutton'),
      ...screen.getAllByRole('combobox'),
      ...screen.getAllByRole('button'),
    ])
      expect(control).toBeDisabled()
  })

  it('keeps measurements after a failed save, retries with the same key and displays the server snapshot result', async () => {
    const saved: QualityTask = {
      ...pendingWeightInspectionTask,
      result: 'FAIL',
      standardSnapshot: publishedWeightInspectionStandard,
      evaluationData: [
        {
          itemId: 'weight',
          itemName: '轮圈重量',
          value: 470,
          unit: 'G',
          result: 'FAIL',
        },
      ],
    }
    const submit = vi
      .spyOn(QualityMaintenanceService, 'executeInspection')
      .mockRejectedValueOnce(new Error('Connection lost'))
      .mockResolvedValueOnce(saved)
    renderMeasurementDialogForTask()
    const input = await screen.findByLabelText(
      '轮圈重量 quality.measurement.value'
    )
    fireEvent.change(input, { target: { value: '470' } })
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.measurement.submit' })
    )
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'quality.measurement.submit' })
      ).toBeEnabled()
    )
    expect(input).toHaveValue(470)
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.measurement.submit' })
    )
    await screen.findByText('quality.measurement.disposition')
    expect(submit).toHaveBeenCalledTimes(2)
    expect(submit.mock.calls[0][0]).toEqual(submit.mock.calls[1][0])
    expect(submit.mock.calls[0][0]).toMatchObject({
      standardVersion: 1.3,
      inputData: {
        measurements: [{ itemId: 'weight', value: 470, unit: 'G' }],
      },
    })
    expect(submit.mock.calls[0][0]).not.toHaveProperty('result')
    expect(submit.mock.calls[0][0]).not.toHaveProperty('evaluationData')
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    expect(screen.getByText(/WEIGHT-1 · 重量标准/)).toBeInTheDocument()
  })

  it('blocks missing required measurements and does not fetch current rules for historical records', async () => {
    const submit = vi.spyOn(QualityMaintenanceService, 'executeInspection')
    const dialog = renderMeasurementDialogForTask()
    await screen.findByLabelText('轮圈重量 quality.measurement.value')
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.measurement.submit' })
    )
    expect(submit).not.toHaveBeenCalled()
    dialog.unmount()
    vi.mocked(QualityCoreService.getStandardById).mockClear()
    renderMeasurementDialogForTask({
      ...pendingWeightInspectionTask,
      result: 'PASS',
    })
    expect(
      screen.getByText('quality.measurement.noSnapshot')
    ).toBeInTheDocument()
    expect(QualityCoreService.getStandardById).not.toHaveBeenCalled()
    expect(
      screen.queryByRole('button', { name: 'quality.measurement.submit' })
    ).not.toBeInTheDocument()
  })
})
