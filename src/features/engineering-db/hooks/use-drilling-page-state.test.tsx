// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ENGINEERING_DB_DRILLING_QUERY_KEY } from '../query-keys'
import type { DrillingPlan, DrillingPlanInput } from '../data/schema'
import type { DeltaSet } from '@/lib/delta/types'

const {
  getDrillingMock,
  patchDrillingMock,
  saveDrillingItemMock,
  deleteDrillingMock,
  resolveFileUrlMock,
  toastSuccessMock,
  toastErrorMock,
  runConfirmedActionMock,
  getPreviewKindMock,
  useSearchMock,
  useEngineeringDbProductLookupMock,
} = vi.hoisted(() => ({
  getDrillingMock: vi.fn(),
  patchDrillingMock: vi.fn(),
  saveDrillingItemMock: vi.fn(),
  deleteDrillingMock: vi.fn(),
  resolveFileUrlMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  runConfirmedActionMock: vi.fn(),
  getPreviewKindMock: vi.fn(),
  useSearchMock: vi.fn(),
  useEngineeringDbProductLookupMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('@tanstack/react-router', () => ({
  useSearch: useSearchMock,
}))

vi.mock('@/hooks/use-protected-action', () => ({
  useConfirmedActionFlow: () => ({
    runConfirmedAction: runConfirmedActionMock,
  }),
}))

vi.mock('./use-engineering-db-product-lookup', () => ({
  useEngineeringDbProductLookup: useEngineeringDbProductLookupMock,
}))

vi.mock('../services/production-db-service', () => ({
  ProductionDBService: {
    getDrilling: getDrillingMock,
    patchDrilling: patchDrillingMock,
    saveDrillingItem: saveDrillingItemMock,
    deleteDrilling: deleteDrillingMock,
  },
}))

vi.mock('../services/file-resolver-service', () => ({
  FileResolverService: {
    resolveFileUrl: resolveFileUrlMock,
  },
}))

vi.mock('../view-helpers', () => ({
  getEngineeringDbPreviewKind: getPreviewKindMock,
}))

import { useDrillingPageState } from './use-drilling-page-state'

function buildDrillingPlan(overrides: Partial<DrillingPlan> = {}): DrillingPlan {
  return {
    id: 'plan-1',
    name: 'Drilling Plan A',
    productId: 'product-1',
    weavingModeId: 'wm-1',
    weavingModeLabel: '1:1',
    standardHoles: '32',
    fileUrl: '/files/plan-a.pdf',
    fileExtension: 'pdf',
    version: 1,
    createdAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  }
}

function buildDrillingInput(overrides: Partial<DrillingPlanInput> = {}): DrillingPlanInput {
  return {
    name: 'New Drilling Plan',
    productId: 'product-1',
    weavingModeId: 'wm-1',
    weavingModeLabel: '1:1',
    standardHoles: '28',
    fileUrl: '/files/new-plan.pdf',
    fileExtension: 'pdf',
    ...overrides,
  }
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDrillingPageState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSearchMock.mockReturnValue({ highlightId: 'highlight-plan' })
    useEngineeringDbProductLookupMock.mockReturnValue({
      productMap: new Map([
        ['product-1', { id: 'product-1', sku: 'SKU-001', name: 'Product One' }],
        ['product-2', { id: 'product-2', sku: 'SKU-002', name: 'Product Two' }],
      ]),
    })
    runConfirmedActionMock.mockImplementation(({ onAction }: { onAction: () => void | Promise<void> }) => onAction())
    getPreviewKindMock.mockImplementation((extension?: string) => {
      if (extension === 'dwg') {
        return 'cad'
      }
      if (extension === 'xlsx') {
        return 'excel'
      }
      return 'pdf'
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds filteredRows from product lookup and search term', async () => {
    getDrillingMock.mockResolvedValue([
      buildDrillingPlan({ id: 'plan-1', name: 'Plan Alpha', productId: 'product-1', weavingModeLabel: '1:1', standardHoles: '32' }),
      buildDrillingPlan({ id: 'plan-2', name: 'Plan Beta', productId: 'product-2', weavingModeLabel: '2:1', standardHoles: '28' }),
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.filteredRows).toHaveLength(2)
    })

    act(() => {
      result.current.setSearchTerm('sku-002')
    })

    expect(result.current.filteredRows).toHaveLength(1)
    expect(result.current.filteredRows[0]?.item.id).toBe('plan-2')
    expect(result.current.filteredRows[0]?.productName).toBe('Product Two')
    expect(result.current.highlightId).toBe('highlight-plan')
  })

  it('opens create and edit states correctly', async () => {
    const plan = buildDrillingPlan()
    getDrillingMock.mockResolvedValue([plan])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.filteredRows).toHaveLength(1)
    })

    act(() => {
      result.current.handleCreate()
    })

    expect(result.current.open).toBe(true)
    expect(result.current.currentRow).toBeUndefined()

    act(() => {
      result.current.handleEdit(plan)
    })

    expect(result.current.open).toBe(true)
    expect(result.current.currentRow?.id).toBe('plan-1')
  })

  it('handles preview branches for no file, unresolved file and different preview kinds', async () => {
    const queryClient = createQueryClient()
    getDrillingMock.mockResolvedValue([])
    const { result } = renderHook(() => useDrillingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(getDrillingMock).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.handlePreview(buildDrillingPlan({ fileUrl: '' }))
    })
    expect(toastErrorMock).toHaveBeenCalledWith('engineering.drilling.toasts.noFile')

    resolveFileUrlMock.mockResolvedValueOnce('')
    await act(async () => {
      await result.current.handlePreview(buildDrillingPlan({ fileUrl: '/files/missing.pdf' }))
    })
    expect(toastErrorMock).toHaveBeenCalledWith('engineering.drilling.toasts.unResolved')

    resolveFileUrlMock.mockResolvedValueOnce('blob:cad-preview')
    await act(async () => {
      await result.current.handlePreview(buildDrillingPlan({ fileExtension: 'dwg' }))
    })
    expect(result.current.cadPreviewOpen).toBe(true)
    expect(result.current.previewFile?.url).toBe('blob:cad-preview')

    resolveFileUrlMock.mockResolvedValueOnce('blob:excel-preview')
    await act(async () => {
      await result.current.handlePreview(buildDrillingPlan({ fileExtension: 'xlsx' }))
    })
    expect(result.current.excelPreviewOpen).toBe(true)

    resolveFileUrlMock.mockResolvedValueOnce('blob:pdf-preview')
    await act(async () => {
      await result.current.handlePreview(buildDrillingPlan({ fileExtension: 'pdf' }))
    })
    expect(result.current.pdfPreviewOpen).toBe(true)
  })

  it('bridges handleDelete into confirmed action flow and delete mutation', async () => {
    getDrillingMock.mockResolvedValue([buildDrillingPlan()])
    deleteDrillingMock.mockResolvedValue(undefined)

    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDrillingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.filteredRows).toHaveLength(1)
    })

    act(() => {
      result.current.handleDelete(buildDrillingPlan())
    })

    expect(runConfirmedActionMock).toHaveBeenCalledWith(expect.objectContaining({
      confirmKey: 'engineering.drilling.toasts.deleteConfirm',
      onAction: expect.any(Function),
    }))

    await waitFor(() => {
      expect(deleteDrillingMock).toHaveBeenCalledWith('plan-1')
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY })
    expect(toastSuccessMock).toHaveBeenCalledWith('engineering.drilling.toasts.deleteSuccess')
  })

  it('saves create payloads and patches edited rows', async () => {
    const plan = buildDrillingPlan({ id: 'plan-edit', version: 3 })
    getDrillingMock.mockResolvedValue([plan])
    saveDrillingItemMock.mockResolvedValue(undefined)
    patchDrillingMock.mockResolvedValue(undefined)

    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useDrillingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.filteredRows).toHaveLength(1)
    })

    const createPayload = buildDrillingInput({ name: 'Create Plan' })
    await act(async () => {
      await result.current.handleSave({
        data: createPayload,
        isPatch: false,
      })
    })

    expect(saveDrillingItemMock).toHaveBeenCalledWith(createPayload)
    expect(toastSuccessMock).toHaveBeenCalledWith('engineering.drilling.toasts.saveSuccess')

    act(() => {
      result.current.handleEdit(plan)
    })

    const patchDelta: DeltaSet = {
      standardHoles: { o: '24', n: '28' },
    }

    await act(async () => {
      await result.current.handleSave({
        data: buildDrillingInput({ name: 'Edited Plan' }),
        isPatch: true,
        delta: patchDelta,
        version: 3,
      })
    })

    expect(patchDrillingMock).toHaveBeenCalledWith('plan-edit', patchDelta, 3)
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY })
    expect(toastSuccessMock).toHaveBeenCalledWith('engineering.drilling.toasts.updateSuccess')
    expect(result.current.open).toBe(false)
    expect(result.current.currentRow).toBeUndefined()
  })
})
