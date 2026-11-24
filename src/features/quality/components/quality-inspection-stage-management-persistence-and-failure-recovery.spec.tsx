// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type {
  QualityInspectionStage,
  QualityInspectionStageSaveInput,
} from '../services/quality-inspection-stage-catalog-service'
import { QualityInspectionStageManagementDialog } from './quality-inspection-stage-management-dialog'

const stageCatalogMocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  handleError: vi.fn(),
  canManage: true,
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: stageCatalogMocks.handleError,
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    isChecking: false,
    allowsAction: () => stageCatalogMocks.canManage,
  }),
}))
vi.mock('../services/quality-inspection-stage-catalog-service', () => ({
  listQualityInspectionStages: stageCatalogMocks.list,
  saveQualityInspectionStage: stageCatalogMocks.save,
}))

const originalInspectionStage: QualityInspectionStage = {
  id: 'inner-stage',
  code: 'QUALITY_FORMING_INSPECTION_STATION',
  name: '成型检验站',
  description: '',
  sortOrder: 10,
  active: true,
  version: 1,
}

function renderQualityInspectionStageManagementDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <QualityInspectionStageManagementDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>
  )
  return queryClient
}

describe('quality inspection stage catalog management', () => {
  beforeAll(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class QualityInspectionStageTestResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  )
  afterAll(() => vi.unstubAllGlobals())
  afterEach(() => {
    cleanup()
    stageCatalogMocks.canManage = true
    stageCatalogMocks.list.mockReset()
    stageCatalogMocks.save.mockReset()
  })

  it('persists a renamed and disabled stage with its version, then refreshes the catalog', async () => {
    let persistedStage = { ...originalInspectionStage }
    stageCatalogMocks.list.mockImplementation(async () => [persistedStage])
    stageCatalogMocks.save.mockImplementation(
      async (id: string, input: QualityInspectionStageSaveInput) => {
        expect(id).toBe(originalInspectionStage.id)
        expect(input.version).toBe(1)
        persistedStage = { ...persistedStage, ...input, version: 2 }
        return persistedStage
      }
    )
    renderQualityInspectionStageManagementDialog()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'quality.standards.inspectionStages.edit 成型检验站',
      })
    )
    fireEvent.change(
      screen.getByLabelText('quality.standards.inspectionStages.name'),
      { target: { value: '成型复检站' } }
    )
    fireEvent.change(
      screen.getByLabelText('quality.standards.inspectionStages.sortOrder'),
      { target: { value: '90' } }
    )
    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'quality.standards.inspectionStages.save',
      })
    )
    await screen.findByRole('button', {
      name: 'quality.standards.inspectionStages.edit 成型复检站',
    })
    expect(stageCatalogMocks.save).toHaveBeenCalledWith(
      'inner-stage',
      expect.objectContaining({
        name: '成型复检站',
        sortOrder: 90,
        active: false,
        version: 1,
      })
    )
    expect(
      screen.getByLabelText('quality.standards.inspectionStages.name')
    ).toHaveValue('')
    expect(stageCatalogMocks.list).toHaveBeenCalledTimes(2)
  })

  it('keeps unsaved input when a stale version is rejected and offers refresh', async () => {
    stageCatalogMocks.list.mockResolvedValue([originalInspectionStage])
    const conflictError = new Error('Version conflict')
    stageCatalogMocks.save.mockRejectedValue(conflictError)
    renderQualityInspectionStageManagementDialog()
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'quality.standards.inspectionStages.edit 成型检验站',
      })
    )
    fireEvent.change(
      screen.getByLabelText('quality.standards.inspectionStages.name'),
      { target: { value: '尚未保存的检验站名称' } }
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'quality.standards.inspectionStages.save',
      })
    )
    await waitFor(() =>
      expect(stageCatalogMocks.handleError).toHaveBeenCalledWith(conflictError)
    )
    expect(
      screen.getByLabelText('quality.standards.inspectionStages.name')
    ).toHaveValue('尚未保存的检验站名称')
    expect(
      screen.getByRole('button', {
        name: 'quality.standards.inspectionStages.refresh',
      })
    ).toBeEnabled()
  })

  it('lets a viewer read stages without exposing write controls', async () => {
    stageCatalogMocks.canManage = false
    stageCatalogMocks.list.mockResolvedValue([originalInspectionStage])
    renderQualityInspectionStageManagementDialog()
    expect(await screen.findByText('成型检验站')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'quality.standards.inspectionStages.save',
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText('quality.standards.inspectionStages.name')
    ).not.toBeInTheDocument()
  })
})
