// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOMMgmt } from './bom-mgmt'
import { useBOMData } from '../hooks/use-bom-data'
import { createProductDraft } from '@/features/engineering/utils/default-builders'

const {
  useBOMDataMock,
  auditTimelineTriggerButtonMock,
  bomTableMock,
  bomPreviewMock,
  bomToolbarMock,
  bomActionDialogMock,
} = vi.hoisted(() => ({
  useBOMDataMock: vi.fn(),
  auditTimelineTriggerButtonMock: vi.fn(),
  bomTableMock: vi.fn(),
  bomPreviewMock: vi.fn(),
  bomToolbarMock: vi.fn(),
  bomActionDialogMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/common/audit-timeline-trigger-button', () => ({
  AuditTimelineTriggerButton: (props: unknown) => {
    auditTimelineTriggerButtonMock(props)
    return <div data-testid='bom-page-audit-trigger' />
  },
}))

vi.mock('../hooks/use-bom-data', () => ({
  useBOMData: useBOMDataMock,
}))

vi.mock('../components/bom-mgmt/bom-table', () => ({
  BOMTable: (props: { onPreview: (bom: unknown) => void } & Record<string, unknown>) => {
    bomTableMock(props)
    const readyResource = buildReadyReadResource()
    return (
      <div>
        <div data-testid='bom-table' />
        <button type='button' onClick={() => props.onPreview(readyResource.data[0] ?? null)}>
          preview-bom
        </button>
      </div>
    )
  },
}))

vi.mock('../components/bom-mgmt/bom-preview', () => ({
  BOMPreview: (props: unknown) => {
    bomPreviewMock(props)
    return <div data-testid='bom-preview' />
  },
}))

vi.mock('../components/bom-mgmt/bom-toolbar', () => ({
  BOMToolbar: (props: unknown) => {
    bomToolbarMock(props)
    const typedProps = props as { onAddBOM: () => void; onUploadExcel: (file: File) => Promise<void> }
    return (
      <div>
        <button type='button' onClick={typedProps.onAddBOM}>
          open-bom-dialog
        </button>
        <button type='button' onClick={() => void typedProps.onUploadExcel(new File(['bom'], 'bom.xlsx'))}>
          upload-bom
        </button>
      </div>
    )
  },
}))

vi.mock('../components/bom-action-dialog', () => ({
  BOMActionDialog: (props: unknown) => {
    bomActionDialogMock(props)
    const typedProps = props as { onOpenChange: (open: boolean) => void }
    return (
      <div>
        <div data-testid='bom-action-dialog' />
        <button type='button' onClick={() => typedProps.onOpenChange(false)}>
          close-bom-dialog
        </button>
      </div>
    )
  },
}))

type UseBOMDataResult = ReturnType<typeof useBOMData>

const mockedUseBOMData = vi.mocked(useBOMData)

function buildReadyReadResource() {
  return {
    status: 'ready' as const,
    data: [
      {
        id: 'bom-1',
        bomNo: 'BOM-001',
        bomType: 'EBOM' as const,
        productId: 'product-1',
        bomVersion: 'V1.0',
        revisionNo: 'R1',
        changeType: 'MANUAL' as const,
        isDefaultSite: true,
        status: 'DRAFT' as const,
        isLocked: false,
        items: [],
        description: 'Sample BOM',
        version: 1,
      },
    ],
    products: [createProductDraft({ id: 'product-1', name: 'Product A', sku: 'SKU-001' })],
    productDisplayLabelMap: new Map([['product-1', 'Product A (高刚性)']]),
    materials: [
      {
        id: 'mat-1',
        code: 'MAT-001',
        name: 'Material A',
        spec: '',
        uom: 'PCS',
        category: 'RAW_MATERIAL',
        status: 'Active' as const,
      },
    ],
    sections: [
      {
        value: 'PREPARE',
        label: '备料',
        code: 'PREPARE',
        name: '备料',
        active: true,
        sortOrder: 1,
        isDefault: true,
        legacyNames: ['备料'],
      },
    ],
  }
}

function buildUseBOMDataResult(overrides: Partial<UseBOMDataResult> = {}): UseBOMDataResult {
  return {
    readResource: buildReadyReadResource(),
    saveBOM: vi.fn(async () => null as any),
    deleteBOM: vi.fn(async () => true),
    promoteBOM: vi.fn(async () => true),
    deriveMBOM: vi.fn(async () => true),
    downloadTemplate: vi.fn(async () => undefined),
    parseExcel: vi.fn(async () => null),
    ...overrides,
  }
}

describe('BOMMgmt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('passes ready resource data into BOMTable and keeps toolbar/action dialog mounted', () => {
    mockedUseBOMData.mockReturnValue(buildUseBOMDataResult())

    render(<BOMMgmt />)

    expect(bomTableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ id: 'bom-1', bomNo: 'BOM-001' })]),
        products: expect.arrayContaining([expect.objectContaining({ id: 'product-1', name: 'Product A' })]),
        isLoading: false,
      })
    )
    expect(bomToolbarMock).toHaveBeenCalledTimes(1)
    expect(bomActionDialogMock).toHaveBeenCalledWith(expect.objectContaining({ open: false }))
    expect(auditTimelineTriggerButtonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'bom',
        targetName: 'engineering.bomArchive.header.title',
      })
    )
    expect(screen.getByTestId('bom-table')).toBeTruthy()
    expect(screen.getByTestId('bom-action-dialog')).toBeTruthy()
    expect(screen.getByTestId('bom-page-audit-trigger')).toBeTruthy()
  })

  it('renders explicit error state instead of falling back to empty table', () => {
    mockedUseBOMData.mockReturnValue(
      buildUseBOMDataResult({
        readResource: {
          status: 'error',
          error: new Error('BOM backend unavailable'),
          scope: 'useBOMReadData.boms',
        },
      })
    )

    render(<BOMMgmt />)

    expect(screen.getByText('engineering.bomArchive.toasts.loadFailed')).toBeTruthy()
    expect(screen.getByText('BOM backend unavailable')).toBeTruthy()
    expect(screen.queryByTestId('bom-table')).toBeNull()
    expect(bomTableMock).not.toHaveBeenCalled()
  })

  it('switches to preview mode within the same page shell when resource status is ready', async () => {
    const user = userEvent.setup()
    mockedUseBOMData.mockReturnValue(buildUseBOMDataResult())
    render(<BOMMgmt />)

    await user.click(screen.getByRole('button', { name: 'preview-bom' }))

    expect(screen.getByText('engineering.bomArchive.header.title')).toBeTruthy()
    expect(screen.getByTestId('bom-page-audit-trigger')).toBeTruthy()
    expect(screen.getByTestId('bom-preview')).toBeTruthy()
    expect(bomPreviewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        products: expect.arrayContaining([expect.objectContaining({ id: 'product-1' })]),
        productDisplayLabelMap: expect.any(Map),
        materials: expect.arrayContaining([expect.objectContaining({ id: 'mat-1' })]),
        sections: expect.arrayContaining([expect.objectContaining({ code: 'PREPARE' })]),
      })
    )
    expect((bomPreviewMock.mock.calls[0]?.[0] as { productDisplayLabelMap: Map<string, string> }).productDisplayLabelMap.get('product-1')).toBe('Product A (高刚性)')
  })

  it('clears imported dialog seed after closing before opening a fresh create dialog', async () => {
    const user = userEvent.setup()
    mockedUseBOMData.mockReturnValue(
      buildUseBOMDataResult({
        parseExcel: (async (_file: File) => ({
          productId: 'product-1',
          items: [
            {
              id: '11111111-1111-1111-1111-111111111111',
              materialId: 'mat-1',
              section: 'HUB',
              materialName: 'Material A',
              materialSpec: '',
              unitPrice: 10,
              unit: 'PCS',
              unitUsage: 1,
              wastagePercent: 0,
              materialType: 'RAW_MATERIAL',
              supplyChannel: 'PURCHASE',
            },
          ],
        })) as UseBOMDataResult['parseExcel'],
      })
    )

    render(<BOMMgmt />)

    await user.click(screen.getByRole('button', { name: 'upload-bom' }))

    expect(bomActionDialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        initialProductId: 'product-1',
        initialItems: expect.arrayContaining([expect.objectContaining({ materialId: 'mat-1', section: 'HUB' })]),
      })
    )

    await user.click(screen.getByRole('button', { name: 'close-bom-dialog' }))
    await user.click(screen.getByRole('button', { name: 'open-bom-dialog' }))

    expect(bomActionDialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        currentRow: undefined,
        initialProductId: undefined,
        initialItems: undefined,
      })
    )
  })
})
