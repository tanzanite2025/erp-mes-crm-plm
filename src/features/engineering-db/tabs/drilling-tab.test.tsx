// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DrillingPlan } from '../data/schema'
import type { DrillingRowViewModel, DrillingSaveParams } from '../hooks/use-drilling-page-state'

const {
  useDrillingPageStateMock,
  drillingToolbarMock,
  drillingTableCardMock,
  drillingMobileListMock,
  drillingActionDialogMock,
  cadViewerDialogMock,
  pdfViewerDialogMock,
  excelViewerDialogMock,
  setSearchTermMock,
  handleCreateMock,
  handleEditMock,
  handleDeleteMock,
  handlePreviewMock,
  handleSaveMock,
  setOpenMock,
  setCadPreviewOpenMock,
  setPdfPreviewOpenMock,
  setExcelPreviewOpenMock,
} = vi.hoisted(() => ({
  useDrillingPageStateMock: vi.fn(),
  drillingToolbarMock: vi.fn(),
  drillingTableCardMock: vi.fn(),
  drillingMobileListMock: vi.fn(),
  drillingActionDialogMock: vi.fn(),
  cadViewerDialogMock: vi.fn(),
  pdfViewerDialogMock: vi.fn(),
  excelViewerDialogMock: vi.fn(),
  setSearchTermMock: vi.fn(),
  handleCreateMock: vi.fn(),
  handleEditMock: vi.fn(),
  handleDeleteMock: vi.fn(),
  handlePreviewMock: vi.fn(),
  handleSaveMock: vi.fn(async () => undefined),
  setOpenMock: vi.fn(),
  setCadPreviewOpenMock: vi.fn(),
  setPdfPreviewOpenMock: vi.fn(),
  setExcelPreviewOpenMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../hooks/use-drilling-page-state', () => ({
  useDrillingPageState: useDrillingPageStateMock,
}))

vi.mock('../components/drilling-toolbar', () => ({
  DrillingToolbar: (props: {
    searchTerm: string
    onSearchTermChange: (value: string) => void
    onCreate: () => void
  }) => {
    drillingToolbarMock(props)
    return (
      <div data-testid='drilling-toolbar'>
        <button type='button' onClick={() => props.onSearchTermChange('next-search')}>
          搜索 drilling
        </button>
        <button type='button' onClick={props.onCreate}>
          新建 drilling
        </button>
      </div>
    )
  },
}))

vi.mock('../components/drilling-table-card', () => ({
  DrillingTableCard: (props: {
    rows: DrillingRowViewModel[]
    isLoading: boolean
    highlightId?: string
    onPreview: (item: DrillingPlan) => void
    onEdit: (item: DrillingPlan) => void
    onDelete: (item: DrillingPlan) => void
  }) => {
    drillingTableCardMock(props)
    const firstItem = props.rows[0]?.item
    return (
      <div data-testid='drilling-table-card'>
        <button type='button' onClick={() => firstItem && props.onPreview(firstItem)}>
          表格预览
        </button>
        <button type='button' onClick={() => firstItem && props.onEdit(firstItem)}>
          表格编辑
        </button>
        <button type='button' onClick={() => firstItem && props.onDelete(firstItem)}>
          表格删除
        </button>
      </div>
    )
  },
}))

vi.mock('../components/drilling-mobile-list', () => ({
  DrillingMobileList: (props: {
    rows: DrillingRowViewModel[]
    isLoading: boolean
    highlightId?: string
    onPreview: (item: DrillingPlan) => void
    onEdit: (item: DrillingPlan) => void
    onDelete: (item: DrillingPlan) => void
  }) => {
    drillingMobileListMock(props)
    const firstItem = props.rows[0]?.item
    return (
      <div data-testid='drilling-mobile-list'>
        <button type='button' onClick={() => firstItem && props.onPreview(firstItem)}>
          移动端预览
        </button>
      </div>
    )
  },
}))

vi.mock('../components/drilling-action-dialog', () => ({
  DrillingActionDialog: (props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentRow?: DrillingPlan | null
    onSave: (params: DrillingSaveParams) => Promise<void>
    isLoading?: boolean
  }) => {
    drillingActionDialogMock(props)
    return (
      <div data-testid='drilling-action-dialog'>
        <button
          type='button'
          onClick={() => void props.onSave({
            data: {
              name: 'Dialog Save',
              productId: 'product-1',
              weavingModeId: 'wm-1',
              weavingModeLabel: '1:1',
              standardHoles: '28',
              fileUrl: '/files/dialog.pdf',
              fileExtension: 'pdf',
            },
            isPatch: false,
          })}
        >
          drilling 弹窗保存
        </button>
        <button type='button' onClick={() => props.onOpenChange(false)}>
          关闭 drilling 弹窗
        </button>
      </div>
    )
  },
}))

vi.mock('../components/cad-viewer', () => ({
  CADViewerDialog: (props: { open: boolean; onOpenChange: (open: boolean) => void; fileUrl: string; fileName: string; sku?: string }) => {
    cadViewerDialogMock(props)
    return (
      <div data-testid='cad-viewer-dialog'>
        <button type='button' onClick={() => props.onOpenChange(false)}>
          关闭 CAD
        </button>
      </div>
    )
  },
}))

vi.mock('../components/pdf-viewer', () => ({
  PDFViewerDialog: (props: { open: boolean; onOpenChange: (open: boolean) => void; fileUrl: string; fileName: string; sku?: string }) => {
    pdfViewerDialogMock(props)
    return (
      <div data-testid='pdf-viewer-dialog'>
        <button type='button' onClick={() => props.onOpenChange(false)}>
          关闭 PDF
        </button>
      </div>
    )
  },
}))

vi.mock('../components/excel-viewer', () => ({
  ExcelViewerDialog: (props: { open: boolean; onOpenChange: (open: boolean) => void; fileUrl: string; fileName: string; sku?: string }) => {
    excelViewerDialogMock(props)
    return (
      <div data-testid='excel-viewer-dialog'>
        <button type='button' onClick={() => props.onOpenChange(false)}>
          关闭 Excel
        </button>
      </div>
    )
  },
}))

import { DrillingTab } from './drilling-tab'

function buildPlan(overrides: Partial<DrillingPlan> = {}): DrillingPlan {
  return {
    id: 'plan-1',
    name: 'Drilling Plan',
    productId: 'product-1',
    weavingModeId: 'wm-1',
    weavingModeLabel: '1:1',
    standardHoles: '32',
    fileUrl: '/files/plan.pdf',
    fileExtension: 'pdf',
    version: 1,
    createdAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  }
}

function buildRow(): DrillingRowViewModel {
  return {
    item: buildPlan(),
    productSku: 'SKU-001',
    productName: 'Product One',
    searchText: 'drilling plan sku-001 product one 1:1 32',
  }
}

describe('DrillingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDrillingPageStateMock.mockReturnValue({
      searchTerm: 'current-drilling-search',
      setSearchTerm: setSearchTermMock,
      open: true,
      setOpen: setOpenMock,
      currentRow: buildPlan({ id: 'plan-edit' }),
      filteredRows: [buildRow()],
      isLoading: false,
      isSaving: true,
      highlightId: 'plan-edit',
      previewFile: {
        url: 'blob:preview-url',
        name: 'Plan Preview',
        sku: 'SKU-001',
      },
      cadPreviewOpen: true,
      setCadPreviewOpen: setCadPreviewOpenMock,
      pdfPreviewOpen: false,
      setPdfPreviewOpen: setPdfPreviewOpenMock,
      excelPreviewOpen: true,
      setExcelPreviewOpen: setExcelPreviewOpenMock,
      handleCreate: handleCreateMock,
      handleEdit: handleEditMock,
      handleDelete: handleDeleteMock,
      handlePreview: handlePreviewMock,
      handleSave: handleSaveMock,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('passes container props into toolbar, lists, action dialog and preview dialogs', async () => {
    const user = userEvent.setup()
    render(<DrillingTab />)

    expect(drillingToolbarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'current-drilling-search',
        onSearchTermChange: expect.any(Function),
        onCreate: handleCreateMock,
      })
    )

    expect(drillingTableCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ item: expect.objectContaining({ id: 'plan-1' }) })]),
        isLoading: false,
        highlightId: 'plan-edit',
        onPreview: handlePreviewMock,
        onEdit: handleEditMock,
        onDelete: handleDeleteMock,
      })
    )

    expect(drillingMobileListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ item: expect.objectContaining({ id: 'plan-1' }) })]),
        isLoading: false,
        highlightId: 'plan-edit',
        onPreview: handlePreviewMock,
        onEdit: handleEditMock,
        onDelete: handleDeleteMock,
      })
    )

    expect(drillingActionDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        onOpenChange: setOpenMock,
        currentRow: expect.objectContaining({ id: 'plan-edit' }),
        onSave: handleSaveMock,
        isLoading: true,
      })
    )

    expect(cadViewerDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        onOpenChange: setCadPreviewOpenMock,
        fileUrl: 'blob:preview-url',
        fileName: 'Plan Preview',
        sku: 'SKU-001',
      })
    )
    expect(pdfViewerDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: false,
        onOpenChange: setPdfPreviewOpenMock,
        fileUrl: 'blob:preview-url',
        fileName: 'Plan Preview',
        sku: 'SKU-001',
      })
    )
    expect(excelViewerDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        onOpenChange: setExcelPreviewOpenMock,
        fileUrl: 'blob:preview-url',
        fileName: 'Plan Preview',
        sku: 'SKU-001',
      })
    )

    await user.click(screen.getByRole('button', { name: '搜索 drilling' }))
    expect(setSearchTermMock).toHaveBeenCalledWith('next-search')

    await user.click(screen.getByRole('button', { name: '新建 drilling' }))
    expect(handleCreateMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '表格预览' }))
    expect(handlePreviewMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'plan-1' }))

    await user.click(screen.getByRole('button', { name: '表格编辑' }))
    expect(handleEditMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'plan-1' }))

    await user.click(screen.getByRole('button', { name: '表格删除' }))
    expect(handleDeleteMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'plan-1' }))

    await user.click(screen.getByRole('button', { name: 'drilling 弹窗保存' }))
    expect(handleSaveMock).toHaveBeenCalledWith({
      data: {
        name: 'Dialog Save',
        productId: 'product-1',
        weavingModeId: 'wm-1',
        weavingModeLabel: '1:1',
        standardHoles: '28',
        fileUrl: '/files/dialog.pdf',
        fileExtension: 'pdf',
      },
      isPatch: false,
    })
  })

  it('wires dialog open change and preview dialog close handlers back to page state setters', async () => {
    const user = userEvent.setup()
    render(<DrillingTab />)

    await user.click(screen.getByRole('button', { name: '关闭 drilling 弹窗' }))
    expect(setOpenMock).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: '关闭 CAD' }))
    expect(setCadPreviewOpenMock).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: '关闭 PDF' }))
    expect(setPdfPreviewOpenMock).toHaveBeenCalledWith(false)

    await user.click(screen.getByRole('button', { name: '关闭 Excel' }))
    expect(setExcelPreviewOpenMock).toHaveBeenCalledWith(false)
  })
})
