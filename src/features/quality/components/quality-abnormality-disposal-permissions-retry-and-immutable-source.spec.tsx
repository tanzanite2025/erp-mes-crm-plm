// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { unitService } from '@/features/basic-settings/services/unit-service'
import { QualityAbnormalities } from '@/features/production-quality/tabs/quality-abnormalities'
import {
  QualityCoreService,
  type QualityAbnormality,
} from '../services/quality-core-service'
import { QualityMaintenanceService } from '../services/quality-maintenance-service'
import { QualityAbnormalityDisposalConfirmationDialog } from './quality-abnormality-disposal-confirmation-dialog'

const permission = vi.hoisted(() => ({ allowed: true }))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    isChecking: false,
    allowsAction: () => permission.allowed,
  }),
}))
vi.mock('@/lib/handle-server-error', () => ({ handleServerError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
// Native selectors keep these tests focused on command behaviour. Real Radix
// interactions and layout are checked in the isolated browser fixture.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    disabled,
    children,
  }: {
    value: string
    onValueChange: (value: string) => void
    disabled: boolean
    children: ReactNode
  }) => (
    <select
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value=''>{placeholder}</option>
  ),
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

const openAbnormality: QualityAbnormality = {
  id: 'abnormality',
  taskId: 'task',
  description: '重量超出全部品质等级',
  severity: 'MAJOR',
  status: 'OPEN',
  productId: 'source-product',
  batchNo: 'source-batch',
  occurredAt: '2026-10-31T01:00:00Z',
}

function renderQualityAbnormalityDisposalWorkflow(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidation = vi.spyOn(client, 'invalidateQueries')
  render(<QueryClientProvider client={client}>{children}</QueryClientProvider>)
  return { client, invalidation }
}

beforeEach(() => {
  permission.allowed = true
  vi.spyOn(unitService, 'getUnits').mockResolvedValue([
    { id: 'pcs', code: 'PCS', name: '件', status: 'active' },
    { id: 'inactive', code: 'OLD', name: '旧单位', status: 'inactive' },
  ] as never)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('quality abnormality disposal workflow', () => {
  it('opens from the page, preserves failed input, retries the same narrow command and shows confirmed facts', async () => {
    vi.spyOn(QualityCoreService, 'getAbnormalities').mockResolvedValue([
      openAbnormality,
    ])
    const submit = vi
      .spyOn(QualityMaintenanceService, 'recordAbnormalityDisposal')
      .mockRejectedValueOnce(new Error('network interrupted'))
      .mockResolvedValueOnce({
        ...openAbnormality,
        status: 'CLOSED',
        disposalMethod: 'SCRAP',
        scrapQuantity: 2,
        scrapUnit: 'PCS',
        resolver: 'quality-manager',
      })
    const { invalidation } = renderQualityAbnormalityDisposalWorkflow(
      <QualityAbnormalities />
    )
    fireEvent.click(
      await screen.findByRole('button', {
        name: `quality.disposal.title: ${openAbnormality.description}`,
      })
    )
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'SCRAP' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.disposal.confirm' })
    )
    expect(submit).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(
      'quality.disposal.scrapRequired'
    )
    fireEvent.change(screen.getByLabelText('quality.disposal.quantity'), {
      target: { value: '2' },
    })
    await screen.findByRole('option', { name: '件 (PCS)' })
    expect(screen.queryByRole('option', { name: '旧单位 (OLD)' })).toBeNull()
    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'PCS' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.disposal.confirm' })
    )
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'quality.disposal.saveFailed'
      )
    )
    expect(
      (screen.getByLabelText('quality.disposal.quantity') as HTMLInputElement)
        .value
    ).toBe('2')
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.disposal.confirm' })
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'quality.disposal.confirm' })
      ).toBeNull()
    )
    expect(submit.mock.calls).toEqual([
      [
        'abnormality',
        { disposalMethod: 'SCRAP', scrapQuantity: 2, scrapUnit: 'PCS' },
      ],
      [
        'abnormality',
        { disposalMethod: 'SCRAP', scrapQuantity: 2, scrapUnit: 'PCS' },
      ],
    ])
    expect(screen.getByRole('status').textContent).toBe(
      'quality.disposal.closed'
    )
    expect(screen.getByText('source-product')).toBeTruthy()
    expect(screen.getByText('source-batch')).toBeTruthy()
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ['quality_abnormalities'],
    })
    expect(invalidation).toHaveBeenCalledWith({
      queryKey: ['business-analysis'],
    })
  })

  it.each(['readonly', 'closed', 'rejected'] as const)(
    'provides read access without a write action for %s records',
    (state) => {
      permission.allowed = state !== 'readonly'
      const submit = vi.spyOn(
        QualityMaintenanceService,
        'recordAbnormalityDisposal'
      )
      renderQualityAbnormalityDisposalWorkflow(
        <QualityAbnormalityDisposalConfirmationDialog
          abnormality={{
            ...openAbnormality,
            status:
              state === 'closed'
                ? 'CLOSED'
                : state === 'rejected'
                  ? 'REJECTED'
                  : 'OPEN',
            disposalMethod: 'REWORK',
          }}
          onClose={vi.fn()}
        />
      )
      expect(
        screen.queryByRole('button', { name: 'quality.disposal.confirm' })
      ).toBeNull()
      expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(
        true
      )
      expect(submit).not.toHaveBeenCalled()
    }
  )

  it('confirms outsource facts without allowing inventory disposition or quantity changes', async () => {
    const record: QualityAbnormality = {
      ...openAbnormality,
      disposalMethod: 'SCRAP',
      scrapQuantity: 3,
      scrapUnit: 'HISTORICAL_UNIT',
      inspectionTask: {
        id: 'task',
        result: 'FAIL',
        batchNo: 'source-batch',
        sourceType: 'PRODUCTION_OUTSOURCE',
      },
    }
    const submit = vi
      .spyOn(QualityMaintenanceService, 'recordAbnormalityDisposal')
      .mockResolvedValue({ ...record, status: 'CLOSED' })
    renderQualityAbnormalityDisposalWorkflow(
      <QualityAbnormalityDisposalConfirmationDialog
        abnormality={record}
        onClose={vi.fn()}
      />
    )
    expect((screen.getByRole('combobox') as HTMLSelectElement).disabled).toBe(
      true
    )
    expect(
      (screen.getByLabelText('quality.disposal.quantity') as HTMLInputElement)
        .disabled
    ).toBe(true)
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.disposal.confirm' })
    )
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith('abnormality', {
        disposalMethod: 'SCRAP',
        scrapQuantity: 3,
        scrapUnit: 'HISTORICAL_UNIT',
      })
    )
    expect(unitService.getUnits).not.toHaveBeenCalled()
  })

  it('blocks closing while a confirmation is pending and omits stale scrap values for rework', async () => {
    let completeSave: (record: QualityAbnormality) => void = () => undefined
    const submit = vi
      .spyOn(QualityMaintenanceService, 'recordAbnormalityDisposal')
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            completeSave = resolve
          })
      )
    const close = vi.fn()
    renderQualityAbnormalityDisposalWorkflow(
      <QualityAbnormalityDisposalConfirmationDialog
        abnormality={{
          ...openAbnormality,
          disposalMethod: 'SCRAP',
          scrapQuantity: 4,
          scrapUnit: 'PCS',
        }}
        onClose={close}
      />
    )
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'REWORK' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.disposal.confirm' })
    )
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith('abnormality', {
        disposalMethod: 'REWORK',
      })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'quality.disposal.close' })
    )
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(close).not.toHaveBeenCalled()
    completeSave({
      ...openAbnormality,
      status: 'CLOSED',
      disposalMethod: 'REWORK',
    })
    await screen.findByText('quality.disposal.closed')
  })
})
