// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductionLineManagementPage } from './production-line-management-page'

const testState = vi.hoisted(() => ({
  lines: [] as Array<Record<string, unknown>>,
  createLineStrict: vi.fn(),
  updateLineStrict: vi.fn(),
  deleteLineStrict: vi.fn(),
  confirmApplicationAction: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    allowsAction: () => true,
    allowsPermission: () => true,
    isChecking: false,
  }),
}))

vi.mock('@/features/production-shared/hooks/use-production-lines', () => ({
  useProductionLines: () => ({
    lines: testState.lines,
    isLoading: false,
    error: null,
    createLineStrict: testState.createLineStrict,
    updateLineStrict: testState.updateLineStrict,
    deleteLineStrict: testState.deleteLineStrict,
  }),
}))

vi.mock('@/lib/application-confirm-prompt-and-alert-dialog-requests', () => ({
  requestApplicationConfirmation: testState.confirmApplicationAction,
}))

function renderProductionLineManagementPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <ProductionLineManagementPage />
    </QueryClientProvider>
  )
}

describe('production line management page', () => {
  beforeEach(() => {
    testState.lines = [
      {
        id: 'line-a',
        code: 'LINE-A',
        name: '车圈产线',
        description: '',
        version: 4,
        isActive: true,
        createdAt: '2026-11-26T00:00:00.000Z',
        updatedAt: '2026-11-26T00:00:00.000Z',
      },
    ]
    testState.createLineStrict.mockReset().mockImplementation(async (line) => ({
      ...line,
      id: 'created-line',
    }))
    testState.updateLineStrict.mockReset().mockResolvedValue(testState.lines[0])
    testState.deleteLineStrict.mockReset().mockResolvedValue(undefined)
    testState.confirmApplicationAction.mockReset().mockResolvedValue(true)
  })

  afterEach(cleanup)

  it('shows production line master data without architecture details', () => {
    renderProductionLineManagementPage()

    expect(screen.getAllByText('车圈产线')).toHaveLength(1)
    expect(screen.getByText('LINE-A')).toBeInTheDocument()
    expect(screen.queryByText(/MBOM|L1|L2|产品模板/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '删除产线：车圈产线' })
    ).toBeEnabled()
  })

  it('creates an independent line without submitting a product template', async () => {
    renderProductionLineManagementPage()
    fireEvent.click(screen.getAllByRole('button', { name: '新增产线' })[0]!)
    fireEvent.change(screen.getByLabelText('产线名称'), {
      target: { value: '碳纤维车圈产线' },
    })
    const addLineButtons = screen.getAllByRole('button', { name: '新增产线' })
    fireEvent.click(addLineButtons[addLineButtons.length - 1]!)

    await waitFor(() => expect(testState.createLineStrict).toHaveBeenCalled())
    const [createdLine] = testState.createLineStrict.mock.calls[0]
    expect(createdLine.name).toBe('碳纤维车圈产线')
    expect(createdLine.code).toMatch(/^CARBONRIMLINE-/)
    expect(createdLine).not.toHaveProperty('productTemplateId')
  })

  it('updates line metadata without submitting or deleting hidden references', async () => {
    renderProductionLineManagementPage()
    fireEvent.click(screen.getByRole('button', { name: '编辑产线：车圈产线' }))
    fireEvent.change(screen.getByLabelText('产线名称'), {
      target: { value: '碳纤维车圈产线' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() =>
      expect(testState.updateLineStrict).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'UPDATE', id: 'line-a', version: 4 })
      )
    )
    const [mutation] = testState.updateLineStrict.mock.calls[0]
    expect(mutation.delta.name.n).toBe('碳纤维车圈产线')
    expect(mutation.delta).not.toHaveProperty('productTemplateId')
    expect(mutation.delta).not.toHaveProperty('segments')
  })

  it('deletes the line whose row action was clicked', async () => {
    testState.lines = [
      ...testState.lines,
      {
        ...testState.lines[0],
        id: 'line-b',
        code: 'FORK-LINE',
        name: '前叉产线',
      },
    ]
    renderProductionLineManagementPage()

    fireEvent.click(screen.getByRole('button', { name: '删除产线：前叉产线' }))

    await waitFor(() =>
      expect(testState.confirmApplicationAction).toHaveBeenCalledWith(
        '确认删除产线“前叉产线”？'
      )
    )
    await waitFor(() =>
      expect(testState.deleteLineStrict).toHaveBeenCalledWith('line-b')
    )
  })
})
