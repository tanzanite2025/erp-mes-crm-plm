import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintRecordService } from '@/features/print-mgmt/services/print-record-service'
import {
  executeProductCodeLabelPrint,
  executeProductCodeLabelPrintJobs,
} from './product-code-label-print-executor'
import { ProductCodeLabelPrintQuantityError } from './product-code-label-print-quantity-constraints'
import {
  canReprintIssuedProductCodeLabel,
  reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels,
} from './reprint-issued-product-code-linear-barcode-and-qr-code-labels'

const previewSession = vi.hoisted(() => ({
  close: vi.fn(),
  isOpen: vi.fn(() => true),
  renderProductCodeSymbols: vi.fn(),
  showError: vi.fn(),
  showLabels: vi.fn(),
}))

const openPreview = vi.hoisted(() => vi.fn(() => previewSession))

vi.mock('./product-code-label-print-preview', () => ({
  openProductCodeLabelPrintPreview: openPreview,
}))

const executionParams = {
  salesOrderId: '9ae028c3-6540-4353-9240-d2385cd3b755',
  salesOrderLineId: 101,
  salesOrderLineNo: 1,
  quantity: 100,
  labelReadableTextOptions: {
    isDrainHole: false,
    wheelType: 'H' as const,
    scopeCode: '',
  },
}

function createIssuedProductCodeReservation(
  quantity: number,
  batchId = 'batch-1',
  startSequence = 1
) {
  const items = Array.from({ length: quantity }, (_, index) => {
    const serialNumber = String(startSequence + index).padStart(4, '0')
    return {
      id: `${batchId}-item-${index + 1}`,
      batchId,
      batchNo: 'P20260719-001',
      productId: '8bf75715-c08b-4a99-b192-3cb2d6883e21',
      salesOrderId: executionParams.salesOrderId,
      salesOrderLineNo: executionParams.salesOrderLineNo,
      code: `26719011R14${serialNumber}`,
      serialNumber,
      status: 'AVAILABLE' as const,
      expiresAt: '2026-08-18T00:00:00Z',
      createdAt: '2026-07-19T00:00:00Z',
      version: 1,
    }
  })
  return {
    batch: {
      id: batchId,
      batchNo: 'P20260719-001',
      templateName: 'SO-LINEAR-SO-001-L1',
      productId: items[0]?.productId,
      startSn: items[0]?.serialNumber,
      endSn: items[items.length - 1]?.serialNumber,
      salesOrderId: executionParams.salesOrderId,
      salesOrderLineNo: executionParams.salesOrderLineNo,
      quantity,
      activatedCount: 0,
      status: 'Printed' as const,
      expiresAt: '2026-08-18T00:00:00Z',
      createdAt: '2026-07-19T00:00:00Z',
      version: 1,
    },
    items,
  }
}

beforeEach(() => {
  previewSession.renderProductCodeSymbols.mockReset().mockResolvedValue({
    linearBarcodeDataUrl: 'data:image/png;base64,barcode-image',
    qrCodeDataUrl: 'data:image/png;base64,qr-image',
  })
})

describe('executeProductCodeLabelPrint', () => {
  it('blocks quantities above the atomic batch limit before opening a preview', async () => {
    const createBatch = vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')

    await expect(
      executeProductCodeLabelPrint({ ...executionParams, quantity: 201 })
    ).rejects.toBeInstanceOf(ProductCodeLabelPrintQuantityError)
    expect(openPreview).not.toHaveBeenCalled()
    expect(createBatch).not.toHaveBeenCalled()
  })

  it('issues 100 codes once and renders one pair of symbols per persisted code', async () => {
    const reservation = createIssuedProductCodeReservation(100)
    const createBatch = vi
      .spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValue(reservation)

    const result = await executeProductCodeLabelPrint(executionParams)

    expect(createBatch).toHaveBeenCalledWith({
      salesOrderId: executionParams.salesOrderId,
      salesOrderLineId: executionParams.salesOrderLineId,
      salesOrderLineNo: 1,
      quantity: 100,
    })
    expect(createBatch).toHaveBeenCalledTimes(1)
    expect(previewSession.renderProductCodeSymbols).toHaveBeenCalledTimes(100)
    reservation.items.forEach((item, index) => {
      expect(previewSession.renderProductCodeSymbols).toHaveBeenNthCalledWith(
        index + 1,
        item.code
      )
    })
    expect(previewSession.showLabels).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          code: '26719011R140001',
          linearBarcodeDataUrl: 'data:image/png;base64,barcode-image',
          qrCodeDataUrl: 'data:image/png;base64,qr-image',
        }),
        expect.objectContaining({ code: '26719011R140100' }),
      ])
    )
    expect(new Set(result.codes).size).toBe(100)
    expect(result.startSerialNumber).toBe('0001')
    expect(result.endSerialNumber).toBe('0100')
  })

  it('keeps label decorations out of both symbol payloads', async () => {
    const reservation = createIssuedProductCodeReservation(1)
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch').mockResolvedValue(
      reservation
    )

    const result = await executeProductCodeLabelPrint({
      ...executionParams,
      quantity: 1,
      labelReadableTextOptions: {
        isDrainHole: true,
        wheelType: 'F',
        scopeCode: ' abc ',
      },
    })

    expect(
      previewSession.renderProductCodeSymbols
    ).toHaveBeenCalledExactlyOnceWith(reservation.items[0].code)
    expect(result.code).toBe(reservation.items[0].code)
    expect(result.fullText).toBe(`H${result.code} F-ABC`)
    expect(previewSession.showLabels).toHaveBeenCalledWith([
      expect.objectContaining({ code: result.code, fullText: result.fullText }),
    ])
  })

  it('scraps every stored code when the printable document cannot be exposed', async () => {
    const reservation = createIssuedProductCodeReservation(3)
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch').mockResolvedValue(
      reservation
    )
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.showLabels.mockImplementationOnce(() => {
      throw new Error('preview closed')
    })

    await expect(
      executeProductCodeLabelPrint({ ...executionParams, quantity: 3 })
    ).rejects.toThrow('preview closed')
    expect(scrap).toHaveBeenCalledWith(reservation.batch.id)
  })

  it('scraps a newly issued batch when either symbol cannot be rendered', async () => {
    const reservation = createIssuedProductCodeReservation(1)
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch').mockResolvedValue(
      reservation
    )
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.renderProductCodeSymbols.mockRejectedValueOnce(
      new Error('QR render failed')
    )

    await expect(
      executeProductCodeLabelPrint({ ...executionParams, quantity: 1 })
    ).rejects.toThrow('QR render failed')
    expect(scrap).toHaveBeenCalledExactlyOnceWith(reservation.batch.id)
    expect(previewSession.showLabels).not.toHaveBeenCalled()
  })
})

describe('executeProductCodeLabelPrintJobs', () => {
  it('combines multiple order lines into one preview window', async () => {
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValueOnce(createIssuedProductCodeReservation(2, 'batch-1'))
      .mockResolvedValueOnce(
        createIssuedProductCodeReservation(2, 'batch-2', 3)
      )

    const outcomes = await executeProductCodeLabelPrintJobs([
      { key: 'line-1', params: { ...executionParams, quantity: 2 } },
      {
        key: 'line-2',
        params: { ...executionParams, salesOrderLineNo: 2, quantity: 2 },
      },
    ])

    expect(openPreview).toHaveBeenCalledTimes(1)
    expect(previewSession.showLabels).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: '26719011R140001' }),
        expect.objectContaining({ code: '26719011R140004' }),
      ])
    )
    const labels = previewSession.showLabels.mock.calls[0]?.[0] ?? []
    expect(
      new Set(labels.map((label: { code: string }) => label.code)).size
    ).toBe(4)
    expect(outcomes).toHaveLength(2)
    expect(
      outcomes.every((outcome) => outcome.result?.codes.length === 2)
    ).toBe(true)
  })

  it('preserves successful jobs when one job fails to render its symbol pair', async () => {
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValueOnce(
        createIssuedProductCodeReservation(1, 'batch-1', 1)
      )
      .mockResolvedValueOnce(
        createIssuedProductCodeReservation(1, 'batch-2', 2)
      )
      .mockResolvedValueOnce(
        createIssuedProductCodeReservation(1, 'batch-3', 3)
      )
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.renderProductCodeSymbols.mockImplementation(
      async (code: string) => {
        if (code.endsWith('0002')) throw new Error('QR failed for second job')
        return {
          linearBarcodeDataUrl: 'data:linear-' + code,
          qrCodeDataUrl: 'data:qr-' + code,
        }
      }
    )
    const outcomes = await executeProductCodeLabelPrintJobs(
      [1, 2, 3].map((line) => ({
        key: 'line-' + line,
        params: { ...executionParams, quantity: 1, salesOrderLineNo: line },
      }))
    )
    expect(outcomes.map((outcome) => Boolean(outcome.result))).toEqual([
      true,
      false,
      true,
    ])
    expect(scrap).toHaveBeenCalledExactlyOnceWith('batch-2')
    const labels = previewSession.showLabels.mock.calls[0][0]
    expect(labels.map((label: { code: string }) => label.code)).toEqual([
      '26719011R140001',
      '26719011R140003',
    ])
  })

  it('stops issuing the next job when the preview closes during rendering', async () => {
    const createBatch = vi
      .spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValue(createIssuedProductCodeReservation(1))
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.renderProductCodeSymbols.mockImplementationOnce(async () => {
      previewSession.isOpen.mockReturnValue(false)
      throw new Error('preview closed')
    })
    try {
      const outcomes = await executeProductCodeLabelPrintJobs(
        [1, 2].map((line) => ({
          key: 'line-' + line,
          params: { ...executionParams, quantity: 1, salesOrderLineNo: line },
        }))
      )
      expect(createBatch).toHaveBeenCalledTimes(1)
      expect(scrap).toHaveBeenCalledExactlyOnceWith('batch-1')
      expect(
        outcomes.every((outcome) => outcome.error && !outcome.result)
      ).toBe(true)
      expect(previewSession.showLabels).not.toHaveBeenCalled()
    } finally {
      previewSession.isOpen.mockReturnValue(true)
    }
  })

  it('scraps all newly prepared batches when the combined document cannot be shown', async () => {
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValueOnce(
        createIssuedProductCodeReservation(1, 'batch-1', 1)
      )
      .mockResolvedValueOnce(
        createIssuedProductCodeReservation(1, 'batch-2', 2)
      )
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.showLabels.mockImplementationOnce(() => {
      throw new Error('preview closed')
    })
    const outcomes = await executeProductCodeLabelPrintJobs(
      [1, 2].map((line) => ({
        key: 'line-' + line,
        params: { ...executionParams, quantity: 1, salesOrderLineNo: line },
      }))
    )
    expect(scrap.mock.calls.map(([id]) => id).sort()).toEqual([
      'batch-1',
      'batch-2',
    ])
    expect(outcomes.every((outcome) => outcome.error && !outcome.result)).toBe(
      true
    )
  })
})

describe('reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels', () => {
  it('reprints the original code without issuing numbers or scrapping inventory', async () => {
    const item = {
      ...createIssuedProductCodeReservation(1).items[0],
      expiresAt: '2099-01-01T00:00:00Z',
    }
    const createBatch = vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
    const scrap = vi.spyOn(PrintRecordService, 'scrap')

    await reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels([item])
    expect(
      previewSession.renderProductCodeSymbols
    ).toHaveBeenCalledExactlyOnceWith(item.code)
    expect(previewSession.showLabels).toHaveBeenCalledWith([
      expect.objectContaining({ code: item.code, fullText: item.code }),
    ])
    expect(createBatch).not.toHaveBeenCalled()
    expect(scrap).not.toHaveBeenCalled()
  })

  it('keeps existing inventory intact when reprint rendering fails', async () => {
    const item = {
      ...createIssuedProductCodeReservation(1).items[0],
      status: 'BOUND' as const,
    }
    const scrap = vi.spyOn(PrintRecordService, 'scrap')
    const createBatch = vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
    previewSession.renderProductCodeSymbols.mockRejectedValueOnce(
      new Error('QR render failed')
    )

    await expect(
      reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels([item])
    ).rejects.toThrow('QR render failed')
    expect(createBatch).not.toHaveBeenCalled()
    expect(scrap).not.toHaveBeenCalled()
  })

  it('does not mutate existing inventory when the reprint document cannot be shown', async () => {
    const item = {
      ...createIssuedProductCodeReservation(1).items[0],
      status: 'BOUND' as const,
    }
    const createBatch = vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
    const scrap = vi.spyOn(PrintRecordService, 'scrap')
    previewSession.showLabels.mockImplementationOnce(() => {
      throw new Error('preview closed')
    })
    await expect(
      reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels([item])
    ).rejects.toThrow('preview closed')
    expect(createBatch).not.toHaveBeenCalled()
    expect(scrap).not.toHaveBeenCalled()
  })

  it('rejects expiration at the exact cutoff and invalid timestamps while allowing bound labels', () => {
    const item = createIssuedProductCodeReservation(1).items[0]
    const cutoff = Date.parse(item.expiresAt)
    expect(canReprintIssuedProductCodeLabel(item, cutoff - 1)).toBe(true)
    expect(canReprintIssuedProductCodeLabel(item, cutoff)).toBe(false)
    expect(canReprintIssuedProductCodeLabel(item, cutoff + 1)).toBe(false)
    expect(
      canReprintIssuedProductCodeLabel(
        { ...item, expiresAt: 'invalid' },
        cutoff
      )
    ).toBe(false)
    expect(
      canReprintIssuedProductCodeLabel({ ...item, status: 'BOUND' }, cutoff + 1)
    ).toBe(true)
  })

  it.each(['EXPIRED', 'SCRAPPED', 'AVAILABLE'] as const)(
    'rejects unavailable %s inventory before opening a preview',
    async (status) => {
      const item = {
        ...createIssuedProductCodeReservation(1).items[0],
        status,
        expiresAt: '2000-01-01T00:00:00Z',
      }
      await expect(
        reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels([item])
      ).rejects.toThrow()
      expect(openPreview).not.toHaveBeenCalled()
    }
  )
})
