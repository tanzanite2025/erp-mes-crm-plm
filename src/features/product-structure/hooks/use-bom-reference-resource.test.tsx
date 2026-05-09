// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBOMReferenceResource } from './use-bom-reference-resource'

const {
  getProductsMock,
  getMaterialOptionsMock,
  useBOMSectionOptionsMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
  getMaterialOptionsMock: vi.fn(),
  useBOMSectionOptionsMock: vi.fn(),
  failLoudlyMock: vi.fn(),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('@/features/engineering/services/product-core-service', () => ({
  ProductCoreService: {
    getProducts: getProductsMock,
  },
}))

vi.mock('../../material-archive/services/material-core-service', () => ({
  MaterialCoreService: {
    getMaterialOptions: getMaterialOptionsMock,
  },
}))

vi.mock('./use-bom-section-config', () => ({
  useBOMSectionOptions: useBOMSectionOptionsMock,
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function buildSectionQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
    error: null,
    isPending: false,
    ...overrides,
  }
}

describe('useBOMReferenceResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBOMSectionOptionsMock.mockReturnValue(buildSectionQuery())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns loading while any reference query is still pending', () => {
    getProductsMock.mockImplementation(() => new Promise(() => undefined))
    getMaterialOptionsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current).toEqual({ status: 'loading' })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns ready with products, materials and sections when all queries succeed', async () => {
    getProductsMock.mockResolvedValue([{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }])
    getMaterialOptionsMock.mockResolvedValue([{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current).toEqual({
      status: 'ready',
      products: [{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }],
      materials: [{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }],
      sections: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
    })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns error and fails loudly when materials query rejects', async () => {
    const error = new Error('materials load failed')
    getProductsMock.mockResolvedValue([{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }])
    getMaterialOptionsMock.mockRejectedValue(error)

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current).toEqual({
      status: 'error',
      error,
      scope: 'useBOMReferenceResource.materials',
    })
    expect(failLoudlyMock).toHaveBeenCalledWith(error, 'useBOMReferenceResource.materials')
  })

  it('returns error when sections query resolves to undefined', async () => {
    getProductsMock.mockResolvedValue([{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }])
    getMaterialOptionsMock.mockResolvedValue([{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }])
    useBOMSectionOptionsMock.mockReturnValue(buildSectionQuery({ data: undefined }))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.status).toBe('error')
    if (result.current.status === 'error') {
      expect(result.current.scope).toBe('useBOMReferenceResource.sections')
      expect(result.current.error.message).toContain('Missing BOM reference sections query data')
      expect(failLoudlyMock).toHaveBeenCalledWith(result.current.error, 'useBOMReferenceResource.sections')
    }
  })
})
