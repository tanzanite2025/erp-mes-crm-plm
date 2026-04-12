import { parseLinearBarcodeCode } from '@/features/basic-settings/utils/linear-barcode-parser'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import type { ScanResolveInput } from '../core/types'
import type {
  WheelBarcodeSnapshot,
  WheelIdentitySnapshot,
  WheelTracePayload,
} from '../models/wheel-trace'

export interface WheelTraceParserOptions {
  appearanceMapping?: Record<string, { label?: string }>
  products?: Array<{ modelCode?: string; name?: string; id?: string; sku?: string }>
}

export type WheelTraceParserContext = WheelTraceParserOptions

function toBarcodeSnapshot(rawCode: string): WheelBarcodeSnapshot {
  const normalized = normalizeMachineCode(rawCode)

  return {
    rawCode: normalized,
    protocol: 'linear-wheel-v1',
    year: normalized.slice(0, 2) || undefined,
    monthCode: normalized.slice(2, 3) || undefined,
    day: normalized.slice(3, 5) || undefined,
    modelCode: normalized.slice(5, 7) || undefined,
    appearanceCode: normalized.slice(7, 8) || undefined,
    holePrefix: normalized.slice(8, 9) || undefined,
    holes: normalized.slice(9, 11) || undefined,
    serial: normalized.slice(11, 15) || undefined,
  }
}

function toIdentitySnapshot(
  barcode: WheelBarcodeSnapshot,
  options: WheelTraceParserOptions = {}
): WheelIdentitySnapshot {
  const matchedProduct = options.products?.find((product) => product.modelCode === barcode.modelCode)
  const appearanceLabel = barcode.appearanceCode
    ? options.appearanceMapping?.[barcode.appearanceCode]?.label
    : undefined

  return {
    productId: matchedProduct?.id,
    productName: matchedProduct?.name,
    productSku: matchedProduct?.sku,
    modelCode: barcode.modelCode,
    modelName: matchedProduct?.name,
    appearanceCode: barcode.appearanceCode,
    appearanceLabel,
  }
}

export const wheelTraceParserService = {
  parse(
    input: ScanResolveInput<WheelTraceParserContext>
  ): Pick<WheelTracePayload, 'summary' | 'barcode' | 'identity' | 'warnings'> {
    const barcode = toBarcodeSnapshot(input.rawCode)
    const parsed = parseLinearBarcodeCode(barcode.rawCode, input.context)

    if (!parsed.isValid) {
      return {
        summary: parsed.error || '条码解析失败',
        barcode,
        identity: toIdentitySnapshot(barcode, input.context),
        warnings: [parsed.error || '当前条码不符合一维码协议。'],
      }
    }

    return {
      summary: parsed.display.fullDescription,
      barcode: {
        ...barcode,
        productionDate: `20${parsed.segments.year}-${parsed.segments.month}-${parsed.segments.day}`,
        shortTag: parsed.display.shortTag,
      },
      identity: toIdentitySnapshot(barcode, input.context),
      warnings: [],
    }
  },
}
