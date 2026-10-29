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
import { createApiClientError } from '@/lib/api-error'
import { LanguageProvider } from '@/context/language-provider'
import { createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture } from '../testing/production-material-issuance-reviewed-source-and-frozen-document-test-fixtures'
import { ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel } from './production-material-issuance-frozen-document-versioned-withdrawal-command-panel'
import { ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel } from './production-material-issuance-reviewed-basis-explicit-dispatch-command-panel'
import { ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow } from './production-material-issuance-source-basis-review-and-dispatch-workflow'

const identity = vi.hoisted(() => ({
  actorId: 'operator-1',
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
  identity.actorId = 'operator-1'
  identity.permissions = [
    'action_production_material_issuance_view',
    'action_production_material_issuance_dispatch',
    'action_production_material_issuance_withdraw',
  ]
  vi.mocked(apiFetch).mockReset()
})
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  onlineManager.setOnline(true)
})

function renderProductionMaterialIssuanceExplicitCommandTestSurface(
  children: ReactNode,
  client = new QueryClient()
) {
  clients.push(client)
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider storageKey='issuance-command-test-language'>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
  return { ...render(children, { wrapper: Wrapper }), client }
}

describe('production material explicit command interaction', () => {
  it('never mounts command controls or requests with only the view permission', () => {
    identity.permissions = ['action_production_material_issuance_view']
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <>
        <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
          sources={[fixture.basis]}
        />
        <ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel
          document={fixture.document}
        />
      </>
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('requires completed review and explicit scope confirmation, then displays the formal result in place', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(fixture.review)
      .mockResolvedValue(fixture.detail)
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceSourceBasisReviewAndDispatchWorkflow
        sources={[fixture.selection]}
        isAnalysisReady
      />
    )
    expect(
      screen.queryByRole('button', { name: '确认下发领料单' })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '核对生产领料依据' }))
    expect(
      await screen.findByRole('button', { name: '确认下发领料单' })
    ).toBeDisabled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认下发领料单' }))
    await waitFor(() =>
      expect(screen.getByText(/领料单已下发：/)).toHaveTextContent(
        fixture.document.documentNo
      )
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const dispatchBody = JSON.parse(
      String(vi.mocked(apiFetch).mock.calls[1][1]?.body)
    )
    expect(dispatchBody).toEqual({
      commandId: expect.any(String),
      sources: [
        {
          ...fixture.selection,
          expectedOrderVersion: 4,
          expectedBomVersion: 3,
          basisFingerprint: fixture.basis.basisFingerprint,
        },
      ],
    })
    expect(apiFetch).toHaveBeenCalledTimes(3)
    expect(vi.mocked(apiFetch).mock.calls[2][0]).toBe(
      `/mrp/production-material-issuance/documents/${fixture.document.id}`
    )
  })

  it('restores the original request after a timeout and component remount, and never changes its command key', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new Error('network result unknown')
    )
    const first = renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认下发领料单' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '操作结果尚未确认'
    )
    const originalBody = vi.mocked(apiFetch).mock.calls[0][1]?.body
    first.unmount()
    vi.mocked(apiFetch).mockResolvedValue(fixture.detail)
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />,
      first.client
    )
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(apiFetch).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '按原请求重试' }))
    await screen.findByText(/领料单已下发：/)
    expect(vi.mocked(apiFetch).mock.calls[1][1]?.body).toBe(originalBody)
  })

  it('blocks double submission and does not queue an automatic offline replay', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    let finish: (value: unknown) => void = () => {
      throw new Error('Missing pending command')
    }
    vi.mocked(apiFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    onlineManager.setOnline(false)
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    const submit = screen.getByRole('button', { name: '确认下发领料单' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce())
    act(() => onlineManager.setOnline(true))
    expect(apiFetch).toHaveBeenCalledOnce()
    await act(async () => {
      finish(fixture.detail)
    })
    await screen.findByText(/领料单已下发：/)
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.filter(([, options]) => options?.method === 'POST')
    ).toHaveLength(1)
  })

  it('shows a withdrawn original on dispatch replay without claiming a new dispatch', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.withdrawnDetail)
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认下发领料单' }))
    expect(
      await screen.findByText(/原单已经撤回，未建立新单/)
    ).toHaveTextContent(fixture.document.documentNo)
    expect(screen.queryByText(/领料单已下发：/)).not.toBeInTheDocument()
  })

  it('updates the dispatch result when withdrawal changes the original document', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    let currentDetail: typeof fixture.detail | typeof fixture.withdrawnDetail =
      fixture.detail
    vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
      if (String(endpoint).endsWith('/withdraw')) {
        currentDetail = fixture.withdrawnDetail
      }
      return currentDetail
    })
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <>
        <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
          sources={[fixture.basis]}
        />
        <ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel
          document={fixture.document}
        />
      </>
    )
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认下发领料单' }))
    await screen.findByText(/领料单已下发：/)
    fireEvent.click(screen.getByRole('button', { name: '撤回领料单' }))
    fireEvent.change(screen.getByRole('textbox', { name: '撤回原因' }), {
      target: { value: '重新核对重量' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认撤回整张领料单' }))
    await screen.findByText('领料单已撤回，原单历史已保留。')
    expect(
      await screen.findByText(/原单已经撤回，未建立新单/)
    ).toHaveTextContent(fixture.document.documentNo)
    expect(screen.queryByText(/领料单已下发：/)).not.toBeInTheDocument()
  })

  it('requires a valid withdrawal reason and sends the viewed document version', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockResolvedValue(fixture.withdrawnDetail)
    renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel
        document={fixture.document}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '撤回领料单' }))
    expect(
      screen.getByRole('button', { name: '确认撤回整张领料单' })
    ).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: '撤回原因' }), {
      target: { value: '重'.repeat(667) },
    })
    expect(
      screen.getByRole('button', { name: '确认撤回整张领料单' })
    ).toBeDisabled()
    fireEvent.change(screen.getByRole('textbox', { name: '撤回原因' }), {
      target: { value: ' 重新核对重量 ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '确认撤回整张领料单' }))
    await screen.findByText('领料单已撤回，原单历史已保留。')
    expect(apiFetch).toHaveBeenCalledWith(
      `/mrp/production-material-issuance/documents/${fixture.document.id}/withdraw`,
      { method: 'POST', body: expect.any(String) }
    )
    expect(
      JSON.parse(String(vi.mocked(apiFetch).mock.calls[0][1]?.body))
    ).toEqual({
      commandId: expect.any(String),
      expectedVersion: 1,
      reason: '重新核对重量',
    })
  })

  it('distinguishes an explicit rejection and hides withdrawal after execution facts', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    vi.mocked(apiFetch).mockRejectedValue(
      createApiClientError({
        kind: 'http',
        status: 409,
        code: 'PRODUCTION_MATERIAL_ISSUANCE_BASIS_CHANGED',
        message: '依据已变化',
      })
    )
    const view = renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认下发领料单' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('本次操作未通过')
    expect(screen.queryByText(/操作结果尚未确认/)).not.toBeInTheDocument()
    view.rerender(
      <ProductionMaterialIssuanceFrozenDocumentVersionedWithdrawalCommandPanel
        document={{
          ...fixture.document,
          warehouseExecutionAt: '2026-10-27T04:00:00Z',
        }}
      />
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('does not attach a previous request or result to another scope or actor', async () => {
    const fixture =
      createProductionMaterialIssuanceReviewedSourceAndFrozenDocumentTestFixture()
    let finish: (value: unknown) => void = () => {
      throw new Error('Missing pending command')
    }
    vi.mocked(apiFetch).mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve
        })
    )
    const view = renderProductionMaterialIssuanceExplicitCommandTestSurface(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />
    )
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: '确认下发领料单' }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalledOnce())
    const otherBasis = {
      ...fixture.basis,
      salesOrderLineId: 102,
      basisFingerprint: 'b'.repeat(64),
    }
    view.rerender(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[otherBasis]}
      />
    )
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    await act(async () => {
      finish(fixture.detail)
    })
    expect(screen.queryByText(/领料单已下发：/)).not.toBeInTheDocument()
    identity.actorId = 'operator-2'
    view.rerender(
      <ProductionMaterialIssuanceReviewedBasisExplicitDispatchCommandPanel
        sources={[fixture.basis]}
      />
    )
    expect(screen.getByRole('checkbox')).not.toBeChecked()
    expect(
      screen.getByRole('button', { name: '确认下发领料单' })
    ).toBeDisabled()
    expect(apiFetch).toHaveBeenCalledOnce()
  })
})
