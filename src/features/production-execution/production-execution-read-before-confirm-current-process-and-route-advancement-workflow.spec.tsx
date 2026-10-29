// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import type { ProductionRoute } from '@/features/production-shared/data/production-route'
import { ProductionExecutionBarcodeReviewAndExplicitOperationWorkspace } from './production-execution-barcode-review-and-explicit-operation-workspace'

const productionExecutionWorkflowTestDependencies = vi.hoisted(() => ({
  readCurrentProcess: vi.fn(),
  executeConfirmedOperation: vi.fn(),
  identity: {
    user: {
      id: 'reviewer',
      permissions: ['menu_prod_config', 'action_production_issuance_execute'],
    },
    isIdentitySynced: true,
    isSyncing: false,
  },
  routesFailed: false,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (
      state: typeof productionExecutionWorkflowTestDependencies.identity
    ) => unknown
  ) => select(productionExecutionWorkflowTestDependencies.identity),
}))
vi.mock(
  './services/production-execution-product-barcode-current-process-query-service',
  () => ({
    queryProductionExecutionProductBarcodeCurrentProcess:
      productionExecutionWorkflowTestDependencies.readCurrentProcess,
  })
)
vi.mock(
  '@/features/scan-platform/services/production-scan-command-service',
  () => ({
    productionScanCommandService: {
      execute:
        productionExecutionWorkflowTestDependencies.executeConfirmedOperation,
    },
    classifyProductionScanCommandError: (error: Error) => ({
      kind: 'server',
      message: error.message,
    }),
  })
)
vi.mock('@/features/production-shared/hooks/use-production-resources', () => ({
  useProductionRoutesQuery: () => ({
    data: productionExecutionWorkflowTestDependencies.routesFailed
      ? []
      : [productionExecutionWorkflowTestRoute],
    isLoading: false,
    isError: productionExecutionWorkflowTestDependencies.routesFailed,
  }),
}))
vi.mock('@/components/camera-scan-input', () => ({
  CameraScanInput: () => null,
}))
vi.mock('@/components/hid-scan-input', () => ({
  HIDScanInput: ({
    value,
    onValueChange,
    onScanComplete,
  }: {
    value: string
    onValueChange: (barcode: string) => void
    onScanComplete: (barcode: string) => void
  }) => (
    <span>
      <input
        aria-label='测试扫码枪条码'
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
      <button type='button' onClick={() => onScanComplete(value)}>
        模拟扫码完成
      </button>
    </span>
  ),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const productionExecutionWorkflowTestRoute: ProductionRoute = {
  id: 'route-1',
  code: 'R001',
  name: '产品生产路线',
  productId: '',
  productName: '',
  productTemplateId: '',
  description: '',
  version: 1,
  status: 'PUBLISHED',
  createdAt: '',
  updatedAt: '',
  steps: ['裁切', '缝制', '包装'].map((processName, index) => ({
    id: `step-${index + 1}`,
    routeId: 'route-1',
    sequence: index + 1,
    segmentId: '',
    processStepId: `process-${index + 1}`,
    processName,
    executionMode: 'IN_HOUSE',
    qualityGate: 'NONE',
    estimatedMinutes: 0,
    transferRequired: false,
    description: '',
  })),
}
const productionExecutionWorkflowTestRecordedState = {
  productBarcode: 'PRODUCT-001',
  productName: '测试产品',
  routeId: 'route-1',
  routeStepId: 'step-1',
  currentProcessStepId: 'process-1',
  currentProcessStep: { id: 'process-1', code: 'CUT', name: '裁切' },
  status: 'IN_PROGRESS',
}
const productionExecutionWorkflowTestCompletionResponse = {
  commandSource: 'WEB',
  operation: { action: 'COMPLETE', routeId: 'route-1', operator: '测试操作员' },
  state: {
    ...productionExecutionWorkflowTestRecordedState,
    routeStepId: 'step-2',
    currentProcessStepId: 'process-2',
    currentProcessStep: { id: 'process-2', code: 'SEW', name: '缝制' },
    status: 'NOT_STARTED',
  },
  progress: {
    executedRouteStepId: 'step-1',
    executedProcessStepId: 'process-1',
    advanced: true,
    routeCompleted: false,
  },
  transferEvents: [],
}

beforeEach(() => {
  productionExecutionWorkflowTestDependencies.readCurrentProcess
    .mockReset()
    .mockResolvedValue(productionExecutionWorkflowTestRecordedState)
  productionExecutionWorkflowTestDependencies.executeConfirmedOperation
    .mockReset()
    .mockResolvedValue(productionExecutionWorkflowTestCompletionResponse)
  productionExecutionWorkflowTestDependencies.identity.user.permissions = [
    'menu_prod_config',
    'action_production_issuance_execute',
  ]
  productionExecutionWorkflowTestDependencies.routesFailed = false
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderProductionExecutionBarcodeReviewWorkflow() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductionExecutionBarcodeReviewAndExplicitOperationWorkspace />
      </LanguageProvider>
    </QueryClientProvider>
  )
}

async function readProductionExecutionWorkflowTestBarcode(
  barcode = 'PRODUCT-001'
) {
  fireEvent.change(screen.getByLabelText('产品一维码'), {
    target: { value: barcode },
  })
  fireEvent.keyDown(screen.getByLabelText('产品一维码'), { key: 'Enter' })
  await waitFor(() =>
    expect(
      productionExecutionWorkflowTestDependencies.readCurrentProcess
    ).toHaveBeenCalledWith(barcode, expect.any(AbortSignal))
  )
}

describe('production execution product review and explicit confirmation', () => {
  it('distinguishes a rework transfer from normal advancement in the confirmed result', async () => {
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockResolvedValue(
      {
        ...productionExecutionWorkflowTestRecordedState,
        routeStepId: 'step-2',
        currentProcessStepId: 'process-2',
      }
    )
    productionExecutionWorkflowTestDependencies.executeConfirmedOperation.mockResolvedValue(
      {
        ...productionExecutionWorkflowTestCompletionResponse,
        operation: {
          action: 'REWORK',
          routeId: 'route-1',
          operator: '测试操作员',
        },
        state: {
          ...productionExecutionWorkflowTestRecordedState,
          status: 'REWORK',
        },
      }
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    fireEvent.click(screen.getByRole('button', { name: /退回返工\s*指定目标/ }))
    await readProductionExecutionWorkflowTestBarcode()
    fireEvent.change(await screen.findByLabelText('返工目标'), {
      target: { value: 'step-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认转入返工工序' }))
    const result = screen.getByRole('region', { name: '最近一次办理结果' })
    await within(result).findByText('已办理返工，产品已转到所选返工工序')
    expect(within(result).getByText('待返工')).toBeInTheDocument()
    expect(
      within(result).queryByText(/下一工序开始作业时/)
    ).not.toBeInTheDocument()
    expect(
      productionExecutionWorkflowTestDependencies.executeConfirmedOperation
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REWORK',
        targetRouteStepId: 'step-1',
        targetProcessStepId: 'process-1',
      })
    )
  })

  it('previews and confirms route completion at the final process', async () => {
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockResolvedValue(
      {
        ...productionExecutionWorkflowTestRecordedState,
        routeStepId: 'step-3',
        currentProcessStepId: 'process-3',
      }
    )
    productionExecutionWorkflowTestDependencies.executeConfirmedOperation.mockResolvedValue(
      {
        ...productionExecutionWorkflowTestCompletionResponse,
        state: {
          ...productionExecutionWorkflowTestRecordedState,
          routeStepId: 'step-3',
          currentProcessStepId: 'process-3',
          status: 'COMPLETED',
        },
        progress: {
          executedRouteStepId: 'step-3',
          executedProcessStepId: 'process-3',
          advanced: false,
          routeCompleted: true,
        },
      }
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    fireEvent.click(screen.getByRole('button', { name: /完工过站\s*本工序/ }))
    await readProductionExecutionWorkflowTestBarcode()
    const preview = screen.getByRole('region', {
      name: '3. 核对动作与工序去向',
    })
    await within(preview).findByText('整条路线完成')
    fireEvent.click(screen.getByRole('button', { name: '确认完工并过站' }))
    const result = screen.getByRole('region', { name: '最近一次办理结果' })
    await within(result).findByText('本工序完工，整条路线已完成')
    expect(
      within(result).queryByText(/下一工序开始作业时/)
    ).not.toBeInTheDocument()
  })

  it('reads fresh process state when the same product is scanned after confirmation', async () => {
    renderProductionExecutionBarcodeReviewWorkflow()
    fireEvent.click(screen.getByRole('button', { name: /完工过站\s*本工序/ }))
    await readProductionExecutionWorkflowTestBarcode()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '确认完工并过站' })
      ).toBeEnabled()
    )
    fireEvent.click(screen.getByRole('button', { name: '确认完工并过站' }))
    await waitFor(() =>
      expect(screen.getByLabelText('产品一维码')).toHaveValue('')
    )
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockResolvedValue(
      productionExecutionWorkflowTestCompletionResponse.state
    )
    await readProductionExecutionWorkflowTestBarcode()
    const preview = screen.getByRole('region', {
      name: '3. 核对动作与工序去向',
    })
    await within(preview).findByText('3. 包装')
    expect(
      productionExecutionWorkflowTestDependencies.readCurrentProcess
    ).toHaveBeenCalledTimes(2)
    expect(
      productionExecutionWorkflowTestDependencies.executeConfirmedOperation
    ).toHaveBeenCalledTimes(1)
  })

  it('brings the reviewed process into view after a scan on small screens', async () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }))
    const scrollToReviewedProcess = vi.spyOn(
      Element.prototype,
      'scrollIntoView'
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    await waitFor(() =>
      expect(scrollToReviewedProcess).toHaveBeenCalledWith({
        block: 'start',
        behavior: 'smooth',
      })
    )
  })

  it('reads on Enter, previews current and next process, and executes only after explicit completion confirmation', async () => {
    renderProductionExecutionBarcodeReviewWorkflow()
    fireEvent.click(screen.getByRole('button', { name: /完工过站\s*本工序/ }))
    await readProductionExecutionWorkflowTestBarcode()
    const confirm = await screen.findByRole('button', {
      name: '确认完工并过站',
    })
    await waitFor(() => expect(confirm).toBeEnabled())
    const preview = screen.getByRole('region', {
      name: '3. 核对动作与工序去向',
    })
    expect(within(preview).getByText('1. 裁切')).toBeInTheDocument()
    expect(within(preview).getByText('2. 缝制')).toBeInTheDocument()
    expect(screen.getByLabelText('生产路线')).toBeDisabled()
    expect(screen.getByLabelText('本次办理工序')).toBeDisabled()
    expect(screen.queryByLabelText('委外单位')).not.toBeInTheDocument()
    expect(
      productionExecutionWorkflowTestDependencies.executeConfirmedOperation
    ).not.toHaveBeenCalled()
    fireEvent.click(confirm)
    await waitFor(() =>
      expect(
        productionExecutionWorkflowTestDependencies.executeConfirmedOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          productBarcode: 'PRODUCT-001',
          action: 'COMPLETE',
          routeId: 'route-1',
          routeStepId: 'step-1',
          processStepId: 'process-1',
          targetRouteStepId: '',
          targetProcessStepId: '',
        })
      )
    )
    const result = screen.getByRole('region', { name: '最近一次办理结果' })
    expect(
      productionExecutionWorkflowTestDependencies.executeConfirmedOperation.mock
        .calls[0][0]
    ).not.toHaveProperty('partnerId')
    await within(result).findByText('待开工')
    expect(within(result).getByText('2. 缝制')).toBeInTheDocument()
    expect(within(result).getByText(/下一工序开始作业时/)).toBeInTheDocument()
    expect(screen.getByLabelText('产品一维码')).toHaveValue('')
  })

  it('treats scanner completion as a read and keeps explicit confirmation separate', async () => {
    renderProductionExecutionBarcodeReviewWorkflow()
    fireEvent.click(screen.getByRole('button', { name: 'USB 扫码枪' }))
    fireEvent.change(screen.getByLabelText('测试扫码枪条码'), {
      target: { value: 'PRODUCT-001' },
    })
    fireEvent.click(screen.getByRole('button', { name: '模拟扫码完成' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '确认工序开工' })).toBeEnabled()
    )
    expect(
      productionExecutionWorkflowTestDependencies.readCurrentProcess
    ).toHaveBeenCalled()
    expect(
      productionExecutionWorkflowTestDependencies.executeConfirmedOperation
    ).not.toHaveBeenCalled()
  })

  it('disables execution immediately when a barcode changes and ignores the previous barcode response', async () => {
    let resolveOldBarcodeRead: (
      state: typeof productionExecutionWorkflowTestRecordedState
    ) => void = () => undefined
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOldBarcodeRead = resolve
        })
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    fireEvent.change(screen.getByLabelText('产品一维码'), {
      target: { value: 'PRODUCT-002' },
    })
    await act(async () =>
      resolveOldBarcodeRead(productionExecutionWorkflowTestRecordedState)
    )
    expect(screen.getByRole('button', { name: '确认工序开工' })).toBeDisabled()
    expect(
      screen.getByRole('region', { name: '3. 核对动作与工序去向' })
    ).not.toHaveTextContent('1. 裁切')
    expect(
      productionExecutionWorkflowTestDependencies.executeConfirmedOperation
    ).not.toHaveBeenCalled()
  })

  it('allows a first start after route selection but blocks completing an unrecorded barcode', async () => {
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockResolvedValue(
      null
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    const routeSelect = await screen.findByLabelText('生产路线')
    expect(screen.getAllByText(/该产品码尚无工序执行记录/)).toHaveLength(1)
    expect(screen.getByRole('button', { name: '确认工序开工' })).toBeDisabled()
    fireEvent.change(routeSelect, { target: { value: 'route-1' } })
    expect(screen.getByLabelText('本次办理工序')).toHaveValue('step-1')
    expect(screen.getByRole('button', { name: '确认工序开工' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /完工过站\s*本工序/ }))
    expect(
      screen.getByRole('button', { name: '确认完工并过站' })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /工序开工\s*记录开工/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认工序开工' }))
    await waitFor(() =>
      expect(
        productionExecutionWorkflowTestDependencies.executeConfirmedOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'START',
          routeStepId: 'step-1',
          processStepId: 'process-1',
        })
      )
    )
  })

  it('keeps confirmation disabled when reading fails', async () => {
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockRejectedValue(
      new Error('unavailable')
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    await screen.findByText(/当前工序读取失败/)
    expect(screen.getByRole('button', { name: '确认工序开工' })).toBeDisabled()
    expect(screen.queryByLabelText('生产路线')).not.toBeInTheDocument()
  })

  it('permits viewing current process without execute permission', async () => {
    productionExecutionWorkflowTestDependencies.identity.user.permissions = [
      'menu_prod_config',
    ]
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    await screen.findByLabelText('生产路线')
    expect(screen.getByRole('button', { name: '确认工序开工' })).toBeDisabled()
    expect(screen.getByText('当前账号没有生产执行权限。')).toBeInTheDocument()
  })

  it('does not use a rework destination after switching to normal completion', async () => {
    renderProductionExecutionBarcodeReviewWorkflow()
    fireEvent.click(screen.getByRole('button', { name: /退回返工\s*指定目标/ }))
    await readProductionExecutionWorkflowTestBarcode()
    fireEvent.change(await screen.findByLabelText('返工目标'), {
      target: { value: 'step-3' },
    })
    fireEvent.click(screen.getByRole('button', { name: /完工过站\s*本工序/ }))
    fireEvent.click(screen.getByRole('button', { name: '确认完工并过站' }))
    await waitFor(() =>
      expect(
        productionExecutionWorkflowTestDependencies.executeConfirmedOperation
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'COMPLETE',
          targetRouteStepId: '',
          targetProcessStepId: '',
        })
      )
    )
  })

  it('retains entered details on a failed command and clears them before reviewing another product', async () => {
    productionExecutionWorkflowTestDependencies.executeConfirmedOperation.mockRejectedValue(
      new Error('状态冲突，请重新核对')
    )
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    const notes = await screen.findByLabelText('备注')
    fireEvent.change(notes, { target: { value: '仅针对第一个产品' } })
    fireEvent.change(screen.getByLabelText('目标持有方'), {
      target: { value: 'holder-1' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认工序开工' }))
    await screen.findByText('状态冲突，请重新核对')
    expect(notes).toHaveValue('仅针对第一个产品')
    expect(screen.getByLabelText('产品一维码')).toHaveValue('PRODUCT-001')
    productionExecutionWorkflowTestDependencies.readCurrentProcess.mockResolvedValue(
      {
        ...productionExecutionWorkflowTestRecordedState,
        productBarcode: 'PRODUCT-002',
      }
    )
    await readProductionExecutionWorkflowTestBarcode('PRODUCT-002')
    await waitFor(() => expect(screen.getByLabelText('备注')).toHaveValue(''))
    expect(screen.getByLabelText('目标持有方')).toHaveValue('')
  })

  it('blocks confirmation if route names and step context could not be read', async () => {
    productionExecutionWorkflowTestDependencies.routesFailed = true
    renderProductionExecutionBarcodeReviewWorkflow()
    await readProductionExecutionWorkflowTestBarcode()
    await screen.findByText('生产路线读取失败，请刷新后核对路线及工序。')
    expect(screen.getByRole('button', { name: '确认工序开工' })).toBeDisabled()
  })
})
