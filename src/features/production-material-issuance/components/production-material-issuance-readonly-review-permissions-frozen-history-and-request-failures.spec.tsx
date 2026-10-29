// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { LanguageProvider } from '@/context/language-provider'
import { RequirementDrawer } from '@/features/mrp/components/requirements/requirement-drawer'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from '../testing/production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'
import { ProductionMaterialIssuanceFrozenDocumentTraceability } from './production-material-issuance-frozen-document-traceability'
import { ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow } from './production-material-issuance-source-basis-review-and-dispatch-workflow'

const access = vi.hoisted(() => ({ allowed: true }))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsAction: (permission: string) =>
      access.allowed &&
      permission === 'action_production_material_issuance_view',
  }),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))
vi.mock(
  '@/features/mrp/components/requirements/mold-requirement-alert',
  () => ({ MoldRequirementAlert: () => null })
)
vi.mock('@/features/mrp/components/requirements/requirement-list', () => ({
  RequirementList: () => null,
}))

beforeEach(() => {
  access.allowed = true
  vi.mocked(apiFetch).mockReset()
})
afterEach(cleanup)

function renderProductionMaterialIssuanceReadonlyTestSurface(
  children: ReactNode,
  locale: 'zh-CN' | 'en-US' = 'zh-CN'
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider
        defaultLocale={locale}
        storageKey='issuance-readonly-test'
      >
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
  return render(children, { wrapper: Wrapper })
}

describe('production material read-only interaction boundaries', () => {
  it('does not read data with only page access', () => {
    access.allowed = false
    const { selection } =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    renderProductionMaterialIssuanceReadonlyTestSurface(
      <>
        <ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow
          sources={[selection]}
          isAnalysisReady
        />
        <ProductionMaterialIssuanceFrozenDocumentTraceability />
      </>
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/需要“生产领料/)).toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('reviews only on a deliberate click and displays weight with the version and server recipe', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.review)
    renderProductionMaterialIssuanceReadonlyTestSurface(
      <ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow
        sources={[fixture.selection]}
        isAnalysisReady
      />
    )
    expect(apiFetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '核对生产领料依据' }))
    expect(await screen.findByText('已核对 1 条来源。')).toBeInTheDocument()
    fireEvent.click(screen.getByText('SO-HTTP / 1 · R50'))
    expect(screen.getByText('420 g · 超轻版')).toBeVisible()
    expect(screen.getByText(/标准用量: 0.5 kg.*标准需求: 50 kg/)).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /发送|确认发料/ })
    ).not.toBeInTheDocument()
    expect(apiFetch).toHaveBeenCalledOnce()
  })

  it('offers a permission-gated MRP launcher without eager reads when analysis changes', () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    const source = {
      ...fixture.basis,
      productModel: 'R50',
      totalLines: 1,
      issueCode: '' as const,
      bomCandidates: [fixture.basis.bom],
    }
    const props = {
      isOpen: true,
      onClose: vi.fn(),
      data: [],
      stats: { analyzedModels: [] },
      isLoading: false,
      selectedCount: 1,
      sourceLines: [source],
      bomSelections: [],
      onBomSelectionChange: vi.fn(),
      onRecalculate: vi.fn(),
    }
    const view = renderProductionMaterialIssuanceReadonlyTestSurface(
      <RequirementDrawer {...props} isComplete />
    )
    expect(
      screen.getByRole('button', { name: '按本次来源发起领料' })
    ).toBeDisabled()
    expect(apiFetch).not.toHaveBeenCalled()
    view.rerender(<RequirementDrawer {...props} isComplete={false} />)
    expect(
      screen.getByRole('button', { name: '按本次来源发起领料' })
    ).toBeDisabled()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('opens frozen source history in place and queries status filters without writes', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockImplementation(async (endpoint) =>
      endpoint.includes('?') ? fixture.list : fixture.detail
    )
    renderProductionMaterialIssuanceReadonlyTestSurface(
      <ProductionMaterialIssuanceFrozenDocumentTraceability />
    )
    fireEvent.click(
      await screen.findByRole('button', { name: fixture.document.documentNo })
    )
    expect(
      await screen.findByText(/以下是下发时保存的来源/)
    ).toBeInTheDocument()
    fireEvent.click(screen.getByText('SO-HTTP / 1 · R50'))
    expect(screen.getByText('420 g · 超轻版')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    vi.mocked(apiFetch).mockResolvedValueOnce({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
    fireEvent.change(screen.getByRole('combobox', { name: '按单据状态筛选' }), {
      target: { value: 'WITHDRAWN' },
    })
    expect(
      await screen.findByText('当前范围暂无正式领料单。')
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: '冻结来源与配方' })
    ).not.toBeInTheDocument()
    expect(
      vi.mocked(apiFetch).mock.calls.every(([, options]) => !options?.method)
    ).toBe(true)
    const apiFetchCalls = vi.mocked(apiFetch).mock.calls
    expect(apiFetchCalls[apiFetchCalls.length - 1]?.[0]).toContain(
      'status=WITHDRAWN&page=1'
    )
  })

  it('shows request failures instead of no documents, and allows a manual retry in English', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error('HTTP 403'))
    renderProductionMaterialIssuanceReadonlyTestSurface(
      <ProductionMaterialIssuanceFrozenDocumentTraceability />,
      'en-US'
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 403')
    expect(
      screen.queryByText('No formal issuance documents match this scope.')
    ).not.toBeInTheDocument()
    vi.mocked(apiFetch).mockResolvedValueOnce(fixture.list)
    fireEvent.click(screen.getByRole('button', { name: 'Refresh documents' }))
    expect(
      await screen.findByRole('button', { name: fixture.document.documentNo })
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
