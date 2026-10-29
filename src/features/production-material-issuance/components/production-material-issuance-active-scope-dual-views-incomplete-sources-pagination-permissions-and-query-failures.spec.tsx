// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { LanguageProvider } from '@/context/language-provider'
import { createProductionMaterialIssuanceActiveOrderProgressTestFixture } from '../testing/production-material-issuance-active-order-progress-frozen-current-and-incomplete-scope-test-fixture'
import { ProductionMaterialIssuanceProgressWorkspaceWithDocumentTraceability } from './production-material-issuance-progress-workspace-with-document-traceability'

const access = vi.hoisted(() => ({
  allowed: true,
  user: { id: 'active-reader' },
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof access) => unknown) => select(access),
}))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsAction: (permission: string) =>
      access.allowed &&
      permission === 'action_production_material_issuance_view',
  }),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

function renderProductionMaterialIssuanceActiveProgressTestWorkspace(
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider defaultLocale={locale} storageKey='active-scope-test'>
        <ProductionMaterialIssuanceProgressWorkspaceWithDocumentTraceability />
      </LanguageProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  access.allowed = true
  vi.mocked(apiFetch).mockReset()
  vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
    if (String(endpoint).includes('active-order-progress'))
      return createProductionMaterialIssuanceActiveOrderProgressTestFixture()
    return { items: [], total: 0, page: 1, pageSize: 20 }
  })
})
afterEach(cleanup)

describe('active production issuance progress workspace', () => {
  it('uses the same result across views, keeps source anomalies visible, and never offsets excess against another line', async () => {
    renderProductionMaterialIssuanceActiveProgressTestWorkspace()
    const scope = screen.getByRole('region', { name: '订单范围与需求依据' })
    await waitFor(() =>
      expect(scope).toHaveTextContent('1 个订单 / 3 条订单行')
    )
    expect(scope).toHaveTextContent('已下发 2 条 / 未下发 1 条')
    expect(within(scope).getByRole('alert')).toHaveTextContent(
      '不能据此判断全部领齐'
    )
    expect(screen.getByRole('tab', { name: '按订单查看' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    const visibleOrders = screen.getByRole('region', { name: '订单行领料进度' })
    const visibleQuantities = Array.from(
      visibleOrders.querySelectorAll('dd')
    ).filter((quantity) => !quantity.closest('details'))
    expect(visibleQuantities.map((quantity) => quantity.textContent)).toEqual([
      '200kg',
      '220kg',
      '0kg',
      '200kg',
      '160kg',
      '40kg',
    ])
    expect(within(visibleOrders).getByRole('alert')).toHaveTextContent(
      '暂不能判断'
    )
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按物料汇总' }), {
      button: 0,
      ctrlKey: false,
    })
    const material = screen.getByRole('region', { name: '物料待领汇总' })
    expect(material).toHaveTextContent('40')
    expect(material).toHaveTextContent('20')
    const callsBeforeSwitch = vi.mocked(apiFetch).mock.calls.length
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按订单查看' }), {
      button: 0,
      ctrlKey: false,
    })
    const orders = screen.getByRole('region', { name: '订单行领料进度' })
    expect(orders).toHaveTextContent('没有当前生效')
    expect(orders).toHaveTextContent('未下发')
    const summaries = orders.querySelectorAll('summary')
    fireEvent.click(summaries[0])
    expect(summaries[0].parentElement).toHaveTextContent('冻结的配方与重量')
    expect(vi.mocked(apiFetch).mock.calls.length).toBe(callsBeforeSwitch)
    expect(screen.getByRole('region', { name: '订单范围与需求依据' })).toBe(
      scope
    )
  })

  it('requires the explicit view action and does not read or pretend zero progress without it', () => {
    access.allowed = false
    renderProductionMaterialIssuanceActiveProgressTestWorkspace()
    expect(apiFetch).not.toHaveBeenCalled()
    expect(screen.getAllByText(/需要“生产领料/)).toHaveLength(2)
    expect(screen.queryByText('本页没有有效订单行。')).not.toBeInTheDocument()
  })

  it('keeps full-scope statistics when paging order lines and switching back to materials', async () => {
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (!String(endpoint).includes('active-order-progress'))
        return { items: [], total: 0, page: 1, pageSize: 20 }
      const fixture =
        createProductionMaterialIssuanceActiveOrderProgressTestFixture()
      const page = Number(
        new URL(String(endpoint), 'https://isolated.test').searchParams.get(
          'ordersPage'
        )
      )
      const source = fixture.orderLines[0]
      const lines = Array.from({ length: 21 }, (_, index) => ({
        ...source,
        salesOrderLineId: 101 + index,
        lineNo: index + 1,
        materials: source.materials.map((material) => ({
          ...material,
          salesOrderLineId: 101 + index,
        })),
      }))
      return {
        ...fixture,
        ordersPage: page,
        scope: {
          ...fixture.scope,
          sourceLineCount: 21,
          dispatchedLineCount: 21,
          undispatchedLineCount: 0,
          issueLineCount: 0,
          isComplete: true,
        },
        materials: [
          {
            ...fixture.materials[0],
            standardQty: 4200,
            issuedQty: 4620,
            netQty: 4620,
            remainingQty: 0,
            excessQty: 420,
            sourceLineCount: 21,
          },
        ],
        orderLines: lines.slice((page - 1) * 20, page * 20),
      }
    })
    renderProductionMaterialIssuanceActiveProgressTestWorkspace()
    await screen.findByText('1 个订单 / 21 条订单行')
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按订单查看' }), {
      button: 0,
      ctrlKey: false,
    })
    const paging = screen.getByRole('navigation', { name: '总体进度分页' })
    fireEvent.click(within(paging).getByRole('button', { name: '下一页' }))
    await screen.findByText('第 2 页 · 共 21 项')
    expect(
      screen.getByRole('region', { name: '订单范围与需求依据' })
    ).toHaveTextContent('21 条订单行')
    expect(
      screen
        .getByRole('region', { name: '订单行领料进度' })
        .querySelectorAll('details')
    ).toHaveLength(1)
    fireEvent.mouseDown(screen.getByRole('tab', { name: '按物料汇总' }), {
      button: 0,
      ctrlKey: false,
    })
    expect(
      screen.getByRole('region', { name: '物料待领汇总' })
    ).toHaveTextContent('4,200')
    expect(
      screen.getByRole('navigation', { name: '总体进度分页' })
    ).toHaveTextContent('第 1 页')
  })

  it('shows failures instead of stale totals or empty success and recovers on deliberate refresh', async () => {
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (String(endpoint).includes('active-order-progress'))
        throw new Error('unavailable')
      return { items: [], total: 0, page: 1, pageSize: 20 }
    })
    renderProductionMaterialIssuanceActiveProgressTestWorkspace('en-US')
    await screen.findByText(/Could not load overall progress/)
    expect(
      screen.queryByText(/No known material requirements/)
    ).not.toBeInTheDocument()
    vi.mocked(apiFetch).mockImplementation(async (endpoint) =>
      String(endpoint).includes('active-order-progress')
        ? createProductionMaterialIssuanceActiveOrderProgressTestFixture()
        : { items: [], total: 0, page: 1, pageSize: 20 }
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh overall progress' })
    )
    await screen.findByText('1 orders / 3 order lines')
    expect(
      screen.queryByText(/Could not load overall progress/)
    ).not.toBeInTheDocument()
    expect(document.body.textContent).not.toContain(
      'mrp.productionMaterialIssuance.'
    )
  })
})
