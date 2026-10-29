// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from '../testing/production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'
import { createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture } from '../testing/production-material-issuance-warehouse-review-batch-and-movement-test-fixtures'
import { ProductionMaterialIssuanceFrozenDocumentTraceability } from './production-material-issuance-frozen-document-traceability'
import { ProductionMaterialIssuanceStartWorkflowLauncher } from './production-material-issuance-start-workflow-launcher'

const identity = vi.hoisted(() => ({
  user: { id: 'operator-1', permissions: [] as string[] },
  isIdentitySynced: true,
  isSyncing: false,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof identity) => unknown) =>
    select(identity),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search,
    ...props
  }: {
    children: ReactNode
    to: string
    search?: Record<string, string>
  }) => (
    <a
      href={`${to}${search ? `?${new URLSearchParams(search)}` : ''}`}
      {...props}
    >
      {children}
    </a>
  ),
}))

const clients: QueryClient[] = []
const fixture =
  createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
function createProductionMaterialIssuanceSourcePreparationForStartWorkflowTest() {
  return {
    sourceLines: [
      {
        ...fixture.basis,
        productModel: 'R50',
        totalLines: 1,
        issueCode: '',
        bomCandidates: [fixture.basis.bom],
      },
    ],
    issues: [],
    isReady: true,
    warehouseCategoryCode: 'MATERIAL',
  }
}
function createProductionMaterialIssuanceSourceOptionsForStartWorkflowTest() {
  return {
    items: [
      { ...fixture.basis, status: 'Pending', documentId: '', documentNo: '' },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    search: '',
  }
}
function renderProductionMaterialIssuanceStartWorkflowTestSurface(
  children: ReactNode
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  return render(
    <QueryClientProvider client={client}>
      <LanguageProvider
        storageKey='issuance-start-workflow-test'
        defaultLocale='zh-CN'
      >
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}
beforeEach(() => {
  identity.user.id = 'operator-1'
  identity.isIdentitySynced = true
  identity.user.permissions = [
    'tab_mrp_production_material_issuance',
    'action_production_material_issuance_view',
    'action_production_material_issuance_dispatch',
    'menu_warehouse',
  ]
  vi.mocked(apiFetch)
    .mockReset()
    .mockImplementation(async (endpoint) => {
      if (endpoint.includes('/source-options'))
        return createProductionMaterialIssuanceSourceOptionsForStartWorkflowTest()
      if (endpoint.endsWith('/source-preparation'))
        return createProductionMaterialIssuanceSourcePreparationForStartWorkflowTest()
      if (endpoint.endsWith('/source-review')) return fixture.review
      return fixture.detail
    })
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
})

describe('production issuance start workflow', () => {
  it('does not read business sources before opening or without explicit dispatch access', () => {
    const view = renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher />
    )
    expect(screen.getByRole('button', { name: '发起领料' })).toBeEnabled()
    expect(apiFetch).not.toHaveBeenCalled()
    view.unmount()
    identity.user.permissions = [
      'tab_mrp_production_material_issuance',
      'action_production_material_issuance_view',
    ]
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher startRequested />
    )
    expect(screen.getByRole('button', { name: '发起领料' })).toBeDisabled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })
  it('selects sources without sales access and explicitly dispatches before linking the exact warehouse document', async () => {
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher />
    )
    fireEvent.click(screen.getByRole('button', { name: '发起领料' }))
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'SO-HTTP / 1 · R50' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '2. 核对 BOM 与领料前提' })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '核对生产领料依据' })
    )
    const dispatch = await screen.findByRole('button', {
      name: '确认下发领料单',
    })
    expect(dispatch).toBeDisabled()
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: '我已核对上述全部订单行、采用 BOM 与成品重量',
      })
    )
    fireEvent.click(dispatch)
    const link = await screen.findByRole('link', { name: '去仓库办理领料' })
    expect(link).toHaveAttribute(
      'href',
      `/warehouse/production-material-handovers?documentId=${fixture.document.id}`
    )
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(
          ([endpoint]) =>
            endpoint.startsWith('/sales-orders') ||
            endpoint.startsWith('/mrp/requirements')
        )
    ).toBe(false)
    const calls = vi
      .mocked(apiFetch)
      .mock.calls.filter(([endpoint]) => endpoint.endsWith('/dispatch'))
    expect(calls).toHaveLength(1)
    expect(JSON.parse(String(calls[0][1]?.body)).sources).toEqual([
      {
        ...fixture.selection,
        expectedOrderVersion: 4,
        expectedBomVersion: 3,
        basisFingerprint: fixture.basis.basisFingerprint,
      },
    ])
    expect(screen.getByText(/领料单已下发/)).toBeInTheDocument()
  })
  it('shows missing weight prerequisites before exposing formal review or dispatch', async () => {
    vi.mocked(apiFetch).mockImplementation(async (endpoint) =>
      endpoint.includes('/source-options')
        ? createProductionMaterialIssuanceSourceOptionsForStartWorkflowTest()
        : {
            ...createProductionMaterialIssuanceSourcePreparationForStartWorkflowTest(),
            isReady: false,
            issues: [
              { salesOrderLineId: 101, code: 'INVALID_FINISHED_WEIGHT' },
            ],
          }
    )
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher startRequested />
    )
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'SO-HTTP / 1 · R50' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '2. 核对 BOM 与领料前提' })
    )
    expect(
      await screen.findByRole('region', { name: '请先补齐以下领料前提' })
    ).toHaveTextContent('大于 0 的成品重量')
    expect(
      screen.queryByRole('button', { name: '核对生产领料依据' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '确认下发领料单' })
    ).not.toBeInTheDocument()
  })
  it('ignores a late preparation after removing its selected source', async () => {
    let finishPreparation: ((value: unknown) => void) | undefined
    vi.mocked(apiFetch).mockImplementation(async (endpoint) =>
      endpoint.includes('/source-options')
        ? createProductionMaterialIssuanceSourceOptionsForStartWorkflowTest()
        : new Promise((resolve) => {
            finishPreparation = resolve
          })
    )
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher startRequested />
    )
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'SO-HTTP / 1 · R50' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '2. 核对 BOM 与领料前提' })
    )
    await waitFor(() => expect(finishPreparation).toBeDefined())
    fireEvent.click(
      screen.getByRole('button', { name: '移除 SO-HTTP 第 1 行' })
    )
    await act(async () =>
      finishPreparation?.(
        createProductionMaterialIssuanceSourcePreparationForStartWorkflowTest()
      )
    )
    expect(
      screen.queryByRole('button', { name: '核对生产领料依据' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '2. 核对 BOM 与领料前提' })
    ).toBeDisabled()
  })
  it('discards an in-flight formal review when its selected sources change', async () => {
    let finishReview: ((value: unknown) => void) | undefined
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (endpoint.includes('/source-options'))
        return createProductionMaterialIssuanceSourceOptionsForStartWorkflowTest()
      if (endpoint.endsWith('/source-preparation'))
        return createProductionMaterialIssuanceSourcePreparationForStartWorkflowTest()
      return new Promise((resolve) => {
        finishReview = resolve
      })
    })
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher startRequested />
    )
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'SO-HTTP / 1 · R50' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '2. 核对 BOM 与领料前提' })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '核对生产领料依据' })
    )
    await waitFor(() => expect(finishReview).toBeDefined())
    fireEvent.click(
      screen.getByRole('button', { name: '移除 SO-HTTP 第 1 行' })
    )
    await act(async () => finishReview?.(fixture.review))
    expect(
      screen.queryByRole('button', { name: '确认下发领料单' })
    ).not.toBeInTheDocument()
    expect(screen.queryByText('已核对 1 条来源。')).not.toBeInTheDocument()
  })
  it('invalidates a reviewed basis immediately when the selected BOM changes', async () => {
    const alternativeBom = {
      ...fixture.basis.bom,
      id: '12345678-1234-4234-8234-123456789abc',
      bomNo: 'MBOM-SECOND',
    }
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (endpoint.includes('/source-options'))
        return createProductionMaterialIssuanceSourceOptionsForStartWorkflowTest()
      if (endpoint.endsWith('/source-preparation')) {
        const prepared =
          createProductionMaterialIssuanceSourcePreparationForStartWorkflowTest()
        prepared.sourceLines[0].bomCandidates.push(alternativeBom)
        return prepared
      }
      return fixture.review
    })
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceStartWorkflowLauncher startRequested />
    )
    fireEvent.click(
      await screen.findByRole('checkbox', { name: 'SO-HTTP / 1 · R50' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: '2. 核对 BOM 与领料前提' })
    )
    fireEvent.click(
      await screen.findByRole('button', { name: '核对生产领料依据' })
    )
    await screen.findByRole('button', { name: '确认下发领料单' })
    fireEvent.click(screen.getByText('查看 1 条订单行的配方依据'))
    fireEvent.change(
      screen.getByLabelText('SO-HTTP / 1 · R50', { selector: 'select' }),
      {
        target: { value: alternativeBom.id },
      }
    )
    expect(
      screen.queryByRole('button', { name: '确认下发领料单' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '核对生产领料依据' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        '来源或 BOM 选择已变化，请重新核对前提，再核对正式领料依据。'
      )
    ).toBeInTheDocument()
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.filter(([endpoint]) => endpoint.endsWith('/dispatch'))
    ).toHaveLength(0)
  })
  it('opens a deep-linked original document and warehouse handling without a second expansion click', async () => {
    const warehouse =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    vi.mocked(apiFetch).mockImplementation(async (endpoint) =>
      endpoint.includes('warehouse-review')
        ? warehouse.review
        : endpoint.includes('?')
          ? fixture.list
          : fixture.detail
    )
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceFrozenDocumentTraceability
        initialDocumentId={fixture.document.id}
        allowWithdrawalCommands={false}
      />
    )
    expect(
      await screen.findByRole('button', { name: '展开仓库领退与单据进度' })
    ).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() =>
      expect(
        vi
          .mocked(apiFetch)
          .mock.calls.some(([endpoint]) =>
            endpoint.endsWith('/warehouse-review')
          )
      ).toBe(true)
    )
  })
  it('shows warehouse prerequisites before offering quantity inputs', async () => {
    const warehouse =
      createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
    identity.user.permissions.push(
      'action_production_material_issuance_warehouse_issue'
    )
    vi.mocked(apiFetch).mockImplementation(async (endpoint) =>
      endpoint.includes('warehouse-review')
        ? {
            ...warehouse.review,
            warehouseActionBlockers: {
              issue: '供料仓库未启用',
              supplement: '供料仓库未启用',
              return: '待耗用去向未启用',
            },
          }
        : endpoint.includes('?')
          ? fixture.list
          : fixture.detail
    )
    renderProductionMaterialIssuanceStartWorkflowTestSurface(
      <ProductionMaterialIssuanceFrozenDocumentTraceability
        initialDocumentId={fixture.document.id}
        allowWithdrawalCommands={false}
      />
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '仓库办理前提尚未齐全'
    )
    expect(
      screen.queryByRole('combobox', { name: '原单物料' })
    ).not.toBeInTheDocument()
  })
})
