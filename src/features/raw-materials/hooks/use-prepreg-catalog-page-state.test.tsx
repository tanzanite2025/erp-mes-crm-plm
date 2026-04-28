// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_PREPREG_FORM, type PrepregMaterialSpec } from '../data/prepreg-material-spec-schema'

const {
  useSearchMock,
  navigateMock,
  toastSuccessMock,
  toastErrorMock,
  listMock,
  getBindingTokenMock,
  getByIdMock,
  saveMock,
  bindTokenToSpecMock,
  removeMock,
  useGetSuppliersMock,
} = vi.hoisted(() => ({
  useSearchMock: vi.fn(),
  navigateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  listMock: vi.fn(),
  getBindingTokenMock: vi.fn(),
  getByIdMock: vi.fn(),
  saveMock: vi.fn(),
  bindTokenToSpecMock: vi.fn(),
  removeMock: vi.fn(),
  useGetSuppliersMock: vi.fn(),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    getRouteApi: () => ({
      useSearch: useSearchMock,
      useNavigate: () => navigateMock,
    }),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key
      return `${key}:${JSON.stringify(params)}`
    },
  }),
}))

vi.mock('@/features/trading/supplier', () => ({
  useGetSuppliers: useGetSuppliersMock,
}))

vi.mock('../services/prepreg-material-spec-service', () => ({
  PrepregMaterialSpecService: {
    list: listMock,
    getBindingToken: getBindingTokenMock,
    getById: getByIdMock,
    save: saveMock,
    bindTokenToSpec: bindTokenToSpecMock,
    remove: removeMock,
  },
}))

import { usePrepregCatalogPageState } from './use-prepreg-catalog-page-state'

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

function buildSpec(overrides: Partial<PrepregMaterialSpec> = {}): PrepregMaterialSpec {
  return {
    id: 'spec-1',
    code: 'PP-001',
    name: 'Test Prepreg',
    displayAlias: 'Alias',
    supplierId: '',
    supplierProductCode: '',
    fiberModel: '',
    resinContentPercent: '35',
    widthMm: '1200',
    lengthM: '100',
    nominalAreaM2: '120',
    supplierBatchNo: 'BATCH-001',
    inspector: 'Inspector',
    boxNo: 'BOX-001',
    productionDate: '2026-04-29',
    description: '',
    status: 'Active',
    version: 1,
    createdAt: '2026-04-29T00:00:00.000Z',
    updatedAt: '2026-04-29T00:00:00.000Z',
    ...overrides,
  }
}

describe('usePrepregCatalogPageState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSearchMock.mockReturnValue({ bindToken: '' })
    navigateMock.mockResolvedValue(undefined)
    listMock.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 200,
    })
    getBindingTokenMock.mockResolvedValue({
      token: 'PREPREG-BIND-DEFAULT',
      status: 'UNBOUND',
      specId: '',
      specCode: '',
      specName: '',
      boundAt: '',
      expiresAt: '',
    })
    getByIdMock.mockResolvedValue(buildSpec())
    saveMock.mockResolvedValue(buildSpec())
    bindTokenToSpecMock.mockResolvedValue(undefined)
    removeMock.mockResolvedValue(undefined)
    useGetSuppliersMock.mockReturnValue({
      data: [],
      isLoading: false,
    })
  })

  it('enters binding mode for an unbound token', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => usePrepregCatalogPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled()
    })

    act(() => {
      result.current.setBindingTokenDialogOpen(true)
    })

    getBindingTokenMock.mockResolvedValueOnce({
      token: 'PREPREG-BIND-UNBOUND-001',
      status: 'UNBOUND',
      specId: '',
      specCode: '',
      specName: '',
      boundAt: '',
      expiresAt: '2026-05-04T00:00:00.000Z',
    })

    act(() => {
      result.current.submitBindingTokenInput('PREPREG-BIND-UNBOUND-001')
    })

    await waitFor(() => {
      expect(result.current.dialogOpen).toBe(true)
    })

    expect(result.current.bindingTokenDialogOpen).toBe(false)
    expect(result.current.activeBindingToken).toBe('PREPREG-BIND-UNBOUND-001')
    expect(result.current.editingSpec).toBeNull()
    expect(result.current.form).toEqual(EMPTY_PREPREG_FORM)
    expect(toastSuccessMock).toHaveBeenCalledWith('rawMaterials.catalog.toasts.bindingActivated')
  })

  it('opens the existing list item directly when the token is already bound', async () => {
    const existingSpec = buildSpec({ id: 'spec-existing', code: 'PP-EXIST' })
    listMock.mockResolvedValueOnce({
      items: [existingSpec],
      total: 1,
      page: 1,
      pageSize: 200,
    })

    const queryClient = createQueryClient()
    const { result } = renderHook(() => usePrepregCatalogPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.specs).toHaveLength(1)
    })

    act(() => {
      result.current.setBindingTokenDialogOpen(true)
    })

    getBindingTokenMock.mockResolvedValueOnce({
      token: 'PREPREG-BIND-BOUND-001',
      status: 'BOUND',
      specId: 'spec-existing',
      specCode: 'PP-EXIST',
      specName: 'Existing Spec',
      boundAt: '2026-04-29T00:00:00.000Z',
      expiresAt: '',
    })

    act(() => {
      result.current.submitBindingTokenInput('PREPREG-BIND-BOUND-001')
    })

    await waitFor(() => {
      expect(result.current.dialogOpen).toBe(true)
    })

    expect(result.current.bindingTokenDialogOpen).toBe(false)
    expect(result.current.editingSpec).toEqual(existingSpec)
    expect(getByIdMock).not.toHaveBeenCalled()
    expect(toastErrorMock).toHaveBeenCalledWith('rawMaterials.catalog.toasts.bindingAlreadyBound')
  })

  it('fetches detail and opens edit mode when the bound spec is not in the current list', async () => {
    const detailSpec = buildSpec({ id: 'spec-remote', code: 'PP-REMOTE' })
    getByIdMock.mockResolvedValueOnce(detailSpec)

    const queryClient = createQueryClient()
    const { result } = renderHook(() => usePrepregCatalogPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.specs).toEqual([])
    })

    act(() => {
      result.current.setBindingTokenDialogOpen(true)
    })

    getBindingTokenMock.mockResolvedValueOnce({
      token: 'PREPREG-BIND-BOUND-REMOTE',
      status: 'BOUND',
      specId: 'spec-remote',
      specCode: 'PP-REMOTE',
      specName: 'Remote Spec',
      boundAt: '2026-04-29T00:00:00.000Z',
      expiresAt: '',
    })

    act(() => {
      result.current.submitBindingTokenInput('PREPREG-BIND-BOUND-REMOTE')
    })

    await waitFor(() => {
      expect(result.current.editingSpec?.id).toBe('spec-remote')
    })

    expect(getByIdMock).toHaveBeenCalledWith('spec-remote')
    expect(result.current.dialogOpen).toBe(true)
    expect(result.current.bindingTokenDialogOpen).toBe(false)
    expect(toastErrorMock).toHaveBeenCalledWith('rawMaterials.catalog.toasts.bindingAlreadyBound')
  })

  it('shows an expired toast and does not enter binding mode when the token is expired', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => usePrepregCatalogPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled()
    })

    act(() => {
      result.current.setBindingTokenDialogOpen(true)
    })

    getBindingTokenMock.mockRejectedValueOnce({ status: 410 })

    act(() => {
      result.current.submitBindingTokenInput('PREPREG-BIND-EXPIRED-001')
    })

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('rawMaterials.catalog.toasts.bindingExpired')
    })

    expect(result.current.dialogOpen).toBe(false)
    expect(result.current.activeBindingToken).toBe('')
  })

  it('shows an invalid toast and skips lookup when the input cannot be parsed as a token', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => usePrepregCatalogPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled()
    })

    act(() => {
      result.current.submitBindingTokenInput('not-a-valid-binding-token')
    })

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('rawMaterials.catalog.toasts.bindingInvalid')
    })

    expect(getBindingTokenMock).not.toHaveBeenCalled()
    expect(result.current.dialogOpen).toBe(false)
    expect(result.current.activeBindingToken).toBe('')
  })

  it('shows an invalid toast when token lookup returns a validation/not-found error', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => usePrepregCatalogPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(listMock).toHaveBeenCalled()
    })

    getBindingTokenMock.mockRejectedValueOnce({ status: 400 })

    act(() => {
      result.current.submitBindingTokenInput('PREPREG-BIND-INVALID-001')
    })

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('rawMaterials.catalog.toasts.bindingInvalid')
    })

    expect(result.current.dialogOpen).toBe(false)
    expect(result.current.activeBindingToken).toBe('')
  })
})
