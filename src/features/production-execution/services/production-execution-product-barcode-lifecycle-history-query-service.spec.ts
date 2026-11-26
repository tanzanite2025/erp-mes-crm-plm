import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'
import { queryProductionExecutionProductBarcodeLifecycleHistory } from './production-execution-product-barcode-lifecycle-history-query-service'

const productionExecutionLifecycleApiFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api-client', () => ({
  apiFetch: productionExecutionLifecycleApiFetch,
}))

const productionExecutionLifecyclePage = {
  currentState: {
    id: 'state-1',
    productBarcode: 'PRODUCT/001',
    productId: 'product-1',
    productName: 'Test product',
    routeId: 'route-1',
    routeStepId: 'step-1',
    currentProcessStepId: 'operation-1',
    currentProcessStep: {
      id: 'operation-1',
      code: 'CUT',
      name: 'Cutting',
    },
    status: 'IN_PROGRESS',
    lastEventId: 'event-1',
    startedAt: '',
    completedAt: '',
    updatedAt: '2026-11-13T09:00:00Z',
  },
  stateEvents: [],
  stateEventTotal: 0,
  operationExecutions: [],
  operationExecutionTotal: 0,
  transferEvents: [],
  transferEventTotal: 0,
  limit: 50,
  offset: 0,
}

beforeEach(() => {
  productionExecutionLifecycleApiFetch.mockReset()
})

describe('production execution product barcode lifecycle history query', () => {
  it('normalizes and encodes the barcode, passes offset and cancellation, and validates identity', async () => {
    productionExecutionLifecycleApiFetch.mockResolvedValue({
      ...productionExecutionLifecyclePage,
      offset: 50,
    })
    const controller = new AbortController()

    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory(
        ' product/001 ',
        50,
        controller.signal
      )
    ).resolves.toMatchObject({
      currentState: productionExecutionLifecyclePage.currentState,
      offset: 50,
    })
    expect(productionExecutionLifecycleApiFetch).toHaveBeenCalledWith(
      '/production/product-barcode-lifecycle/PRODUCT%2F001?limit=50&offset=50',
      { signal: controller.signal, suppressErrorStatuses: [404] }
    )
  })

  it('treats the lifecycle-specific 404 as a product without production state', async () => {
    productionExecutionLifecycleApiFetch.mockRejectedValue(
      createApiClientError({
        kind: 'http',
        status: 404,
        code: 'PRODUCT_BARCODE_LIFECYCLE_NOT_FOUND',
        message: '[NOT_FOUND] 产品编码生命周期不存在',
      })
    )
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001')
    ).resolves.toBeNull()
  })

  it('propagates an unrelated 404 so a route or proxy failure cannot appear as no history', async () => {
    const error = createApiClientError({
      kind: 'http',
      status: 404,
      message: 'route not found',
    })
    productionExecutionLifecycleApiFetch.mockRejectedValue(error)
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001')
    ).rejects.toBe(error)
  })

  it.each([403, 500])(
    'propagates HTTP %s so a failed read cannot be treated as a first start',
    async (status) => {
      const error = createApiClientError({
        kind: 'http',
        status,
        message: 'read failed',
      })
      productionExecutionLifecycleApiFetch.mockRejectedValue(error)
      await expect(
        queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001')
      ).rejects.toBe(error)
    }
  )

  it('rejects lifecycle records that belong to a different barcode', async () => {
    productionExecutionLifecycleApiFetch.mockResolvedValue({
      ...productionExecutionLifecyclePage,
      stateEvents: [
        {
          id: 'event-2',
          stateId: 'state-1',
          productBarcode: 'OTHER',
          eventType: 'START',
          fromProcessStepId: '',
          toProcessStepId: 'operation-1',
          routeId: 'route-1',
          routeStepId: 'step-1',
          operator: 'operator',
          payloadSnapshot: '{}',
          occurredAt: '2026-11-13T09:00:00Z',
        },
      ],
      stateEventTotal: 1,
    })
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001')
    ).rejects.toThrow('different product barcode')
  })

  it('rejects a server response for a different page range', async () => {
    productionExecutionLifecycleApiFetch.mockResolvedValue({
      ...productionExecutionLifecyclePage,
      offset: 50,
    })
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001')
    ).rejects.toThrow('does not match the requested range')
  })

  it('rejects malformed lifecycle data and invalid offsets without reading', async () => {
    productionExecutionLifecycleApiFetch.mockResolvedValue({
      ...productionExecutionLifecyclePage,
      currentState: {
        ...productionExecutionLifecyclePage.currentState,
        status: 'UNKNOWN',
      },
    })
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001')
    ).rejects.toThrow()
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory('PRODUCT/001', -1)
    ).rejects.toThrow('non-negative integer')
    await expect(
      queryProductionExecutionProductBarcodeLifecycleHistory(' ')
    ).rejects.toThrow('required')
    expect(productionExecutionLifecycleApiFetch).toHaveBeenCalledTimes(1)
  })
})
