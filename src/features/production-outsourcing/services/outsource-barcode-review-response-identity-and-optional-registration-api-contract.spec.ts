import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  reviewOutsourceExecutionBarcodeForSelectedOrderLine,
  saveOutsourceOrderLineOptionalBarcodeRegistration,
} from './outsource-order-line-optional-barcode-registration-and-execution-review-service'

const outsourceBarcodeApiFetch = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api-client', () => ({ apiFetch: outsourceBarcodeApiFetch }))

const selectedOutsourceLineBarcodeReview = {
  lineId: 'line/1',
  productBarcode: 'BC/001',
  productName: '产品甲',
  action: 'SEND',
  routeStepId: 'step-1',
  processName: '电镀',
  status: 'IN_PROGRESS',
  availableQuantity: 2,
  uom: 'PCS',
  destinations: {},
}

beforeEach(() => outsourceBarcodeApiFetch.mockReset())

describe('outsource barcode review identity and optional registration', () => {
  it('normalizes a barcode and reads the selected line without executing a command', async () => {
    outsourceBarcodeApiFetch.mockResolvedValue(
      selectedOutsourceLineBarcodeReview
    )
    await expect(
      reviewOutsourceExecutionBarcodeForSelectedOrderLine(
        'line/1',
        ' bc/001 ',
        'SEND'
      )
    ).resolves.toEqual(selectedOutsourceLineBarcodeReview)
    expect(outsourceBarcodeApiFetch).toHaveBeenCalledExactlyOnceWith(
      '/production/outsourcing/order-lines/line%2F1/barcode-review?productBarcode=BC%2F001&action=SEND'
    )
  })

  it.each([
    { lineId: 'another-line' },
    { productBarcode: 'ANOTHER-BARCODE' },
    { action: 'INSPECT' },
  ])(
    'rejects a mismatched review before confirmation can be enabled',
    async (mismatch) => {
      outsourceBarcodeApiFetch.mockResolvedValue({
        ...selectedOutsourceLineBarcodeReview,
        ...mismatch,
      })
      await expect(
        reviewOutsourceExecutionBarcodeForSelectedOrderLine(
          'line/1',
          'BC/001',
          'SEND'
        )
      ).rejects.toThrow('does not match')
    }
  )

  it('saves an empty registration through its own command and propagates failures', async () => {
    outsourceBarcodeApiFetch.mockResolvedValue({})
    await saveOutsourceOrderLineOptionalBarcodeRegistration('line/1', 3, [])
    expect(outsourceBarcodeApiFetch).toHaveBeenCalledExactlyOnceWith(
      '/production/outsourcing/order-lines/line%2F1/registered-barcodes',
      {
        method: 'PUT',
        body: JSON.stringify({ version: 3, productBarcodes: [] }),
      }
    )
    outsourceBarcodeApiFetch.mockRejectedValueOnce(
      new Error('version conflict')
    )
    await expect(
      saveOutsourceOrderLineOptionalBarcodeRegistration('line/1', 3, ['BC/001'])
    ).rejects.toThrow('version conflict')
  })
})
