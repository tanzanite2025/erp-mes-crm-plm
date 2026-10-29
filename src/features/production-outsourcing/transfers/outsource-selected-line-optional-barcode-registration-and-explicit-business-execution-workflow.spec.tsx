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
import {
  matchesPathPermissionProjection,
  getProjectedTabsFromPermissionSnapshot,
} from '@/features/authz/guards/route-access'
import { toOutsourceOrderContract } from '../adapters/outsource-order-api-adapter'
import { getProductionOutsourcingTabs } from '../tabs'
import { OutsourceTransferManagement } from './index'
import { OutsourceOrderLineOptionalBarcodeRegistrationDialog } from './outsource-order-line-optional-barcode-registration-dialog'

const dependencies = vi.hoisted(() => ({
  saveRegistration: vi.fn(),
  reviewBarcode: vi.fn(),
  send: vi.fn(),
  receive: vi.fn(),
  inspect: vi.fn(),
  readDiagnostics: vi.fn(),
  permissions: [
    'tab_production_outsourcing_transfers',
    'action_outsource_transfer_execute',
    'action_outsource_inspection_submit',
  ],
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: unknown) => unknown) =>
    select({
      user: { id: 'worker', permissions: dependencies.permissions },
      isIdentitySynced: true,
    }),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsAction: (action: string) => dependencies.permissions.includes(action),
    isChecking: false,
  }),
}))
vi.mock(
  '../services/outsource-order-line-optional-barcode-registration-and-execution-review-service',
  () => ({
    saveOutsourceOrderLineOptionalBarcodeRegistration:
      dependencies.saveRegistration,
    reviewOutsourceExecutionBarcodeForSelectedOrderLine:
      dependencies.reviewBarcode,
  })
)
vi.mock('../hooks/use-outsource-orders', () => ({
  useOutsourceOrders: () => ({
    data: { items: [outsourceOrder] },
    isLoading: false,
  }),
  useOutsourceDiagnostics: dependencies.readDiagnostics,
  useOutsourceOrderMutations: () => ({
    sendLineMutation: { mutate: dependencies.send, isPending: false },
    returnLineMutation: { mutate: dependencies.receive, isPending: false },
    inspectLineMutation: { mutate: dependencies.inspect, isPending: false },
  }),
}))
vi.mock('../hooks/use-outsource-inventory-category-options', () => ({
  useOutsourceInventoryCategoryOptions: () => ({
    data: [
      {
        code: 'FINISHED',
        label: '成品仓',
        allowShipment: true,
        allowInbound: true,
      },
    ],
  }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const outsourceOrder = toOutsourceOrderContract({
  id: 'order-a',
  orderNo: 'OS-A',
  partnerNameSnapshot: '电镀委外单位',
  status: 'RELEASED',
  lines: [
    {
      id: 'line-a',
      lineNo: 1,
      outsourceOrderId: 'order-a',
      productCode: 'PRODUCT-A',
      productName: '产品甲',
      quantity: 20,
      uom: 'PCS',
      status: 'RELEASED',
      registeredProductBarcodes: [],
      version: 3,
    },
    {
      id: 'line-b',
      lineNo: 2,
      outsourceOrderId: 'order-a',
      productCode: 'PRODUCT-B',
      productName: '产品乙',
      quantity: 5,
      uom: 'PCS',
      status: 'RELEASED',
      registeredProductBarcodes: ['BC-B'],
      version: 2,
    },
  ],
})

function renderOutsourceWorkflowWithQueryAndLanguage(element: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider>{element}</LanguageProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  localStorage.setItem('app-lang', 'zh-CN')
  dependencies.permissions = [
    'tab_production_outsourcing_transfers',
    'action_outsource_transfer_execute',
    'action_outsource_inspection_submit',
  ]
  vi.clearAllMocks()
  dependencies.readDiagnostics.mockReturnValue({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
  })
  dependencies.saveRegistration.mockResolvedValue(outsourceOrder.lines[0])
  dependencies.reviewBarcode.mockResolvedValue({
    lineId: 'line-a',
    productBarcode: 'BC-A',
    productName: '产品甲',
    action: 'SEND',
    routeStepId: 'step-1',
    processName: '电镀',
    status: 'IN_PROGRESS',
    availableQuantity: 2,
    uom: 'PCS',
    destinations: {},
  })
})
afterEach(cleanup)

describe('outsource diagnostics load only when opened', () => {
  it('does not start diagnostics while collapsed and shows a failed refresh instead of a healthy stale result', async () => {
    dependencies.readDiagnostics.mockReturnValue({
      data: { summary: { totalIssues: 0 }, issues: [] },
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: vi.fn(),
    })
    renderOutsourceWorkflowWithQueryAndLanguage(<OutsourceTransferManagement />)
    expect(dependencies.readDiagnostics).not.toHaveBeenCalled()
    const details = screen.getByText('运行诊断').closest('details')!
    details.open = true
    fireEvent(details, new Event('toggle'))
    await waitFor(() => expect(dependencies.readDiagnostics).toHaveBeenCalled())
    expect(screen.getByRole('alert').textContent).toContain('诊断读取失败')
    expect(screen.queryByText('数据链路正常')).toBeNull()
    details.open = false
    fireEvent(details, new Event('toggle'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })
})

describe('selected outsource line optional barcode registration', () => {
  it('opens the selected line, normalizes and deduplicates scans, and saves pending input without requiring all quantities', async () => {
    renderOutsourceWorkflowWithQueryAndLanguage(<OutsourceTransferManagement />)
    fireEvent.click(screen.getAllByRole('button', { name: /条码登记/ })[0])
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/产品甲/)).toBeTruthy()
    expect(within(dialog).queryByText('BC-B')).toBeNull()
    const input = within(dialog).getByRole('textbox', { name: '产品条码' })
    fireEvent.change(input, { target: { value: ' bc-a ' } })
    fireEvent.submit(input.closest('form')!)
    expect(within(dialog).getByText('BC-A')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'bc-a' } })
    fireEvent.submit(input.closest('form')!)
    expect(within(dialog).getByRole('alert').textContent).toContain('重复')
    fireEvent.change(input, { target: { value: 'bc-extra' } })
    fireEvent.click(within(dialog).getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(dependencies.saveRegistration).toHaveBeenCalledWith('line-a', 3, [
        'BC-A',
        'BC-EXTRA',
      ])
    )
    expect(dependencies.send).not.toHaveBeenCalled()
    expect(dependencies.receive).not.toHaveBeenCalled()
    expect(dependencies.inspect).not.toHaveBeenCalled()
  })

  it('allows an empty registration to be saved and preserves entered codes after a save failure', async () => {
    dependencies.saveRegistration.mockRejectedValueOnce(
      new Error('明细已更新，请重新核对')
    )
    const onClose = vi.fn()
    renderOutsourceWorkflowWithQueryAndLanguage(
      <OutsourceOrderLineOptionalBarcodeRegistrationDialog
        order={outsourceOrder}
        line={outsourceOrder.lines[0]}
        canEdit
        onClose={onClose}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('明细已更新')
    )
    expect(dependencies.saveRegistration).toHaveBeenCalledWith('line-a', 3, [])
    expect(onClose).not.toHaveBeenCalled()
    const input = screen.getByRole('textbox', { name: '产品条码' })
    fireEvent.change(input, { target: { value: 'BC-KEEP' } })
    dependencies.saveRegistration.mockRejectedValueOnce(new Error('网络失败'))
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('网络失败')
    )
    expect(screen.getByText('BC-KEEP')).toBeTruthy()
  })

  it('removes only the selected barcode and prevents double submit while saving', async () => {
    let resolveSave: (value: unknown) => void = () => {}
    dependencies.saveRegistration.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve
        })
    )
    renderOutsourceWorkflowWithQueryAndLanguage(
      <OutsourceOrderLineOptionalBarcodeRegistrationDialog
        order={outsourceOrder}
        line={outsourceOrder.lines[1]}
        canEdit
        onClose={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '移除条码 BC-B' }))
    const save = screen.getByRole('button', { name: '保存' })
    fireEvent.click(save)
    fireEvent.click(save)
    await waitFor(() =>
      expect(dependencies.saveRegistration).toHaveBeenCalledTimes(1)
    )
    expect(dependencies.saveRegistration).toHaveBeenCalledWith('line-b', 2, [])
    await act(async () => resolveSave(outsourceOrder.lines[1]))
  })

  it('lets an inspector view registrations but not change them or send products', () => {
    dependencies.permissions = [
      'tab_production_outsourcing_transfers',
      'action_outsource_inspection_submit',
    ]
    renderOutsourceWorkflowWithQueryAndLanguage(<OutsourceTransferManagement />)
    expect(
      (screen.getAllByRole('button', { name: '发出' })[0] as HTMLButtonElement)
        .disabled
    ).toBe(true)
    fireEvent.click(screen.getAllByRole('button', { name: /条码登记/ })[1])
    expect(screen.getByText('BC-B')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    expect(screen.queryByRole('textbox', { name: '产品条码' })).toBeNull()
  })
})

describe('outsource read before business confirmation', () => {
  it('submits only the selected outsource business action after explicit confirmation', async () => {
    renderOutsourceWorkflowWithQueryAndLanguage(<OutsourceTransferManagement />)
    fireEvent.click(screen.getAllByRole('button', { name: '发出' })[0])
    const input = screen.getByRole('textbox', { name: '产品条码' })
    fireEvent.change(input, { target: { value: 'BC-A' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getAllByRole('combobox')[0], {
      target: { value: 'FINISHED' },
    })
    fireEvent.change(within(dialog).getByRole('spinbutton'), {
      target: { value: '3' },
    })
    expect(
      (
        within(dialog).getByRole('button', {
          name: '确认委外发出',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    fireEvent.change(within(dialog).getByRole('spinbutton'), {
      target: { value: '2' },
    })
    const confirm = within(dialog).getByRole('button', { name: '确认委外发出' })
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    expect(dependencies.send).toHaveBeenCalledTimes(1)
    expect(dependencies.send).toHaveBeenCalledWith(
      expect.objectContaining({
        lineId: 'line-a',
        values: expect.objectContaining({
          productBarcode: 'BC-A',
          quantity: 2,
          sourceCategory: 'FINISHED',
          targetCategory: 'PRODUCTION_OUTSOURCE',
        }),
      }),
      expect.any(Object)
    )
    expect(dependencies.receive).not.toHaveBeenCalled()
    expect(dependencies.inspect).not.toHaveBeenCalled()
  })
  it('Enter only reads the selected line; editing the barcode invalidates confirmation', async () => {
    renderOutsourceWorkflowWithQueryAndLanguage(<OutsourceTransferManagement />)
    fireEvent.click(screen.getAllByRole('button', { name: '发出' })[0])
    const input = screen.getByRole('textbox', { name: '产品条码' })
    fireEvent.change(input, { target: { value: 'BC-A' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(screen.getByText(/条码当前工序/)).toBeTruthy())
    expect(dependencies.reviewBarcode).toHaveBeenCalledWith(
      'line-a',
      'BC-A',
      'SEND'
    )
    expect(dependencies.send).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog')
    fireEvent.change(within(dialog).getAllByRole('combobox')[0], {
      target: { value: 'FINISHED' },
    })
    const confirm = within(dialog).getByRole('button', {
      name: '确认委外发出',
    }) as HTMLButtonElement
    expect(confirm.disabled).toBe(false)
    fireEvent.change(input, { target: { value: 'OTHER' } })
    expect(confirm.disabled).toBe(true)
    expect(screen.queryByText(/条码当前工序/)).toBeNull()
  })

  it('ignores an obsolete response and keeps failed reviews from enabling execution', async () => {
    let resolveReview: (value: unknown) => void = () => {}
    dependencies.reviewBarcode.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveReview = resolve
        })
    )
    renderOutsourceWorkflowWithQueryAndLanguage(<OutsourceTransferManagement />)
    fireEvent.click(screen.getAllByRole('button', { name: '发出' })[0])
    const input = screen.getByRole('textbox', { name: '产品条码' })
    fireEvent.change(input, { target: { value: 'BC-A' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'BC-WRONG' } })
    await act(async () => resolveReview({ productBarcode: 'BC-A' }))
    expect(screen.queryByText(/条码当前工序/)).toBeNull()
    dependencies.reviewBarcode.mockRejectedValueOnce(
      new Error('条码产品与委外明细不一致')
    )
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('不一致')
    )
    expect(
      (
        screen.getByRole('button', {
          name: '确认委外发出',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true)
    expect(dependencies.send).not.toHaveBeenCalled()
  })
})

it('projects only the transfers tab for a transfers-only account and allows its module entry', () => {
  const user = { permissions: ['tab_production_outsourcing_transfers'] }
  expect(matchesPathPermissionProjection(user, '/production-outsourcing')).toBe(
    true
  )
  expect(
    getProjectedTabsFromPermissionSnapshot(
      user,
      getProductionOutsourcingTabs((key) => key)
    ).map((tab) => tab.key)
  ).toEqual(['transfers'])
  expect(
    matchesPathPermissionProjection(user, '/production-outsourcing/orders')
  ).toBe(false)
})
