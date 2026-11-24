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
import {
  QualityStandardInspectionRulesValidationError,
  toQualityStandardListSummary,
} from '../adapters/quality-standard-api-adapter'
import type { Standard } from '../data/schema'
import { buildControlledProtocolStandard } from '../services/controlled-protocol-standard-factory'
import type { ControlledProtocolDraft } from '../types/controlled-protocol'
import type { QualityStandardsListSearchState } from '../types/quality-standards-list'
import { StandardsIndexPage } from './standards-index-page'

const qualityDialogServiceMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  routeNavigate: vi.fn(),
  getStandards: vi.fn(),
  getStandardById: vi.fn(),
  saveStandard: vi.fn(),
  listStages: vi.fn(),
  saveStage: vi.fn(),
  handleError: vi.fn(),
  isMobile: false,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => qualityDialogServiceMocks.navigate,
}))
vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key, locale: 'zh-CN' }),
}))
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => qualityDialogServiceMocks.isMobile,
}))
vi.mock('@/lib/handle-server-error', () => ({
  handleServerError: qualityDialogServiceMocks.handleError,
}))
vi.mock('@/lib/safe-catch', () => ({ failLoudly: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/authz/hooks/use-permission-access', () => ({
  usePermissionActions: () => ({ isChecking: false, allowsAction: () => true }),
}))
vi.mock('@/components/common/audit-timeline-trigger-button', () => ({
  AuditTimelineTriggerButton: () => <button>Audit history</button>,
}))
vi.mock('@/features/basic-settings/hooks/use-units-query', () => ({
  useUnitsQuery: () => ({
    units: [
      {
        id: 'gram',
        code: 'G',
        name: '克',
        category: 'WEIGHT',
        status: 'active',
        precision: 2,
        isSystem: true,
      },
    ],
    isLoading: false,
    error: null,
  }),
}))
vi.mock('../services/quality-core-service', () => ({
  QualityCoreService: {
    getStandards: qualityDialogServiceMocks.getStandards,
    getStandardById: qualityDialogServiceMocks.getStandardById,
  },
}))
vi.mock('../services/quality-maintenance-service', () => ({
  QualityMaintenanceService: {
    saveStandard: qualityDialogServiceMocks.saveStandard,
  },
}))
vi.mock('../services/quality-inspection-stage-catalog-service', () => ({
  listQualityInspectionStages: qualityDialogServiceMocks.listStages,
  saveQualityInspectionStage: qualityDialogServiceMocks.saveStage,
}))
vi.mock('../components/controlled-protocol-dialog', () => ({
  ControlledProtocolDialog: ({
    onSubmit,
  }: {
    onSubmit: (draft: ControlledProtocolDraft) => Promise<void>
  }) => (
    <div role='dialog' aria-label='Create protocol'>
      <button
        onClick={() =>
          void onSubmit({
            productId: 'rim-product',
            productName: 'R50',
            criteria: [
              {
                id: 'new-weight',
                itemName: '内圈重',
                inspectionStageId: 'forming-inspection-station',
                inspectionStageName: '成型检验站',
                targetWeight: 450,
                unit: 'G',
                gradingMode: 'DEVIATION_BANDS',
                levels: [
                  {
                    level: 'S',
                    lowerTolerance: 0,
                    upperTolerance: 0,
                    result: 'PASS',
                  },
                  {
                    level: 'A',
                    lowerTolerance: 5,
                    upperTolerance: 5,
                    result: 'PASS',
                  },
                  {
                    level: 'B',
                    lowerTolerance: 8,
                    upperTolerance: 8,
                    result: 'PASS',
                  },
                ],
              },
            ],
          })
        }
      >
        Submit protocol draft
      </button>
    </div>
  ),
}))

const preservedListSearch: QualityStandardsListSearchState = {
  keyword: 'R50',
  type: 'FQC',
  status: 'DRAFT',
  page: 2,
  pageSize: 20,
}
let persistedStandard: Standard

function createQualityStandardForDialogEditing(): Standard {
  return {
    id: 'rim-standard',
    ...buildControlledProtocolStandard({
      productId: 'rim-product',
      productName: 'R50',
      criteria: [
        {
          id: 'inner-weight',
          itemName: '内圈重',
          inspectionStageId: 'forming-inspection-station',
          inspectionStageName: '成型检验站',
          targetWeight: 450,
          unit: 'G',
          gradingMode: 'DEVIATION_BANDS',
          levels: [
            {
              level: 'S',
              lowerTolerance: 0,
              upperTolerance: 0,
              result: 'PASS',
            },
            {
              level: 'A',
              lowerTolerance: 5,
              upperTolerance: 5,
              result: 'PASS',
            },
            {
              level: 'B',
              lowerTolerance: 8,
              upperTolerance: 8,
              result: 'PASS',
            },
          ],
        },
      ],
    }),
  } as Standard
}

function renderQualityStandardsListForDialogVerification() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <StandardsIndexPage
        search={preservedListSearch}
        navigate={qualityDialogServiceMocks.routeNavigate}
      />
    </QueryClientProvider>
  )
  return queryClient
}

async function openQualityStandardEditorFromList() {
  fireEvent.click(
    await screen.findByRole('button', {
      name: `quality.standards.workspace.openEditor ${persistedStandard.name}`,
    })
  )
  await screen.findAllByLabelText(
    'quality.standards.dialog.controlledProtocol.fields.targetWeight'
  )
  return screen.getByRole('dialog', {
    name: 'quality.standards.workspace.inspectionRulesEditorTitle',
  })
}

function changeQualityStandardTargetWeight(dialog: HTMLElement, value: string) {
  fireEvent.change(
    within(dialog).getByLabelText(
      'quality.standards.dialog.controlledProtocol.fields.targetWeight'
    ),
    { target: { value } }
  )
}

describe('quality standards list dialog editing and context preservation', () => {
  beforeAll(() =>
    vi.stubGlobal(
      'ResizeObserver',
      class QualityStandardDialogTestResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  )
  afterAll(() => vi.unstubAllGlobals())
  beforeEach(() => {
    persistedStandard = createQualityStandardForDialogEditing()
    qualityDialogServiceMocks.getStandardById.mockImplementation(async () =>
      structuredClone(persistedStandard)
    )
    qualityDialogServiceMocks.getStandards.mockImplementation(async () => ({
      items: [structuredClone(persistedStandard)],
      total: 21,
      metadata: {
        pagination: { total: 21, page: 2, pageSize: 20 },
        stats: {
          total: 21,
          draft: 21,
          pendingApproval: 0,
          approved: 0,
          rejected: 0,
          published: 0,
          archived: 0,
        },
      },
    }))
    qualityDialogServiceMocks.saveStandard.mockImplementation(
      async ({ data }: { data: Partial<Standard> }) => {
        persistedStandard = {
          ...persistedStandard,
          ...structuredClone(data),
          version: persistedStandard.version + 0.1,
        }
        return structuredClone(persistedStandard)
      }
    )
    qualityDialogServiceMocks.listStages.mockResolvedValue([
      {
        id: 'forming-inspection-station',
        code: 'QUALITY_FORMING_INSPECTION_STATION',
        name: '成型检验站',
        description: '',
        sortOrder: 10,
        active: true,
        version: 1,
      },
    ])
  })
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    qualityDialogServiceMocks.isMobile = false
  })

  it('shows a retryable loading error with unknown counts instead of reporting zero standards', async () => {
    qualityDialogServiceMocks.getStandards.mockRejectedValueOnce(
      new Error('Invalid response')
    )
    renderQualityStandardsListForDialogVerification()
    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert).toHaveTextContent('quality.standards.page.loadFailed')
    const allStandardsButton = screen.getByRole('button', {
      name: /quality.standards.page.statusViewAll /,
    })
    expect(
      allStandardsButton.querySelector(
        '[data-slot="quality-standard-status-count"]'
      )
    ).toHaveTextContent('—')
    expect(
      screen.queryByText('quality.standards.page.empty')
    ).not.toBeInTheDocument()
    fireEvent.click(
      within(errorAlert).getByRole('button', {
        name: 'quality.standards.inspectionStages.retry',
      })
    )
    await screen.findByRole('button', {
      name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
    })
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    )
  })

  it.each([false, true])(
    'edits and saves in a dialog without changing list filters or navigation (mobile: %s)',
    async (isMobile) => {
      qualityDialogServiceMocks.isMobile = isMobile
      renderQualityStandardsListForDialogVerification()
      const dialog = await openQualityStandardEditorFromList()
      expect(
        within(dialog).queryByPlaceholderText(
          'quality.standards.dialog.action.placeholders.code'
        )
      ).not.toBeInTheDocument()
      expect(
        within(dialog).queryByPlaceholderText(
          'quality.standards.dialog.action.placeholders.name'
        )
      ).not.toBeInTheDocument()
      expect(
        within(dialog).queryByPlaceholderText(
          'quality.standards.dialog.action.placeholders.remarks'
        )
      ).not.toBeInTheDocument()
      expect(
        within(dialog).queryByRole('button', {
          name: 'quality.standards.workspace.submitForApproval',
        })
      ).not.toBeInTheDocument()
      changeQualityStandardTargetWeight(dialog, '460')
      fireEvent.click(
        within(dialog).getByRole('button', {
          name: 'quality.standards.dialog.action.save',
        })
      )
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(qualityDialogServiceMocks.saveStandard).toHaveBeenCalledWith(
        expect.objectContaining({
          isPatch: true,
          delta: expect.objectContaining({
            items: expect.objectContaining({
              n: expect.arrayContaining([
                expect.objectContaining({ centerValue: 460 }),
              ]),
            }),
          }),
        })
      )
      expect(
        screen.getByPlaceholderText('quality.standards.page.searchPlaceholder')
      ).toHaveValue('R50')
      expect(qualityDialogServiceMocks.getStandards).toHaveBeenLastCalledWith({
        keyword: preservedListSearch.keyword,
        status: preservedListSearch.status,
        page: preservedListSearch.page,
        pageSize: preservedListSearch.pageSize,
      })
      expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
      expect(qualityDialogServiceMocks.routeNavigate).not.toHaveBeenCalled()
    }
  )

  it('saves and reopens multiple stage groups without changing item order or unrelated grades', async () => {
    const originalWeightItem = persistedStandard.items[0]
    persistedStandard.items = [
      { ...originalWeightItem, order: 10, inspectionStageName: '成型检验站' },
      {
        ...structuredClone(originalWeightItem),
        id: 'coated-weight',
        name: '涂装重量',
        order: 20,
        inspectionStageId: 'painting-inspection-station',
        inspectionStageName: '涂装检验站',
        centerValue: 470,
        gradingMode: 'DEVIATION_BANDS',
        remarks: '超出全部等级范围为不合格，处置另行记录。',
        levels: [
          {
            level: '优等',
            lowerTolerance: 1,
            upperTolerance: 2,
            result: 'PASS',
          },
          {
            level: '合格',
            lowerTolerance: 4,
            upperTolerance: 5,
            result: 'PASS',
          },
        ],
      },
      {
        ...structuredClone(originalWeightItem),
        id: 'inner-weight-recheck',
        name: '内圈复核重量',
        order: 30,
      },
    ]
    qualityDialogServiceMocks.listStages.mockResolvedValue([
      {
        id: 'forming-inspection-station',
        code: 'QUALITY_FORMING_INSPECTION_STATION',
        name: '成型检验站',
        sortOrder: 10,
        active: true,
        version: 1,
      },
      {
        id: 'painting-inspection-station',
        code: 'QUALITY_PAINTING_INSPECTION_STATION',
        name: '涂装检验站',
        sortOrder: 20,
        active: true,
        version: 1,
      },
    ])
    const originalItems = structuredClone(persistedStandard.items)
    renderQualityStandardsListForDialogVerification()
    const dialog = await openQualityStandardEditorFromList()
    const innerStage = within(dialog).getByRole('region', {
      name: 'quality.standards.inspectionStages.stageGroup · 成型检验站',
    })
    expect(
      within(innerStage).getAllByRole('heading', { level: 4 })
    ).toHaveLength(2)
    changeQualityStandardTargetWeight(
      within(innerStage).getByRole('region', { name: '内圈重' }),
      '460'
    )
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'quality.standards.dialog.action.save',
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(persistedStandard.items.map((item) => item.id)).toEqual(
      originalItems.map((item) => item.id)
    )
    expect(persistedStandard.items.map((item) => item.order)).toEqual([
      10, 20, 30,
    ])
    expect(persistedStandard.items[0]).toMatchObject({
      centerValue: 460,
      inspectionStageName: '成型检验站',
    })
    expect(persistedStandard.items.slice(1)).toEqual(originalItems.slice(1))
    const reopenedDialog = await openQualityStandardEditorFromList()
    expect(
      within(reopenedDialog).getByRole('region', {
        name: 'quality.standards.inspectionStages.stageGroup · 成型检验站',
      })
    ).toBeInTheDocument()
    const coatedStage = within(reopenedDialog).getByRole('region', {
      name: 'quality.standards.inspectionStages.stageGroup · 涂装检验站',
    })
    expect(within(coatedStage).getByDisplayValue('优等')).toBeInTheDocument()
    expect(
      within(coatedStage).getByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.targetWeight'
      )
    ).toHaveValue(470)
    expect(
      within(reopenedDialog).queryByText(
        'quality.standards.workspace.editorDirty'
      )
    ).not.toBeInTheDocument()
  })

  it('does not dirty the standard when only choosing a stage for a possible new weight item', async () => {
    renderQualityStandardsListForDialogVerification()
    const dialog = await openQualityStandardEditorFromList()
    fireEvent.change(
      within(dialog).getByRole('combobox', {
        name: 'quality.standards.inspectionStages.newItemStage',
      }),
      { target: { value: 'forming-inspection-station' } }
    )
    expect(
      within(dialog).queryByText('quality.standards.workspace.editorDirty')
    ).not.toBeInTheDocument()
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.actions.close' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(qualityDialogServiceMocks.saveStandard).not.toHaveBeenCalled()
  })

  it('keeps input after a failed save and confirms before discarding it', async () => {
    qualityDialogServiceMocks.saveStandard.mockRejectedValueOnce(
      new Error('Save conflict')
    )
    renderQualityStandardsListForDialogVerification()
    const dialog = await openQualityStandardEditorFromList()
    changeQualityStandardTargetWeight(dialog, '470')
    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'quality.standards.dialog.action.save',
      })
    )
    await waitFor(() =>
      expect(qualityDialogServiceMocks.handleError).toHaveBeenCalled()
    )
    expect(
      within(dialog).getByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.targetWeight'
      )
    ).toHaveValue(470)
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.actions.close' })
    )
    const confirmation = await screen.findByRole('alertdialog')
    fireEvent.click(
      within(confirmation).getByRole('button', {
        name: 'quality.standards.workspace.keepEditing',
      })
    )
    expect(
      within(dialog).getByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.targetWeight'
      )
    ).toHaveValue(470)
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'common.actions.close' })
    )
    fireEvent.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', {
        name: 'quality.standards.workspace.discardAndClose',
      })
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
  })

  it('preserves an unsaved weight while managing stages and refreshing the standard in the background', async () => {
    const queryClient = renderQualityStandardsListForDialogVerification()
    const editorDialog = await openQualityStandardEditorFromList()
    changeQualityStandardTargetWeight(editorDialog, '480')
    fireEvent.click(
      within(editorDialog).getByRole('button', {
        name: 'quality.standards.inspectionStages.manage',
      })
    )
    const stageDialog = await screen.findByRole('dialog', {
      name: 'quality.standards.inspectionStages.title',
    })
    await within(stageDialog).findByText('成型检验站')
    fireEvent.click(within(stageDialog).getByRole('button', { name: 'Close' }))
    persistedStandard = { ...persistedStandard, version: 1.1 }
    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: ['quality_standard'] })
    })
    expect(
      within(editorDialog).getByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.targetWeight'
      )
    ).toHaveValue(480)
    expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
  })

  it.each([false, true])(
    'opens eye-button details in a dialog and switches to the rules dialog (mobile: %s)',
    async (isMobile) => {
      qualityDialogServiceMocks.isMobile = isMobile
      renderQualityStandardsListForDialogVerification()
      fireEvent.click(
        isMobile
          ? await screen.findByRole('heading', { name: persistedStandard.name })
          : await screen.findByRole('button', {
              name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
            })
      )
      const previewPanel = await screen.findByRole('dialog', {
        name: 'quality.standards.workspace.previewTitle',
      })
      expect(
        within(previewPanel).queryByText(
          'quality.standards.dialog.detail.fields.type'
        )
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('region', {
          name: 'quality.standards.workspace.previewTitle',
        })
      ).not.toBeInTheDocument()
      const editButtons = await within(previewPanel).findAllByRole('button', {
        name: 'quality.standards.workspace.openEditor',
      })
      fireEvent.click(editButtons[0])
      await screen.findByRole('dialog', {
        name: 'quality.standards.workspace.inspectionRulesEditorTitle',
      })
      expect(
        screen.queryByRole('dialog', {
          name: 'quality.standards.workspace.previewTitle',
        })
      ).not.toBeInTheDocument()
      expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
      expect(qualityDialogServiceMocks.routeNavigate).not.toHaveBeenCalled()
    }
  )

  it('creates a protocol and stays on the list after saving', async () => {
    renderQualityStandardsListForDialogVerification()
    fireEvent.click(
      await screen.findByRole('button', { name: 'quality.standards.page.add' })
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Submit protocol draft' })
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
    expect(qualityDialogServiceMocks.saveStandard).toHaveBeenCalled()
    expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
    expect(qualityDialogServiceMocks.routeNavigate).not.toHaveBeenCalled()
  })

  it.each(['DRAFT', 'REJECTED'] as const)(
    'shows basic information for invalid %s rules and opens an empty editor without modifying the standard',
    async (status) => {
      persistedStandard.status = status
      const originalInspectionItems = [
        {
          id: 'old-weight',
          name: '重量检测',
          centerValue: 450,
          unit: 'G',
          levels: [{ level: 'A', tolerance: 5 }],
        },
      ]
      qualityDialogServiceMocks.getStandardById.mockRejectedValue(
        new QualityStandardInspectionRulesValidationError(
          toQualityStandardListSummary(persistedStandard),
          originalInspectionItems
        )
      )
      renderQualityStandardsListForDialogVerification()
      fireEvent.click(
        await screen.findByRole('button', {
          name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
        })
      )
      const preview = await screen.findByRole('dialog', {
        name: 'quality.standards.workspace.previewTitle',
      })
      await within(preview).findByText(
        'quality.standards.workspace.inspectionRulesNeedConfigurationTitle'
      )
      expect(
        within(preview).getAllByText(persistedStandard.code).length
      ).toBeGreaterThan(0)
      expect(
        within(preview).getByText(persistedStandard.name)
      ).toBeInTheDocument()
      expect(
        within(preview).getByRole('button', { name: 'Audit history' })
      ).toBeInTheDocument()
      expect(
        within(preview).queryByText(
          'quality.standards.workspace.previewLoadFailedTitle'
        )
      ).not.toBeInTheDocument()
      expect(
        within(preview).queryByRole('button', {
          name: 'quality.standards.workspace.submitForApproval',
        })
      ).not.toBeInTheDocument()
      fireEvent.click(
        within(preview).getByRole('button', {
          name: 'quality.standards.workspace.reconfigureInspectionRules',
        })
      )
      await screen.findByText(
        'quality.standards.workspace.inspectionRulesReplacementNotice'
      )
      const editor = screen.getByRole('dialog', {
        name: 'quality.standards.workspace.inspectionRulesEditorTitle',
      })
      expect(
        within(editor).getByText(
          'quality.standards.workspace.inspectionRulesReplacementNotice'
        )
      ).toBeInTheDocument()
      expect(
        within(editor).queryByLabelText(
          'quality.standards.dialog.controlledProtocol.fields.targetWeight'
        )
      ).not.toBeInTheDocument()
      expect(
        within(editor).getByRole('button', {
          name: 'quality.standards.dialog.action.save',
        })
      ).toBeDisabled()
      fireEvent.click(
        within(editor).getByRole('button', { name: 'common.actions.close' })
      )
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      )
      expect(qualityDialogServiceMocks.saveStandard).not.toHaveBeenCalled()
      expect(originalInspectionItems[0]).not.toHaveProperty('inspectionStageId')
    }
  )

  it.each(['APPROVED', 'PUBLISHED'] as const)(
    'keeps invalid %s rules read-only and hides cached workflow actions',
    async (status) => {
      persistedStandard.status = status
      qualityDialogServiceMocks.getStandardById.mockRejectedValue(
        new QualityStandardInspectionRulesValidationError(
          toQualityStandardListSummary(persistedStandard),
          [{ name: '旧规则' }]
        )
      )
      const queryClient = renderQualityStandardsListForDialogVerification()
      queryClient.setQueryData(
        ['quality_standard', persistedStandard.id],
        structuredClone(persistedStandard)
      )
      fireEvent.click(
        await screen.findByRole('button', {
          name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
        })
      )
      const preview = await screen.findByRole('dialog', {
        name: 'quality.standards.workspace.previewTitle',
      })
      await within(preview).findByText(
        'quality.standards.workspace.inspectionRulesReconfigurationReadOnly'
      )
      for (const action of [
        'reconfigureInspectionRules',
        'openEditor',
        'publish',
        'archive',
      ]) {
        expect(
          within(preview).queryByRole('button', {
            name: `quality.standards.workspace.${action}`,
          })
        ).not.toBeInTheDocument()
      }
      expect(qualityDialogServiceMocks.saveStandard).not.toHaveBeenCalled()
    }
  )

  it('publishes from the details dialog and refreshes without navigating away', async () => {
    persistedStandard.status = 'APPROVED'
    renderQualityStandardsListForDialogVerification()
    fireEvent.click(
      await screen.findByRole('button', {
        name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
      })
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'quality.standards.workspace.previewTitle',
    })
    fireEvent.click(
      (
        await within(dialog).findAllByRole('button', {
          name: 'quality.standards.workspace.publish',
        })
      )[0]
    )
    await waitFor(() => expect(persistedStandard.status).toBe('PUBLISHED'))
    await within(dialog).findAllByText(
      'quality.standards.values.statusPublished'
    )
    expect(
      screen.getByRole('dialog', {
        name: 'quality.standards.workspace.previewTitle',
      })
    ).toBeVisible()
    expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
  })

  it('edits basic information on the page without modifying inspection rules', async () => {
    persistedStandard.type = 'IQC'
    const originalItems = structuredClone(persistedStandard.items)
    renderQualityStandardsListForDialogVerification()
    fireEvent.click(
      await screen.findByRole('button', {
        name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
      })
    )
    const detailsPanel = await screen.findByRole('dialog', {
      name: 'quality.standards.workspace.previewTitle',
    })
    fireEvent.click(
      await within(detailsPanel).findByRole('button', {
        name: 'quality.standards.workspace.editBasicInformation',
      })
    )
    const basicInformationEditor = await screen.findByRole('region', {
      name: 'quality.standards.workspace.editBasicInformation',
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByText('quality.standards.dialog.action.fields.type')
    ).not.toBeInTheDocument()
    expect(
      within(basicInformationEditor).queryByLabelText(
        'quality.standards.dialog.controlledProtocol.fields.targetWeight'
      )
    ).not.toBeInTheDocument()
    fireEvent.change(
      within(basicInformationEditor).getByPlaceholderText(
        'quality.standards.dialog.action.placeholders.name'
      ),
      { target: { value: 'R50 新的标准名称' } }
    )
    fireEvent.click(
      within(basicInformationEditor).getByRole('button', {
        name: 'quality.standards.workspace.saveBasicInformation',
      })
    )
    await waitFor(() => expect(persistedStandard.name).toBe('R50 新的标准名称'))
    expect(persistedStandard.items).toEqual(originalItems)
    expect(persistedStandard.type).toBe('IQC')
    expect(qualityDialogServiceMocks.saveStandard).toHaveBeenCalledWith(
      expect.objectContaining({
        isPatch: true,
        delta: { name: { o: expect.any(String), n: 'R50 新的标准名称' } },
      })
    )
    expect(qualityDialogServiceMocks.navigate).not.toHaveBeenCalled()
    expect(qualityDialogServiceMocks.routeNavigate).not.toHaveBeenCalled()
  })

  it('keeps unsaved basic information when cancelling a switch to the rules dialog', async () => {
    renderQualityStandardsListForDialogVerification()
    fireEvent.click(
      await screen.findByRole('button', {
        name: `quality.standards.workspace.openPreview ${persistedStandard.name}`,
      })
    )
    const detailsPanel = await screen.findByRole('dialog', {
      name: 'quality.standards.workspace.previewTitle',
    })
    fireEvent.click(
      await within(detailsPanel).findByRole('button', {
        name: 'quality.standards.workspace.editBasicInformation',
      })
    )
    const nameInput = await screen.findByPlaceholderText(
      'quality.standards.dialog.action.placeholders.name'
    )
    fireEvent.change(nameInput, { target: { value: '尚未保存的基础信息' } })
    fireEvent.click(
      screen.getByRole('button', {
        name: `quality.standards.workspace.openEditor ${persistedStandard.name}`,
      })
    )
    const confirmation = await screen.findByRole('alertdialog')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(
      within(confirmation).getByRole('button', {
        name: 'quality.standards.workspace.keepEditing',
      })
    )
    expect(nameInput).toHaveValue('尚未保存的基础信息')
    expect(qualityDialogServiceMocks.saveStandard).not.toHaveBeenCalled()
  })
})
