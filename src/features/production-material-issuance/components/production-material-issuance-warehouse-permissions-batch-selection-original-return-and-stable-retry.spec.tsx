// @vitest-environment jsdom
import type { ReactNode } from 'react'
import {
  QueryClient,
  QueryClientProvider,
  onlineManager,
} from '@tanstack/react-query'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { LanguageProvider } from '@/context/language-provider'
import { resolveRoutePermissionLabelKey } from '@/features/authz/data/route-permission-labels'
import { getWarehouseTabs } from '@/features/warehouse/tabs'
import { createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture } from '../testing/production-material-issuance-warehouse-review-batch-and-movement-test-fixtures'
import { ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection } from './production-material-issuance-warehouse-document-progress-movement-history-and-inline-handling-section'

const identity = vi.hoisted(() => ({
  actorId: 'warehouse-1',
  permissions: [] as string[],
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsAction: (permission: string) =>
      identity.permissions.includes(permission),
  }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { user: { id: string } }) => unknown) =>
    select({ user: { id: identity.actorId } }),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

const clients: QueryClient[] = []
beforeEach(() => {
  identity.actorId = 'warehouse-1'
  identity.permissions = [
    'menu_warehouse',
    'action_production_material_issuance_view',
    'action_production_material_issuance_warehouse_issue',
    'action_production_material_issuance_warehouse_supplement',
    'action_production_material_issuance_warehouse_return',
  ]
  vi.mocked(apiFetch).mockReset()
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  onlineManager.setOnline(true)
})

function renderProductionMaterialIssuanceWarehouseHandlingTestSurface(
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
) {
  clients.push(client)
  const fixture =
    createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider storageKey='warehouse-issuance-test-locale'>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
  const element = (
    <ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection
      documentId={fixture.document.id}
      sources={[fixture.basis]}
    />
  )
  return { ...render(element, { wrapper: Wrapper }), client, element }
}

async function prepareProductionMaterialIssuanceExplicitIssueTestForm() {
  fireEvent.click(
    screen.getByRole('button', { name: '展开仓库领退与单据进度' })
  )
  fireEvent.change(await screen.findByRole('combobox', { name: '原单物料' }), {
    target: { value: '55555555-5555-4555-8555-555555555555' },
  })
  const batch = await screen.findByRole('option', {
    name: /batch-A.*可领 70 kg/,
  })
  fireEvent.change(screen.getByRole('combobox', { name: '生产物料仓库批次' }), {
    target: { value: (batch as HTMLOptionElement).value },
  })
  fireEvent.change(screen.getByRole('spinbutton', { name: '本次数量（kg）' }), {
    target: { value: '10' },
  })
  fireEvent.click(screen.getByRole('button', { name: '按原单生成分配建议' }))
  await screen.findByRole('spinbutton', { name: /本次分配数量/ })
  fireEvent.click(screen.getByRole('checkbox'))
}

describe('warehouse issuance handling on original documents', () => {
  it('keeps every covered order line editable and submits only nonzero allocations after moving the advice to another line', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    fixture.review.sourceMaterials.push({
      ...fixture.review.sourceMaterials[0],
      sourceSnapshotId: fixture.basis.productId,
      salesOrderLineId: 102,
      position: 2,
    })
    fixture.review.materialTotals[0].standardQty = 100
    fixture.review.materialTotals[0].remainingQty = 100
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (String(endpoint).endsWith('/warehouse-review')) return fixture.review
      if (String(endpoint).endsWith('/material-batches')) return fixture.batches
      if (String(endpoint).endsWith('/ordinary-allocation-suggestion'))
        return fixture.suggestion
      throw new Error('unknown outcome')
    })
    renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    fireEvent.change(
      await screen.findByRole('combobox', { name: '原单物料' }),
      { target: { value: fixture.materialId } }
    )
    await screen.findByRole('option', { name: /batch-A.*可领 70 kg/ })
    fireEvent.change(
      screen.getByRole('combobox', { name: '生产物料仓库批次' }),
      { target: { value: fixture.batches.items[0].inventoryId } }
    )
    fireEvent.change(
      screen.getByRole('spinbutton', { name: '本次数量（kg）' }),
      { target: { value: '10' } }
    )
    fireEvent.click(screen.getByRole('button', { name: '按原单生成分配建议' }))
    const first = await screen.findByRole('spinbutton', {
      name: 'SO-HTTP / 1 / R50 的本次分配数量',
    })
    const second = screen.getByRole('spinbutton', {
      name: '102 的本次分配数量',
    })
    expect(second).toHaveValue(0)
    fireEvent.change(first, { target: { value: '0' } })
    fireEvent.change(second, { target: { value: '10' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认本次发料' }))
    await screen.findByRole('alert')
    const call = vi
      .mocked(apiFetch)
      .mock.calls.find(([endpoint]) => String(endpoint).endsWith('/issue'))
    expect(
      JSON.parse(String(call?.[1]?.body)).materials[0].allocations
    ).toEqual([
      { salesOrderLineId: 102, quantity: 10, originalAllocationId: null },
    ])
  })

  it('shows a batch read failure and prevents confirmation without replacing the failure with an empty-stock result', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (String(endpoint).endsWith('/warehouse-review')) return fixture.review
      throw new Error('batch query unavailable')
    })
    renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    fireEvent.change(
      await screen.findByRole('combobox', { name: '原单物料' }),
      { target: { value: fixture.materialId } }
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('批次读取失败')
    expect(
      screen.queryByText('该物料暂无可领库存，请核对入库和预留情况。')
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '确认本次发料' })).toBeDisabled()
  })

  it('requires supplement ownership and reason and sends no automatic offline replay', async () => {
    identity.permissions = [
      'menu_warehouse',
      'action_production_material_issuance_view',
      'action_production_material_issuance_warehouse_supplement',
    ]
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    let writes = 0
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (String(endpoint).endsWith('/warehouse-review')) return fixture.review
      if (String(endpoint).endsWith('/material-batches')) return fixture.batches
      writes++
      throw new Error('offline unknown outcome')
    })
    renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    fireEvent.change(
      await screen.findByRole('combobox', { name: '原单物料' }),
      { target: { value: fixture.materialId } }
    )
    await screen.findByRole('option', { name: /batch-A.*可领 70 kg/ })
    fireEvent.change(
      screen.getByRole('combobox', { name: '生产物料仓库批次' }),
      { target: { value: fixture.batches.items[0].inventoryId } }
    )
    fireEvent.change(
      screen.getByRole('spinbutton', { name: '本次数量（kg）' }),
      { target: { value: '10' } }
    )
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: '确认本次补料' })).toBeDisabled()
    fireEvent.change(screen.getByRole('combobox', { name: '补料归属订单行' }), {
      target: { value: '101' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: '确认本次补料' })).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: '原因（必填）' }), {
      target: { value: '额外补充' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: '确认本次补料' })).toBeEnabled()
    act(() => onlineManager.setOnline(false))
    fireEvent.click(screen.getByRole('button', { name: '确认本次补料' }))
    await screen.findByRole('alert')
    expect(writes).toBe(1)
    await act(async () => {
      onlineManager.setOnline(true)
    })
    expect(writes).toBe(1)
    const call = vi
      .mocked(apiFetch)
      .mock.calls.find(([endpoint]) => String(endpoint).endsWith('/supplement'))
    expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({
      reason: '额外补充',
      materials: [{ allocations: [{ salesOrderLineId: 101, quantity: 10 }] }],
    })
  })

  it('registers an independent warehouse tab and uses its own permission label', () => {
    expect(
      getWarehouseTabs((key) => key).find(
        (tab) => tab.href === '/warehouse/production-material-handovers'
      )?.label
    ).toBe('warehouse.tabs.productionMaterialHandovers')
    expect(
      resolveRoutePermissionLabelKey('/warehouse/production-material-handovers')
    ).toBe('warehouse.tabs.productionMaterialHandovers')
  })

  it('does not request data until expanded and keeps viewers out of batch and write requests', async () => {
    identity.permissions = [
      'menu_warehouse',
      'action_production_material_issuance_view',
    ]
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.review)
    renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    expect(apiFetch).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    await screen.findByText(/当前账号可查看记录/)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledOnce()
    expect(screen.getByText(/不代表全部订单的总体进度/)).toBeInTheDocument()
  })

  it('requires batch, server allocation advice and explicit confirmation; retries the same unknown request after closing with a newer document version', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    let latestReview = fixture.review
    let writes = 0
    const bodies: string[] = []
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).endsWith('/warehouse-review')) return latestReview
      if (String(endpoint).endsWith('/material-batches')) return fixture.batches
      if (String(endpoint).endsWith('/ordinary-allocation-suggestion'))
        return fixture.suggestion
      if (String(endpoint).endsWith('/issue')) {
        bodies.push(String(options?.body))
        writes++
        if (writes === 1) throw new Error('unknown network result')
        return fixture.result
      }
      throw new Error('unexpected request')
    })
    renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    await prepareProductionMaterialIssuanceExplicitIssueTestForm()
    const confirm = screen.getByRole('button', { name: '确认本次发料' })
    expect(confirm).toBeEnabled()
    fireEvent.click(confirm)
    fireEvent.click(confirm)
    await screen.findByRole('alert')
    expect(writes).toBe(1)
    expect(
      screen.queryByRole('button', { name: '重新核对后办理下一次' })
    ).not.toBeInTheDocument()
    latestReview = fixture.issuedReview
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    await screen.findByText('原单版本 2', { exact: false })
    expect(writes).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: '按原请求重试' }))
    await screen.findByText('仓库已确认，原单更新至版本 2。')
    expect(bodies[1]).toBe(bodies[0])
    expect(JSON.parse(bodies[0])).toMatchObject({
      expectedVersion: 1,
      materials: [
        {
          batchNo: 'batch-A',
          quantity: 10,
          allocations: [{ salesOrderLineId: 101, quantity: 10 }],
        },
      ],
    })
  })

  it('returns against the original allocation and backend returnable amount without a batch query', async () => {
    identity.permissions = [
      'menu_warehouse',
      'action_production_material_issuance_view',
      'action_production_material_issuance_warehouse_return',
    ]
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.issuedReview)
    renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    fireEvent.click(
      screen.getByRole('button', { name: '展开仓库领退与单据进度' })
    )
    fireEvent.change(
      await screen.findByRole('combobox', { name: '原单物料' }),
      { target: { value: fixture.materialId } }
    )
    expect(screen.getByRole('combobox', { name: '办理类型' })).toHaveValue(
      'return'
    )
    expect(
      screen.getByRole('option', { name: /可退 10 kg/ })
    ).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: '原发料分配' }), {
      target: {
        value:
          fixture.issuedReview.returnableAllocations[0].originalAllocationId,
      },
    })
    fireEvent.change(
      screen.getByRole('spinbutton', { name: '本次数量（kg）' }),
      { target: { value: '11' } }
    )
    fireEvent.change(screen.getByRole('textbox', { name: '原因（必填）' }), {
      target: { value: '现场剩余退回' },
    })
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: '确认接收退料' })).toBeDisabled()
    fireEvent.change(
      screen.getByRole('spinbutton', { name: '本次数量（kg）' }),
      { target: { value: '3' } }
    )
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('button', { name: '确认接收退料' })).toBeEnabled()
    expect(apiFetch).toHaveBeenCalledOnce()
  })

  it('hides a prepared retry after switching accounts or losing its action permission', async () => {
    const fixture =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (String(endpoint).endsWith('/warehouse-review')) return fixture.review
      if (String(endpoint).endsWith('/material-batches')) return fixture.batches
      if (String(endpoint).endsWith('/ordinary-allocation-suggestion'))
        return fixture.suggestion
      throw new Error('unknown outcome')
    })
    const surface =
      renderProductionMaterialIssuanceWarehouseHandlingTestSurface()
    await prepareProductionMaterialIssuanceExplicitIssueTestForm()
    fireEvent.click(screen.getByRole('button', { name: '确认本次发料' }))
    await screen.findByRole('alert')
    identity.permissions = [
      'menu_warehouse',
      'action_production_material_issuance_view',
    ]
    surface.rerender(
      <ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection
        documentId={fixture.document.id}
        sources={[fixture.basis]}
      />
    )
    expect(screen.getByRole('button', { name: '按原请求重试' })).toBeDisabled()
    identity.actorId = 'warehouse-2'
    surface.rerender(
      <ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection
        documentId={fixture.document.id}
        sources={[fixture.basis]}
      />
    )
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: '按原请求重试' })
      ).not.toBeInTheDocument()
    )
    await act(async () => {})
  })
})
