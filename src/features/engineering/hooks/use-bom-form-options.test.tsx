// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBOMFormOptions } from './use-bom-form-options'

const {
  getProductsMock,
  getChangeOrdersMock,
  getMaterialOptionsMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
  getChangeOrdersMock: vi.fn(),
  getMaterialOptionsMock: vi.fn(),
  failLoudlyMock: vi.fn(),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('../services/product-core-service', () => ({
  ProductCoreService: {
    getProducts: getProductsMock,
  },
}))

vi.mock('../services/change-order-service', () => ({
  changeOrderService: {
    getChangeOrders: getChangeOrdersMock,
  },
}))

vi.mock('../../material-archive/services/material-core-service', () => ({
  MaterialCoreService: {
    getMaterialOptions: getMaterialOptionsMock,
  },
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

describe('useBOMFormOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns loading while any option query is still pending', () => {
    getProductsMock.mockImplementation(() => new Promise(() => undefined))
    getChangeOrdersMock.mockResolvedValue([])
    getMaterialOptionsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMFormOptions({ open: true, selectedProductId: 'product-1' }), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current).toEqual({ status: 'loading' })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns ready with products, materials and change orders when all queries succeed', async () => {
    getProductsMock.mockResolvedValue([
      { id: 'product-1', sku: 'SKU-001', name: 'Product A' },
    ])
    getChangeOrdersMock.mockResolvedValue([
      { id: 'eco-1', title: 'ECO-001', productId: 'product-1', status: 'draft', description: '', createdAt: '', version: 1, changeOrderNo: 'ECO-001', changeType: 'ECO', siteCode: '', revisionNo: 'R1', isDefaultSite: true, effectiveFrom: '', effectiveTo: '' },
    ])
    getMaterialOptionsMock.mockResolvedValue([
      { id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMFormOptions({ open: true, selectedProductId: 'product-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current).toEqual({
      status: 'ready',
      products: [{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }],
      changeOrders: [{ id: 'eco-1', title: 'ECO-001', productId: 'product-1', status: 'draft', description: '', createdAt: '', version: 1, changeOrderNo: 'ECO-001', changeType: 'ECO', siteCode: '', revisionNo: 'R1', isDefaultSite: true, effectiveFrom: '', effectiveTo: '' }],
      materials: [{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }],
    })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns error and fails loudly when a query rejects', async () => {
    const error = new Error('materials load failed')
    getProductsMock.mockResolvedValue([{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }])
    getChangeOrdersMock.mockResolvedValue([])
    getMaterialOptionsMock.mockRejectedValue(error)

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMFormOptions({ open: true, selectedProductId: 'product-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current).toEqual({
      status: 'error',
      error,
      scope: 'useBOMFormOptions.materials',
    })
    expect(failLoudlyMock).toHaveBeenCalledWith(error, 'useBOMFormOptions.materials')
  })

  it('returns error when a query resolves to undefined', async () => {
    getProductsMock.mockResolvedValue(undefined)
    getChangeOrdersMock.mockResolvedValue([])
    getMaterialOptionsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMFormOptions({ open: true, selectedProductId: 'product-1' }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.status).toBe('error')
    if (result.current.status === 'error') {
      expect(result.current.scope).toBe('useBOMFormOptions.products')
      expect(result.current.error.message).toContain('data is undefined')
      expect(failLoudlyMock).toHaveBeenCalledWith(result.current.error, 'useBOMFormOptions.products')
    }
  })
})
