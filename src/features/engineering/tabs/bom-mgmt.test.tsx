// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BOMMgmt } from './bom-mgmt'
import { useBOMData } from '../hooks/use-bom-data'
import { createProductDraft } from '../utils/default-builders'

const {
  useBOMDataMock,
  bomTableMock,
  bomPreviewMock,
  bomToolbarMock,
  bomActionDialogMock,
} = vi.hoisted(() => ({
  useBOMDataMock: vi.fn(),
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
    const typedProps = props as { onAddBOM: () => void }
    return (
      <div>
        <button type='button' onClick={typedProps.onAddBOM}>
          open-bom-dialog
        </button>
      </div>
    )
  },
}))

vi.mock('../components/bom-action-dialog', () => ({
  BOMActionDialog: (props: unknown) => {
    bomActionDialogMock(props)
    return <div data-testid='bom-action-dialog' />
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
        productId: 'product-1',
        changeOrderId: '',
        bomVersion: 'V1.0',
        revisionNo: 'R1',
        changeType: 'MANUAL' as const,
        isDefaultSite: true,
        status: 'active' as const,
        items: [],
        description: 'Sample BOM',
        version: 1,
      },
    ],
    products: [createProductDraft({ id: 'product-1', name: 'Product A', sku: 'SKU-001' })],
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
  }
}

function buildUseBOMDataResult(overrides: Partial<UseBOMDataResult> = {}): UseBOMDataResult {
  return {
    readResource: buildReadyReadResource(),
    saveBOM: vi.fn(async () => true),
    deleteBOM: vi.fn(async () => true),
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

    expect(bomTableMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ id: 'bom-1', bomNo: 'BOM-001' }),
      ]),
      products: expect.arrayContaining([
        expect.objectContaining({ id: 'product-1', name: 'Product A' }),
      ]),
      isLoading: false,
    }))
    expect(bomToolbarMock).toHaveBeenCalledTimes(1)
    expect(bomActionDialogMock).toHaveBeenCalledWith(expect.objectContaining({ open: false }))
    expect(screen.getByTestId('bom-table')).toBeTruthy()
    expect(screen.getByTestId('bom-action-dialog')).toBeTruthy()
  })

  it('renders explicit error state instead of falling back to empty table', () => {
    mockedUseBOMData.mockReturnValue(buildUseBOMDataResult({
      readResource: {
        status: 'error',
        error: new Error('BOM backend unavailable'),
        scope: 'useBOMReadData.boms',
      },
    }))

    render(<BOMMgmt />)

    expect(screen.getByText('engineering.bomArchive.toasts.loadFailed')).toBeTruthy()
    expect(screen.getByText('BOM backend unavailable')).toBeTruthy()
    expect(screen.queryByTestId('bom-table')).toBeNull()
    expect(bomTableMock).not.toHaveBeenCalled()
  })

  it('only enters preview branch when resource status is ready', async () => {
    const user = userEvent.setup()
    mockedUseBOMData.mockReturnValue(buildUseBOMDataResult())
    render(<BOMMgmt />)

    await user.click(screen.getByRole('button', { name: 'preview-bom' }))

    expect(bomPreviewMock).toHaveBeenCalledWith(expect.objectContaining({
      products: expect.arrayContaining([expect.objectContaining({ id: 'product-1' })]),
      materials: expect.arrayContaining([expect.objectContaining({ id: 'mat-1' })]),
    }))
  })
})
