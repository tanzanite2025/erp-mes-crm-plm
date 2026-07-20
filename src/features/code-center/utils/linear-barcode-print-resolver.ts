import type { TranslationKey } from '@/locales'
import {
  formatLinearBarcodeMonthValue,
  type LinearBarcodeMockInputs,
  type LinearBarcodeProtocolConfig,
} from '@/features/basic-settings/data/linear-barcode-protocol'
import { numberingService } from '@/features/basic-settings/services/numbering-service'
import { type BarcodeConfig } from '@/features/engineering/data/schema'
import { type SalesOrder } from '@/features/trading/data/schema'

const PREVIEW_SERIAL_LENGTH = 4

export interface LinearBarcodePrintInput {
  salesOrderId: string
  productId: string
  productLabel: string
  lineNo: number
  quantity: number
  uom: string
  sequenceRuleKey: string
  mockInputs: LinearBarcodeMockInputs
  barcodeConfig: BarcodeConfig
}

export interface LinearBarcodeResolvedPrintLine {
  key: string
  lineNo: number
  productLabel: string
  orderQuantity: number
  quantity: number
  uom: string
  issues: string[]
  isReady: boolean
  printInput?: LinearBarcodePrintInput
}

type TranslateFn = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

interface ResolveLinearBarcodePrintLinesParams {
  order?: SalesOrder
  protocol?: LinearBarcodeProtocolConfig
  t: TranslateFn
  now?: Date
}

function normalizeWheelType(value: string): BarcodeConfig['wheelType'] {
  if (value === 'F' || value === 'R' || value === 'H') {
    return value
  }

  return 'H'
}

function buildMockInputs(
  protocol: LinearBarcodeProtocolConfig | undefined,
  line: SalesOrder['lines'][number],
  now: Date
): LinearBarcodeMockInputs {
  const defaultSerial = numberingService.previewSequence(PREVIEW_SERIAL_LENGTH)
  const protocolMockInput = protocol?.mockInput

  return {
    year: now.getFullYear().toString().slice(-2),
    month: formatLinearBarcodeMonthValue(now),
    day: String(now.getDate()).padStart(2, '0'),
    model: line.modelCodeSnapshot || '',
    appearance: line.appearanceBarcodeCodeSnapshot || '',
    holePrefix: line.holePrefixSnapshot || '',
    holes:
      line.holeCount !== undefined
        ? String(line.holeCount).padStart(2, '0')
        : '',
    serial: defaultSerial,
    isDrainHole: protocolMockInput?.isDrainHole ?? false,
    wheelType: protocolMockInput?.wheelType || 'H',
    scopeCode: protocolMockInput?.scopeCode || '',
  }
}

function buildBarcodeConfig(
  line: SalesOrder['lines'][number],
  mockInputs: LinearBarcodeMockInputs
): BarcodeConfig {
  return {
    modelCode: line.modelCodeSnapshot || '01',
    appearanceCode: line.appearanceBarcodeCodeSnapshot || '1',
    category: (line.holePrefixSnapshot || 'R') as BarcodeConfig['category'],
    holes: line.holeCount ?? 0,
    isDrainHole: mockInputs.isDrainHole,
    wheelType: normalizeWheelType(mockInputs.wheelType),
    scopeCode: mockInputs.scopeCode,
    suffix: '',
    serialNumber: numberingService.previewSequence(PREVIEW_SERIAL_LENGTH),
  }
}

export function resolveLinearBarcodePrintLines({
  order,
  protocol,
  t,
  now = new Date(),
}: ResolveLinearBarcodePrintLinesParams): LinearBarcodeResolvedPrintLine[] {
  if (!order) {
    return []
  }

  return order.lines.map((line) => {
    const issues: string[] = []

    if (!line.productId) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.productMissing'
        )
      )
    }
    if (!line.modelCodeSnapshot) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.modelCodeMissing'
        )
      )
    }
    if (!line.holePrefixSnapshot) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.holePrefixMissing'
        )
      )
    }
    if (!line.appearanceBarcodeCodeSnapshot) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.appearanceCodeMissing'
        )
      )
    }
    if (line.holeCount === undefined) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.holeCountMissing'
        )
      )
    }
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.quantityInvalid'
        )
      )
    }
    if (!protocol?.sequenceRuleKey) {
      issues.push(
        t(
          'codeCenter.linearBarcode.print.sections.preview.issues.sequenceRuleKeyMissing'
        )
      )
    }

    const productLabel = line.productModel || line.productCode || '--'
    const key = `${order.id}-${line.lineNo}`

    if (issues.length > 0 || !line.productId || !protocol?.sequenceRuleKey) {
      return {
        key,
        lineNo: line.lineNo,
        productLabel,
        orderQuantity: line.qty,
        quantity: line.qty,
        uom: line.uom,
        issues,
        isReady: false,
      }
    }

    const mockInputs = buildMockInputs(protocol, line, now)
    const barcodeConfig = buildBarcodeConfig(line, mockInputs)

    return {
      key,
      lineNo: line.lineNo,
      productLabel,
      orderQuantity: line.qty,
      quantity: line.qty,
      uom: line.uom,
      issues,
      isReady: true,
      printInput: {
        salesOrderId: order.id,
        productId: line.productId,
        productLabel,
        lineNo: line.lineNo,
        quantity: line.qty,
        uom: line.uom,
        sequenceRuleKey: protocol.sequenceRuleKey,
        mockInputs,
        barcodeConfig,
      },
    }
  })
}
