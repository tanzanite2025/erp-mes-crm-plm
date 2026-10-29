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
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '@/lib/api-client'
import { createApiClientError } from '@/lib/api-error'
import { LanguageProvider } from '@/context/language-provider'
import { createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture } from '@/features/production-material-issuance/testing/production-material-issuance-warehouse-review-batch-and-movement-test-fixtures'
import { ProductionMaterialHandoversOperationGuidePage } from './production-material-handovers-operation-guide-page'

const warehouseGuideIdentity = vi.hoisted(() => ({
  user: { id: 'warehouse-1', permissions: [] as string[] },
  isIdentitySynced: true,
  isSyncing: false,
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: typeof warehouseGuideIdentity) => unknown) =>
    select(warehouseGuideIdentity),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: { children: ReactNode; to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: vi.fn() }))

const guideQueryClients: QueryClient[] = []
let guideFixture =
  createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()

beforeEach(() => {
  warehouseGuideIdentity.user = {
    id: 'warehouse-1',
    permissions: [
      'menu_warehouse',
      'action_production_material_issuance_view',
      'action_production_material_issuance_warehouse_issue',
      'action_production_material_issuance_warehouse_supplement',
      'action_production_material_issuance_warehouse_return',
    ],
  }
  guideFixture =
    createProductionMaterialIssuanceWarehouseReviewBatchAndMovementTestFixture()
  vi.mocked(apiFetch).mockReset()
  vi.mocked(apiFetch).mockImplementation(async (endpoint) => {
    const path = String(endpoint)
    if (path.includes('/documents?')) return guideFixture.list
    if (path.endsWith('/warehouse-review')) return guideFixture.review
    if (path.endsWith('/material-batches')) return guideFixture.batches
    if (path.endsWith('/ordinary-allocation-suggestion'))
      return guideFixture.suggestion
    if (path.endsWith(`/${guideFixture.document.id}`))
      return guideFixture.detail
    throw new Error(`Unexpected guide request: ${path}`)
  })
})
afterEach(() => {
  cleanup()
  guideQueryClients.splice(0).forEach((client) => client.clear())
})

function renderWarehouseProductionHandoversGuideWithBusinessQueries() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  guideQueryClients.push(client)
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <LanguageProvider storageKey='production-handovers-direct-step-test-locale'>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
  return render(<ProductionMaterialHandoversOperationGuidePage />, { wrapper })
}

function selectWarehouseProductionHandoversGuideChapter(name: string) {
  fireEvent.mouseDown(screen.getByRole('tab', { name }), {
    button: 0,
    ctrlKey: false,
  })
}

async function selectOriginalDocumentInProductionHandoversGuideDialog() {
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(
    await within(dialog).findByRole('button', {
      name: guideFixture.document.documentNo,
    })
  )
  await within(dialog).findByText(
    `原单版本 ${guideFixture.review.document.version}`,
    { exact: false }
  )
  return dialog
}

function closeProductionHandoversGuideDialog() {
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
}

async function fillProductionHandoversGuideIssueForm(dialog: HTMLElement) {
  fireEvent.change(
    await within(dialog).findByRole('combobox', { name: '原单物料' }),
    { target: { value: guideFixture.materialId } }
  )
  await within(dialog).findByRole('option', { name: /batch-A.*可领 70 kg/ })
  fireEvent.change(
    within(dialog).getByRole('combobox', { name: '生产物料仓库批次' }),
    { target: { value: guideFixture.batches.items[0].inventoryId } }
  )
  fireEvent.change(
    within(dialog).getByRole('spinbutton', { name: '本次数量（kg）' }),
    { target: { value: '10' } }
  )
  fireEvent.click(
    within(dialog).getByRole('button', { name: '按原单生成分配建议' })
  )
  await within(dialog).findByRole('spinbutton', { name: /本次分配数量/ })
  fireEvent.click(within(dialog).getByRole('checkbox'))
}

describe('production handover guide direct step dialogs', () => {
  it('reuses the existing issuance-start dialog only after a production-authorized reader opens it', async () => {
    warehouseGuideIdentity.user.permissions.push(
      'tab_mrp_production_material_issuance',
      'action_production_material_issuance_dispatch'
    )
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).includes('/source-options')) {
        return { items: [], total: 0, page: 1, pageSize: 20, search: '' }
      }
      return originalApiQuery(endpoint, options)
    })
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    expect(apiFetch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '发起领料' }))
    const dialog = await screen.findByRole('dialog', { name: '发起生产领料' })
    expect(
      await within(dialog).findByText(/当前搜索范围没有有效订单行/)
    ).toBeInTheDocument()
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(([path]) => String(path).includes('/source-options'))
    ).toBe(true)
  })

  it('loads no business data while reading and remembers the original across review and action dialogs', async () => {
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    expect(apiFetch).not.toHaveBeenCalled()
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    expect(
      within(dialog).queryByRole('combobox', { name: '办理类型' })
    ).not.toBeInTheDocument()
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(([path]) => String(path).endsWith('/material-batches'))
    ).toBe(false)
    closeProductionHandoversGuideDialog()
    selectWarehouseProductionHandoversGuideChapter('补料')
    const reading = screen.getByRole('region', { name: '生产领退指南正文' })
    reading.scrollTop = 160
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单补料弹窗' })[0]
    )
    const supplement = await screen.findByRole('dialog', {
      name: '按指南办理补料',
    })
    expect(
      await within(supplement).findByRole('combobox', { name: '办理类型' })
    ).toHaveValue('supplement')
    expect(
      within(supplement)
        .getByRole('combobox', { name: '办理类型' })
        .querySelectorAll('option')
    ).toHaveLength(1)
    expect(
      within(supplement).queryByRole('button', { name: '撤回领料单' })
    ).not.toBeInTheDocument()
    closeProductionHandoversGuideDialog()
    expect(reading.scrollTop).toBe(160)
    expect(screen.getByRole('tab', { name: '补料' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('requires the action permission while allowing an authorized viewer to inspect records', async () => {
    warehouseGuideIdentity.user.permissions = [
      'menu_warehouse',
      'action_production_material_issuance_view',
    ]
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('分批发料')
    expect(
      screen.queryByRole('button', { name: '打开原单发料弹窗' })
    ).not.toBeInTheDocument()
    expect(apiFetch).not.toHaveBeenCalled()
    selectWarehouseProductionHandoversGuideChapter('进度与对账')
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    expect(within(dialog).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: '确认本次发料' })
    ).not.toBeInTheDocument()
  })

  it('uses the same explicit issue request after timeout, close and reopen from the supplement chapter', async () => {
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    const requests: string[] = []
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).endsWith('/issue')) {
        requests.push(String(options?.body))
        if (requests.length === 1) throw new Error('Guide response lost')
        return guideFixture.result
      }
      return originalApiQuery(endpoint, options)
    })
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('分批发料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单发料弹窗' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    await fillProductionHandoversGuideIssueForm(dialog)
    expect(requests).toHaveLength(0)
    fireEvent.click(
      within(dialog).getByRole('button', { name: '确认本次发料' })
    )
    await within(dialog).findByText('Guide response lost')
    expect(requests).toHaveLength(1)
    closeProductionHandoversGuideDialog()
    selectWarehouseProductionHandoversGuideChapter('补料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单补料弹窗' })[0]
    )
    const retry = await screen.findByRole('dialog')
    const retryButton = await within(retry).findByRole('button', {
      name: '按原请求重试',
    })
    expect(
      within(retry).queryByRole('button', { name: '确认本次补料' })
    ).not.toBeInTheDocument()
    fireEvent.click(retryButton)
    await within(retry).findByText('仓库已确认，原单更新至版本 2。')
    expect(requests).toHaveLength(2)
    expect(requests[1]).toBe(requests[0])
  })

  it('returns against the original allocation without requesting selectable stock batches', async () => {
    guideFixture.review = guideFixture.issuedReview
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('原单退料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单退料弹窗' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    fireEvent.change(
      within(dialog).getByRole('combobox', { name: '原单物料' }),
      { target: { value: guideFixture.materialId } }
    )
    expect(
      within(dialog).getByRole('combobox', { name: '办理类型' })
    ).toHaveValue('return')
    expect(
      await within(dialog).findByRole('option', { name: /batch-A.*可退 10 kg/ })
    ).toBeInTheDocument()
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.some(([path]) => String(path).endsWith('/material-batches'))
    ).toBe(false)
  })

  it('does not restore an explicitly rejected request after rechecking and reopening the dialog', async () => {
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    const requests: string[] = []
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).endsWith('/issue')) {
        requests.push(String(options?.body))
        throw createApiClientError({
          kind: 'http',
          status: 409,
          message: 'Original document version changed',
        })
      }
      return originalApiQuery(endpoint, options)
    })
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('分批发料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单发料弹窗' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    await fillProductionHandoversGuideIssueForm(dialog)
    fireEvent.click(
      within(dialog).getByRole('button', { name: '确认本次发料' })
    )
    fireEvent.click(
      await within(dialog).findByRole('button', {
        name: '重新核对后办理下一次',
      })
    )
    await within(dialog).findByRole('combobox', { name: '办理类型' })
    closeProductionHandoversGuideDialog()
    selectWarehouseProductionHandoversGuideChapter('补料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单补料弹窗' })[0]
    )
    const reopenedDialog = await screen.findByRole('dialog')
    expect(
      await within(reopenedDialog).findByRole('combobox', { name: '办理类型' })
    ).toHaveValue('supplement')
    expect(
      within(reopenedDialog).queryByRole('button', { name: '按原请求重试' })
    ).not.toBeInTheDocument()
    expect(requests).toHaveLength(1)
  })

  it('keeps an in-flight request locked across closing and reopening without submitting twice', async () => {
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    let rejectPendingWarehouseRequest: (error: Error) => void = () => {
      throw new Error('Warehouse request has not started')
    }
    const requests: string[] = []
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).endsWith('/issue')) {
        requests.push(String(options?.body))
        return new Promise((_, reject) => {
          rejectPendingWarehouseRequest = reject
        })
      }
      return originalApiQuery(endpoint, options)
    })
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('分批发料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单发料弹窗' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    await fillProductionHandoversGuideIssueForm(dialog)
    fireEvent.click(
      within(dialog).getByRole('button', { name: '确认本次发料' })
    )
    await waitFor(() => expect(requests).toHaveLength(1))
    closeProductionHandoversGuideDialog()
    selectWarehouseProductionHandoversGuideChapter('补料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单补料弹窗' })[0]
    )
    const reopenedDialog = await screen.findByRole('dialog')
    const submittingButton = await within(reopenedDialog).findByRole('button', {
      name: '正在提交，请稍候…',
    })
    expect(submittingButton).toBeDisabled()
    fireEvent.click(submittingButton)
    expect(
      within(reopenedDialog).queryByRole('combobox', { name: '办理类型' })
    ).not.toBeInTheDocument()
    expect(requests).toHaveLength(1)
    await act(async () => {
      rejectPendingWarehouseRequest(new Error('Pending warehouse result lost'))
    })
    expect(
      await within(reopenedDialog).findByRole('button', {
        name: '按原请求重试',
      })
    ).toBeEnabled()
  })

  it("does not show another account's cached document list while its own list is loading", async () => {
    const surface = renderWarehouseProductionHandoversGuideWithBusinessQueries()
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    await selectOriginalDocumentInProductionHandoversGuideDialog()
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    let resolveNextAccountDocumentList: (
      value: typeof guideFixture.list
    ) => void = () => {
      throw new Error('Next account document list has not started')
    }
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).includes('/documents?'))
        return new Promise((resolve) => {
          resolveNextAccountDocumentList = resolve
        })
      return originalApiQuery(endpoint, options)
    })
    warehouseGuideIdentity.user = {
      ...warehouseGuideIdentity.user,
      id: 'warehouse-2',
    }
    surface.rerender(<ProductionMaterialHandoversOperationGuidePage />)
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    const dialog = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(
        vi
          .mocked(apiFetch)
          .mock.calls.filter(([endpoint]) =>
            String(endpoint).includes('/documents?')
          )
      ).toHaveLength(2)
    )
    expect(
      within(dialog).queryByRole('button', {
        name: guideFixture.document.documentNo,
      })
    ).not.toBeInTheDocument()
    await act(async () => {
      resolveNextAccountDocumentList({
        ...guideFixture.list,
        items: [],
        total: 0,
      })
    })
    expect(
      within(dialog).queryByRole('button', {
        name: guideFixture.document.documentNo,
      })
    ).not.toBeInTheDocument()
  })

  it('offers history checks without starting a new handover in the recovery dialog', async () => {
    renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('异常与重试')
    fireEvent.click(
      screen.getAllByRole('button', { name: '核对记录与恢复原请求' })[0]
    )
    const dialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    expect(
      await within(dialog).findByText(/当前会话没有待恢复的交接请求/)
    ).toBeInTheDocument()
    expect(
      within(dialog).queryByRole('combobox', { name: '办理类型' })
    ).not.toBeInTheDocument()
    expect(
      within(dialog).queryByRole('button', { name: '确认本次发料' })
    ).not.toBeInTheDocument()
  })

  it('keeps review read-only and disables recovery retry when the original action permission is revoked', async () => {
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    let writes = 0
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).endsWith('/issue')) {
        writes++
        throw new Error('Warehouse confirmation result is unknown')
      }
      return originalApiQuery(endpoint, options)
    })
    const surface = renderWarehouseProductionHandoversGuideWithBusinessQueries()
    selectWarehouseProductionHandoversGuideChapter('分批发料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单发料弹窗' })[0]
    )
    const issueDialog =
      await selectOriginalDocumentInProductionHandoversGuideDialog()
    await fillProductionHandoversGuideIssueForm(issueDialog)
    fireEvent.click(
      within(issueDialog).getByRole('button', { name: '确认本次发料' })
    )
    await within(issueDialog).findByText(
      'Warehouse confirmation result is unknown'
    )
    closeProductionHandoversGuideDialog()
    selectWarehouseProductionHandoversGuideChapter('进度与对账')
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    const reviewDialog = await screen.findByRole('dialog')
    await within(reviewDialog).findByText('原单版本 1', { exact: false })
    expect(
      within(reviewDialog).queryByRole('button', { name: '按原请求重试' })
    ).not.toBeInTheDocument()
    closeProductionHandoversGuideDialog()
    selectWarehouseProductionHandoversGuideChapter('异常与重试')
    fireEvent.click(
      screen.getAllByRole('button', { name: '核对记录与恢复原请求' })[0]
    )
    const recoveryDialog = await screen.findByRole('dialog')
    const retryButton = await within(recoveryDialog).findByRole('button', {
      name: '按原请求重试',
    })
    expect(retryButton).toBeEnabled()
    warehouseGuideIdentity.user = {
      ...warehouseGuideIdentity.user,
      permissions: warehouseGuideIdentity.user.permissions.filter(
        (permission) =>
          permission !== 'action_production_material_issuance_warehouse_issue'
      ),
    }
    surface.rerender(<ProductionMaterialHandoversOperationGuidePage />)
    expect(retryButton).toBeDisabled()
    fireEvent.click(retryButton)
    expect(writes).toBe(1)
    expect(
      within(recoveryDialog).queryByRole('combobox', { name: '办理类型' })
    ).not.toBeInTheDocument()
  })

  it("does not mount warehouse commands from another account's cached detail when the current detail read fails", async () => {
    const surface = renderWarehouseProductionHandoversGuideWithBusinessQueries()
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    await selectOriginalDocumentInProductionHandoversGuideDialog()
    const originalApiQuery = vi.mocked(apiFetch).getMockImplementation()!
    vi.mocked(apiFetch).mockImplementation(async (endpoint, options) => {
      if (String(endpoint).endsWith(`/${guideFixture.document.id}`))
        throw createApiClientError({
          kind: 'http',
          status: 403,
          message: 'Current account cannot read this document',
        })
      return originalApiQuery(endpoint, options)
    })
    warehouseGuideIdentity.user = {
      ...warehouseGuideIdentity.user,
      id: 'warehouse-2',
    }
    surface.rerender(<ProductionMaterialHandoversOperationGuidePage />)
    selectWarehouseProductionHandoversGuideChapter('分批发料')
    fireEvent.click(
      screen.getAllByRole('button', { name: '打开原单发料弹窗' })[0]
    )
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(
      await within(dialog).findByRole('button', {
        name: guideFixture.document.documentNo,
      })
    )
    await within(dialog).findByText(/Current account cannot read this document/)
    expect(
      within(dialog).queryByRole('combobox', { name: '办理类型' })
    ).not.toBeInTheDocument()
    expect(
      vi
        .mocked(apiFetch)
        .mock.calls.filter(([endpoint]) =>
          String(endpoint).endsWith('/warehouse-review')
        )
    ).toHaveLength(1)
  })

  it('closes the old dialog and resets selected document when the signed-in account changes', async () => {
    const surface = renderWarehouseProductionHandoversGuideWithBusinessQueries()
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    await selectOriginalDocumentInProductionHandoversGuideDialog()
    warehouseGuideIdentity.user = {
      ...warehouseGuideIdentity.user,
      id: 'warehouse-2',
    }
    surface.rerender(<ProductionMaterialHandoversOperationGuidePage />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getAllByRole('button', { name: '选择原单并核对记录' })[0]
    )
    const dialog = await screen.findByRole('dialog')
    await waitFor(() =>
      expect(
        within(dialog).getByRole('button', {
          name: guideFixture.document.documentNo,
        })
      ).toHaveAttribute('aria-expanded', 'false')
    )
    expect(
      within(dialog).queryByText('原单版本 1', { exact: false })
    ).not.toBeInTheDocument()
  })
})
