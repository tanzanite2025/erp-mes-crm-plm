import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'
import { queryProductionExecutionProductBarcodeCurrentProcess } from './production-execution-product-barcode-current-process-query-service'

const productionExecutionStateApiFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api-client', () => ({
  apiFetch: productionExecutionStateApiFetch,
}))

const recordedProductBarcodeState = {
  productBarcode: 'PRODUCT/001',
  productName: '测试产品',
  routeId: 'route-1',
  routeStepId: 'step-1',
  currentProcessStepId: 'process-1',
  currentProcessStep: { id: 'process-1', code: 'CUT', name: '裁切' },
  status: 'IN_PROGRESS',
}

beforeEach(() => {
  productionExecutionStateApiFetch.mockReset()
})

describe('production execution barcode context read boundary', () => {
  it('normalizes and encodes the barcode, passes cancellation and performs a read', async () => {
    productionExecutionStateApiFetch.mockResolvedValue(
      recordedProductBarcodeState
    )
    const controller = new AbortController()
    await expect(
      queryProductionExecutionProductBarcodeCurrentProcess(
        ' product/001 ',
        controller.signal
      )
    ).resolves.toEqual(recordedProductBarcodeState)
    expect(productionExecutionStateApiFetch).toHaveBeenCalledWith(
      '/production/product-barcode-states/PRODUCT%2F001',
      {
        signal: controller.signal,
        suppressErrorStatuses: [404],
      }
    )
  })

  it('treats only a genuine 404 as a product without recorded execution', async () => {
    productionExecutionStateApiFetch.mockRejectedValue(
      createApiClientError({ kind: 'http', status: 404, message: 'not found' })
    )
    await expect(
      queryProductionExecutionProductBarcodeCurrentProcess('PRODUCT/001')
    ).resolves.toBeNull()
  })

  it.each([403, 500])(
    'propagates HTTP %s so a failed read cannot become a first start',
    async (status) => {
      const error = createApiClientError({
        kind: 'http',
        status,
        message: 'read failed',
      })
      productionExecutionStateApiFetch.mockRejectedValue(error)
      await expect(
        queryProductionExecutionProductBarcodeCurrentProcess('PRODUCT/001')
      ).rejects.toBe(error)
    }
  )

  it('rejects a response belonging to another product', async () => {
    productionExecutionStateApiFetch.mockResolvedValue({
      ...recordedProductBarcodeState,
      productBarcode: 'OTHER',
    })
    await expect(
      queryProductionExecutionProductBarcodeCurrentProcess('PRODUCT/001')
    ).rejects.toThrow('different product barcode')
  })

  it.each([
    { ...recordedProductBarcodeState, status: 'UNKNOWN' },
    { ...recordedProductBarcodeState, currentProcessStepId: null },
  ])(
    'rejects malformed context instead of allowing execution',
    async (response) => {
      productionExecutionStateApiFetch.mockResolvedValue(response)
      await expect(
        queryProductionExecutionProductBarcodeCurrentProcess('PRODUCT/001')
      ).rejects.toThrow()
    }
  )

  it('rejects empty barcodes without requesting data', async () => {
    await expect(
      queryProductionExecutionProductBarcodeCurrentProcess(' ')
    ).rejects.toThrow('required')
    expect(productionExecutionStateApiFetch).not.toHaveBeenCalled()
  })
})
