import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintRecordService } from '@/features/print-mgmt/services/print-record-service'
import {
  executeLinearBarcodePrint,
  executeLinearBarcodePrintJobs,
} from './linear-barcode-print-executor'
import { LinearBarcodePrintQuantityError } from './linear-barcode-print-safety'

const previewSession = vi.hoisted(() => ({
  close: vi.fn(),
  isOpen: vi.fn(() => true),
  renderBarcode: vi.fn(),
  showError: vi.fn(),
  showLabels: vi.fn(),
}))

const openPreview = vi.hoisted(() => vi.fn(() => previewSession))

vi.mock('./linear-barcode-print-preview', () => ({
  openLinearBarcodePrintPreview: openPreview,
}))

const executionParams = {
  salesOrderId: '9ae028c3-6540-4353-9240-d2385cd3b755',
  salesOrderLineNo: 1,
  quantity: 100,
  barcodeConfig: {
    modelCode: '01',
    appearanceCode: '1',
    category: 'R' as const,
    holes: 14,
    isDrainHole: false,
    wheelType: 'H' as const,
    scopeCode: '',
    suffix: '',
    serialNumber: '****',
  },
}

function createReservation(
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

describe('executeLinearBarcodePrint', () => {
  beforeEach(() => {
    previewSession.renderBarcode.mockResolvedValue(
      'data:image/png;base64,barcode-image'
    )
  })

  it('blocks quantities above the atomic batch limit before opening a preview', async () => {
    const createBatch = vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')

    await expect(
      executeLinearBarcodePrint({ ...executionParams, quantity: 201 })
    ).rejects.toBeInstanceOf(LinearBarcodePrintQuantityError)
    expect(openPreview).not.toHaveBeenCalled()
    expect(createBatch).not.toHaveBeenCalled()
  })

  it('renders 100 distinct persisted codes in one printable preview', async () => {
    const reservation = createReservation(100)
    const createBatch = vi
      .spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValue(reservation)

    const result = await executeLinearBarcodePrint(executionParams)

    expect(createBatch).toHaveBeenCalledWith({
      salesOrderId: executionParams.salesOrderId,
      salesOrderLineNo: 1,
      quantity: 100,
    })
    expect(previewSession.renderBarcode).toHaveBeenCalledTimes(100)
    expect(previewSession.showLabels).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ code: '26719011R140001' }),
        expect.objectContaining({ code: '26719011R140100' }),
      ])
    )
    expect(new Set(result.codes).size).toBe(100)
    expect(result.startSerialNumber).toBe('0001')
    expect(result.endSerialNumber).toBe('0100')
  })

  it('scraps every stored code when the printable document cannot be exposed', async () => {
    const reservation = createReservation(3)
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch').mockResolvedValue(
      reservation
    )
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.showLabels.mockImplementationOnce(() => {
      throw new Error('preview closed')
    })

    await expect(
      executeLinearBarcodePrint({ ...executionParams, quantity: 3 })
    ).rejects.toThrow('preview closed')
    expect(scrap).toHaveBeenCalledWith(reservation.batch.id)
  })
})

describe('executeLinearBarcodePrintJobs', () => {
  it('combines multiple order lines into one preview window', async () => {
    vi.spyOn(PrintRecordService, 'createLinearBarcodeBatch')
      .mockResolvedValueOnce(createReservation(2, 'batch-1'))
      .mockResolvedValueOnce(createReservation(2, 'batch-2', 3))

    const outcomes = await executeLinearBarcodePrintJobs([
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
})
