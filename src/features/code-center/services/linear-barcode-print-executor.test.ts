import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BarcodeConfig } from '@/features/engineering/data/schema'
import type { PrintBatch } from '@/features/print-mgmt/services/print-record-service'

const {
  generateCodeMock,
  getFullTextMock,
  atomicPrintMock,
  loggerInfoMock,
  createLoggerMock,
} = vi.hoisted(() => {
  const loggerInfoMock = vi.fn()

  return {
    generateCodeMock: vi.fn(),
    getFullTextMock: vi.fn(),
    atomicPrintMock: vi.fn(),
    loggerInfoMock,
    createLoggerMock: vi.fn(() => ({
      info: loggerInfoMock,
    })),
  }
})

vi.mock('@/features/print-mgmt/services/barcode-service', () => ({
  BarcodeService: {
    generateCode: generateCodeMock,
    getFullText: getFullTextMock,
  },
}))

vi.mock('@/features/print-mgmt/services/print-record-service', () => ({
  PrintRecordService: {
    atomicPrint: atomicPrintMock,
  },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: createLoggerMock,
}))

import { executeLinearBarcodePrint } from './linear-barcode-print-executor'

function createBarcodeConfig(overrides: Partial<BarcodeConfig> = {}): BarcodeConfig {
  return {
    modelCode: '12',
    appearanceCode: 'A',
    category: 'B',
    holes: 8,
    serialNumber: '12345',
    isDrainHole: false,
    wheelType: 'L',
    scopeCode: 'ab',
    ...overrides,
  } as BarcodeConfig
}

function createBatch(overrides: Partial<PrintBatch> = {}): PrintBatch {
  return {
    id: 'batch-1',
    batchNo: 'P20260423-001',
    templateName: 'LINEAR_TEMPLATE',
    productId: 'product-1',
    quantity: 3,
    activatedCount: 0,
    status: 'Printed',
    createdAt: '2026-04-23T15:20:00.000Z',
    version: 1,
    ...overrides,
  }
}

describe('linear-barcode-print-executor', () => {
  beforeEach(() => {
    generateCodeMock.mockReset()
    getFullTextMock.mockReset()
    atomicPrintMock.mockReset()
    loggerInfoMock.mockReset()
  })

  it('orchestrates barcode generation, print submission, and result assembly', async () => {
    const barcodeConfig = createBarcodeConfig({
      serialNumber: '90001',
    })
    const batch = createBatch({
      templateName: 'LINEAR_BARCODE_PRINT',
      quantity: 5,
    })

    generateCodeMock.mockReturnValue('BARCODE-001')
    getFullTextMock.mockReturnValue('H-BARCODE-001 L-AB')
    atomicPrintMock.mockResolvedValue({
      batch,
      sn: 'SN-20260423-001',
    })

    const result = await executeLinearBarcodePrint({
      productId: 'product-1',
      quantity: 5,
      templateName: 'LINEAR_BARCODE_PRINT',
      barcodeConfig,
    })

    expect(generateCodeMock).toHaveBeenCalledWith(barcodeConfig)
    expect(getFullTextMock).toHaveBeenCalledWith(barcodeConfig, 'BARCODE-001')
    expect(atomicPrintMock).toHaveBeenCalledWith({
      templateName: 'LINEAR_BARCODE_PRINT',
      productId: 'product-1',
      quantity: 5,
    })
    expect(result).toEqual({
      code: 'BARCODE-001',
      fullText: 'H-BARCODE-001 L-AB',
      serialNumber: '90001',
      batch,
      sn: 'SN-20260423-001',
    })
  })

  it('records preparation and generated-code logs', async () => {
    const barcodeConfig = createBarcodeConfig()

    generateCodeMock.mockReturnValue('BARCODE-002')
    getFullTextMock.mockReturnValue('BARCODE-002 L-AB')
    atomicPrintMock.mockResolvedValue({
      batch: createBatch(),
      sn: 'SN-20260423-002',
    })

    await executeLinearBarcodePrint({
      productId: 'product-2',
      quantity: 2,
      templateName: 'TEMPLATE-2',
      barcodeConfig,
    })

    expect(loggerInfoMock).toHaveBeenCalledTimes(2)
    expect(loggerInfoMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Preparing linear barcode print: quantity=2, template=TEMPLATE-2')
    )
    expect(loggerInfoMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('Generated code: BARCODE-002, readable text: BARCODE-002 L-AB')
    )
  })
})
