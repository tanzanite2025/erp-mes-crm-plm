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
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { QUALITY_INSPECTION_STAGE_DEFECT_BINDINGS_QUERY_KEY } from '../hooks/use-quality-defect-type-configuration'
import type {
  QualityDefectType,
  QualityInspectionStageDefectTypeBindings,
  SaveQualityDefectTypeInput,
} from '../services/quality-defect-type-catalog-and-inspection-stage-bindings-service'
import { QualityDefectTypeConfigurationContent } from './quality-defect-type-configuration-content'
import { QualityDefectTypeConfigurationDialog } from './quality-defect-type-configuration-dialog'

const configurationMocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  stages: vi.fn(),
  bindings: vi.fn(),
  replace: vi.fn(),
  confirm: vi.fn(),
  error: vi.fn(),
  canManage: true,
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: configurationMocks.error,
}))
vi.mock('@/lib/application-confirm-prompt-and-alert-dialog-requests', () => ({
  requestApplicationConfirmation: configurationMocks.confirm,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({
    isChecking: false,
    allowsAction: () => configurationMocks.canManage,
  }),
}))
vi.mock(
  '../services/quality-defect-type-catalog-and-inspection-stage-bindings-service',
  () => ({
    listQualityDefectTypes: configurationMocks.list,
    saveQualityDefectType: configurationMocks.save,
    getQualityInspectionStageDefectTypeBindings: configurationMocks.bindings,
    replaceQualityInspectionStageDefectTypeBindings: configurationMocks.replace,
  })
)
vi.mock('../services/quality-inspection-stage-catalog-service', () => ({
  listQualityInspectionStages: configurationMocks.stages,
}))

const pinhole: QualityDefectType = {
  id: 'pinhole',
  code: 'QDT-PINHOLE',
  name: '针孔',
  description: '',
  sortOrder: 10,
  active: true,
  version: 1,
}
const scratch: QualityDefectType = {
  ...pinhole,
  id: 'scratch',
  code: 'QDT-SCRATCH',
  name: '划伤',
  sortOrder: 20,
}
const inspectionStations = [
  {
    id: 'forming',
    code: 'FORMING',
    name: '成型检验站',
    description: '',
    sortOrder: 10,
    active: true,
    version: 1,
  },
  {
    id: 'painting',
    code: 'PAINTING',
    name: '涂装检验站',
    description: '',
    sortOrder: 40,
    active: true,
    version: 1,
  },
]

function renderSharedQualityDefectConfiguration(
  inDialog = false,
  onOpenChange = vi.fn()
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      {inDialog ? (
        <QualityDefectTypeConfigurationDialog
          open
          onOpenChange={onOpenChange}
        />
      ) : (
        <QualityDefectTypeConfigurationContent />
      )}
    </QueryClientProvider>
  )
  return { ...result, queryClient, onOpenChange }
}

async function chooseInspectionStation(name: string) {
  const selector = screen.getByRole('combobox')
  await waitFor(() => expect(selector).toBeEnabled())
  fireEvent.click(selector)
  fireEvent.click(await screen.findByRole('option', { name }))
  await waitFor(() => expect(configurationMocks.bindings).toHaveBeenCalled())
}

function stationBindingRegion() {
  return within(
    screen.getByRole('region', {
      name: 'quality.defectConfiguration.bindingsTitle',
    })
  )
}

describe('shared quality defect catalog and station binding configuration', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class QualityDefectConfigurationResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    HTMLElement.prototype.scrollIntoView = vi.fn()
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  })
  afterAll(() => vi.unstubAllGlobals())
  afterEach(cleanup)
  beforeEach(() => {
    vi.clearAllMocks()
    configurationMocks.canManage = true
    configurationMocks.confirm.mockResolvedValue(true)
    configurationMocks.list.mockResolvedValue([pinhole, scratch])
    configurationMocks.stages.mockResolvedValue(inspectionStations)
    configurationMocks.bindings.mockImplementation(async (id: string) => ({
      inspectionStageId: id,
      defectTypeIds: [],
      version: 1,
    }))
    configurationMocks.replace.mockImplementation(
      async (input: QualityInspectionStageDefectTypeBindings) => ({
        ...input,
        version: input.version + 1,
      })
    )
  })

  it.each([false, true])(
    'saves through the same catalog component in page and dialog containers (dialog=%s)',
    async (inDialog) => {
      configurationMocks.save.mockImplementation(
        async (_id: string | undefined, input: SaveQualityDefectTypeInput) => ({
          ...pinhole,
          ...input,
          version: 1,
        })
      )
      renderSharedQualityDefectConfiguration(inDialog)
      await screen.findByText('针孔')
      fireEvent.change(
        screen.getByLabelText('quality.defectConfiguration.name'),
        { target: { value: '裂纹' } }
      )
      fireEvent.click(
        screen.getByRole('button', {
          name: 'quality.defectConfiguration.save',
        })
      )
      await waitFor(() =>
        expect(configurationMocks.save).toHaveBeenCalledWith(
          undefined,
          expect.objectContaining({ name: '裂纹', active: true, sortOrder: 10 })
        )
      )
      await waitFor(() =>
        expect(
          screen.queryByText('quality.defectConfiguration.dirty')
        ).not.toBeInTheDocument()
      )
      expect(configurationMocks.list).toHaveBeenCalledTimes(2)
    }
  )

  it('binds the shared defect to two stations and removes only the selected station binding', async () => {
    const persisted: Record<string, QualityInspectionStageDefectTypeBindings> =
      {
        forming: {
          inspectionStageId: 'forming',
          defectTypeIds: [],
          version: 1,
        },
        painting: {
          inspectionStageId: 'painting',
          defectTypeIds: [],
          version: 1,
        },
      }
    configurationMocks.bindings.mockImplementation(async (id: string) => ({
      ...persisted[id],
    }))
    configurationMocks.replace.mockImplementation(
      async (input: QualityInspectionStageDefectTypeBindings) => {
        persisted[input.inspectionStageId] = {
          ...input,
          version: input.version + 1,
        }
        return persisted[input.inspectionStageId]
      }
    )
    renderSharedQualityDefectConfiguration()
    await screen.findByText('针孔')
    for (const name of ['成型检验站', '涂装检验站']) {
      await chooseInspectionStation(name)
      fireEvent.click(
        await stationBindingRegion().findByRole('checkbox', { name: '针孔' })
      )
      fireEvent.click(
        stationBindingRegion().getByRole('button', {
          name: 'quality.defectConfiguration.saveBindings',
        })
      )
      await waitFor(() =>
        expect(
          stationBindingRegion().getByRole('button', {
            name: 'quality.defectConfiguration.saveBindings',
          })
        ).toBeDisabled()
      )
    }
    await chooseInspectionStation('成型检验站')
    const selected = await stationBindingRegion().findByRole('checkbox', {
      name: '针孔',
    })
    expect(selected).toBeChecked()
    fireEvent.click(selected)
    fireEvent.click(
      stationBindingRegion().getByRole('button', {
        name: 'quality.defectConfiguration.saveBindings',
      })
    )
    await waitFor(() => expect(persisted.forming.defectTypeIds).toEqual([]))
    expect(persisted.painting.defectTypeIds).toEqual(['pinhole'])
  })

  it('keeps the draft and original version after a background refresh and rejected stale save', async () => {
    let serverBindings = {
      inspectionStageId: 'forming',
      defectTypeIds: ['pinhole'],
      version: 1,
    }
    configurationMocks.bindings.mockImplementation(async () => serverBindings)
    const conflict = new Error('Configuration was modified')
    configurationMocks.replace.mockRejectedValue(conflict)
    const { queryClient } = renderSharedQualityDefectConfiguration()
    await screen.findByText('针孔')
    await chooseInspectionStation('成型检验站')
    fireEvent.click(
      await stationBindingRegion().findByRole('checkbox', { name: '划伤' })
    )
    serverBindings = {
      ...serverBindings,
      version: 2,
      defectTypeIds: ['scratch'],
    }
    await act(async () => {
      await queryClient.invalidateQueries({
        queryKey: QUALITY_INSPECTION_STAGE_DEFECT_BINDINGS_QUERY_KEY,
      })
    })
    fireEvent.click(
      stationBindingRegion().getByRole('button', {
        name: 'quality.defectConfiguration.saveBindings',
      })
    )
    await waitFor(() =>
      expect(configurationMocks.error).toHaveBeenCalledWith(conflict)
    )
    expect(configurationMocks.replace).toHaveBeenCalledWith(
      {
        inspectionStageId: 'forming',
        defectTypeIds: ['pinhole', 'scratch'],
        version: 1,
      },
      expect.anything()
    )
    expect(
      stationBindingRegion().getByRole('checkbox', { name: '针孔' })
    ).toBeChecked()
    expect(
      stationBindingRegion().getByRole('checkbox', { name: '划伤' })
    ).toBeChecked()
  })

  it('shows failed loading with retry and preserves a failed catalog save', async () => {
    configurationMocks.list.mockRejectedValueOnce(
      new Error('Catalog unavailable')
    )
    configurationMocks.save.mockRejectedValue(new Error('Save unavailable'))
    renderSharedQualityDefectConfiguration()
    const catalog = within(
      screen.getByRole('region', {
        name: 'quality.defectConfiguration.catalogTitle',
      })
    )
    await catalog.findByRole('alert')
    expect(
      catalog.queryByText('quality.defectConfiguration.empty')
    ).not.toBeInTheDocument()
    fireEvent.click(
      catalog.getByRole('button', { name: 'quality.defectConfiguration.retry' })
    )
    await catalog.findByText('针孔')
    fireEvent.change(
      catalog.getByLabelText('quality.defectConfiguration.name'),
      { target: { value: '未保存的问题' } }
    )
    fireEvent.click(
      catalog.getByRole('button', {
        name: 'quality.defectConfiguration.save',
      })
    )
    await waitFor(() => expect(configurationMocks.error).toHaveBeenCalled())
    expect(
      catalog.getByLabelText('quality.defectConfiguration.name')
    ).toHaveValue('未保存的问题')
  })

  it('does not discard station selection or edits when switching is cancelled', async () => {
    configurationMocks.confirm.mockResolvedValue(false)
    renderSharedQualityDefectConfiguration()
    await screen.findByText('针孔')
    await chooseInspectionStation('成型检验站')
    fireEvent.click(
      await stationBindingRegion().findByRole('checkbox', { name: '针孔' })
    )
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: '涂装检验站' }))
    await waitFor(() => expect(configurationMocks.confirm).toHaveBeenCalled())
    expect(screen.getByRole('combobox')).toHaveTextContent('成型检验站')
    expect(
      stationBindingRegion().getByRole('checkbox', { name: '针孔' })
    ).toBeChecked()
  })

  it('lets viewers read bindings while hiding maintenance buttons', async () => {
    configurationMocks.canManage = false
    configurationMocks.bindings.mockResolvedValue({
      inspectionStageId: 'forming',
      defectTypeIds: ['pinhole'],
      version: 1,
    })
    renderSharedQualityDefectConfiguration()
    await screen.findByText('针孔')
    await chooseInspectionStation('成型检验站')
    const selected = await stationBindingRegion().findByRole('checkbox', {
      name: '针孔',
    })
    expect(selected).toBeChecked()
    expect(selected).toBeDisabled()
    expect(
      screen.queryByRole('button', {
        name: 'quality.defectConfiguration.saveBindings',
      })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: 'quality.defectConfiguration.save',
      })
    ).not.toBeInTheDocument()
  })

  it('allows removal of an inactive existing binding and prevents a new inactive binding', async () => {
    configurationMocks.list.mockResolvedValue([
      { ...pinhole, active: false },
      { ...scratch, active: false },
    ])
    configurationMocks.bindings.mockResolvedValue({
      inspectionStageId: 'forming',
      defectTypeIds: ['pinhole'],
      version: 1,
    })
    renderSharedQualityDefectConfiguration()
    await screen.findByText('针孔')
    await chooseInspectionStation('成型检验站')
    const selected = await stationBindingRegion().findByRole('checkbox', {
      name: /针孔/,
    })
    expect(selected).toBeEnabled()
    expect(
      stationBindingRegion().getByRole('checkbox', { name: /划伤/ })
    ).toBeDisabled()
    fireEvent.click(selected)
    fireEvent.click(
      stationBindingRegion().getByRole('button', {
        name: 'quality.defectConfiguration.saveBindings',
      })
    )
    await waitFor(() =>
      expect(configurationMocks.replace).toHaveBeenCalledWith(
        expect.objectContaining({ defectTypeIds: [] }),
        expect.anything()
      )
    )
  })

  it('guards closing the reusable dialog when its shared content has unsaved changes', async () => {
    configurationMocks.confirm.mockResolvedValue(false)
    const { onOpenChange } = renderSharedQualityDefectConfiguration(true)
    await screen.findByText('针孔')
    fireEvent.change(
      screen.getByLabelText('quality.defectConfiguration.name'),
      { target: { value: '待保存问题' } }
    )
    fireEvent.click(
      screen.getByRole('button', {
        name: 'quality.defectConfiguration.close',
      })
    )
    await waitFor(() => expect(configurationMocks.confirm).toHaveBeenCalled())
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(
      screen.getByLabelText('quality.defectConfiguration.name')
    ).toHaveValue('待保存问题')
    configurationMocks.confirm.mockResolvedValue(true)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'quality.defectConfiguration.close',
      })
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
