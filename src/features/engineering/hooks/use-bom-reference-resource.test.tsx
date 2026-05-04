// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBOMReferenceResource } from './use-bom-reference-resource'

const {
  getProductsMock,
  getMaterialOptionsMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
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

describe('useBOMReferenceResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  it('returns ready with products and materials when all queries succeed', async () => {
    getProductsMock.mockResolvedValue([
      { id: 'product-1', sku: 'SKU-001', name: 'Product A' },
    ])
    getMaterialOptionsMock.mockResolvedValue([
      { id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' },
    ])

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
    })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns error and fails loudly when a query rejects', async () => {
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

  it('returns error when a query resolves to undefined', async () => {
    getProductsMock.mockResolvedValue(undefined)
    getMaterialOptionsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.status).toBe('error')
    if (result.current.status === 'error') {
      expect(result.current.scope).toBe('useBOMReferenceResource.products')
      expect(result.current.error.message).toContain('data is undefined')
      expect(failLoudlyMock).toHaveBeenCalledWith(result.current.error, 'useBOMReferenceResource.products')
    }
  })
})
