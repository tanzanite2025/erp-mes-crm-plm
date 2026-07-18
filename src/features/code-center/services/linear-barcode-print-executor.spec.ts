import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintRecordService } from '@/features/print-mgmt/services/print-record-service'
import { executeLinearBarcodePrint } from './linear-barcode-print-executor'
import { LinearBarcodeUniqueCodesRequiredError } from './linear-barcode-print-safety'

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
  productId: '8bf75715-c08b-4a99-b192-3cb2d6883e21',
  quantity: 1,
  templateName: 'SO-LINEAR-SO-001-L1',
  barcodeInput: {
    year: '25',
    month: '1',
    day: '01',
    model: '01',
    appearance: '1',
    holePrefix: 'R',
    holes: '14',
    serial: '0001',
    isDrainHole: false,
    wheelType: 'H',
    scopeCode: '',
  },
  barcodeConfig: {
    modelCode: '01',
    appearanceCode: '1',
    category: 'R' as const,
    holes: 14,
    isDrainHole: false,
    wheelType: 'H' as const,
    scopeCode: '',
    suffix: '',
    serialNumber: '0001',
  },
}

const batch = {
  id: 'batch-1',
  batchNo: 'P20260719-001',
  templateName: executionParams.templateName,
  productId: executionParams.productId,
  startSn: '0001',
  fullCode: '25101011R140001',
  quantity: 1,
  activatedCount: 0,
  status: 'Printed' as const,
  createdAt: '2026-07-19T00:00:00Z',
  version: 1,
}

describe('executeLinearBarcodePrint', () => {
  beforeEach(() => {
    previewSession.renderBarcode.mockResolvedValue(
      'data:image/png;base64,barcode-image'
    )
  })

  it('blocks duplicate physical labels before opening or persisting anything', async () => {
    const addBatch = vi.spyOn(PrintRecordService, 'addBatch')

    await expect(
      executeLinearBarcodePrint({ ...executionParams, quantity: 100 })
    ).rejects.toBeInstanceOf(LinearBarcodeUniqueCodesRequiredError)
    expect(openPreview).not.toHaveBeenCalled()
    expect(addBatch).not.toHaveBeenCalled()
  })

  it('persists the exact 15-character code before exposing the printable label', async () => {
    const addBatch = vi
      .spyOn(PrintRecordService, 'addBatch')
      .mockResolvedValue(batch)

    const result = await executeLinearBarcodePrint(executionParams)

    expect(previewSession.renderBarcode).toHaveBeenCalledWith('25101011R140001')
    expect(addBatch).toHaveBeenCalledWith({
      templateName: executionParams.templateName,
      productId: executionParams.productId,
      quantity: 1,
      startSn: '0001',
      fullCode: '25101011R140001',
    })
    expect(previewSession.showLabels).toHaveBeenCalledWith([
      expect.objectContaining({
        batchNo: batch.batchNo,
        code: '25101011R140001',
      }),
    ])
    expect(result.code).toBe('25101011R140001')
  })

  it('scraps the new batch when the printable document cannot be exposed', async () => {
    vi.spyOn(PrintRecordService, 'addBatch').mockResolvedValue(batch)
    const scrap = vi.spyOn(PrintRecordService, 'scrap').mockResolvedValue(true)
    previewSession.showLabels.mockImplementationOnce(() => {
      throw new Error('preview closed')
    })

    await expect(executeLinearBarcodePrint(executionParams)).rejects.toThrow(
      'preview closed'
    )
    expect(scrap).toHaveBeenCalledWith(batch.id)
  })
})
