import type { TranslationKey } from '@/locales'
import { describe, expect, it } from 'vitest'
import type { LinearBarcodeProtocolConfig } from '@/features/basic-settings/data/linear-barcode-protocol'
import type { SalesOrder } from '@/features/trading/data/schema'
import { resolveLinearBarcodePrintLines } from './linear-barcode-print-resolver'

const translate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => `${key}:${params?.quantity ?? ''}`

const protocol = {
  version: '1',
  sequenceRuleKey: 'LINEAR_BARCODE_WHEEL',
  rules: [],
  mockInput: {
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
  ingestDefaults: {
    symbology: 'code128',
    scene: 'general',
    deviceId: 'PDA-01',
    scannedQty: 1,
    autoSubmit: false,
  },
} satisfies LinearBarcodeProtocolConfig

function buildOrder(quantity: number) {
  return {
    id: 'order-1',
    lines: [
      {
        lineNo: 1,
        productId: '8bf75715-c08b-4a99-b192-3cb2d6883e21',
        productModel: 'RIM-01',
        modelCodeSnapshot: '01',
        appearanceBarcodeCodeSnapshot: '1',
        holePrefixSnapshot: 'R',
        holeCount: 14,
        qty: quantity,
        uom: 'PCS',
      },
    ],
  } as SalesOrder
}

describe('resolveLinearBarcodePrintLines', () => {
  it('blocks a multi-quantity line until every label has a unique code', () => {
    const [line] = resolveLinearBarcodePrintLines({
      order: buildOrder(100),
      protocol,
      t: translate,
    })

    expect(line.isReady).toBe(false)
    expect(line.quantity).toBe(100)
    expect(line.issues).toContain(
      'codeCenter.linearBarcode.print.sections.preview.issues.uniqueCodesRequired:100'
    )
  })

  it('keeps the canonical preview serial at four characters', () => {
    const [line] = resolveLinearBarcodePrintLines({
      order: buildOrder(1),
      protocol,
      t: translate,
    })

    expect(line.isReady).toBe(true)
    expect(line.printInput?.barcodeConfig.serialNumber).toBe('****')
  })
})
