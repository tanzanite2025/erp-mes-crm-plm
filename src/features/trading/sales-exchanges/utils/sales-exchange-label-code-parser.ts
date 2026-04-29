import type { SalesOrder, SalesOrderLine } from '@/features/trading/data/schema'
import type {
  SalesExchangeLineDraft,
  SalesExchangeRecognizedLabelCode,
  SalesExchangeUnmatchedLabelCode,
} from '../types/sales-exchange-types'

const salesExchangeScannerTextSegmentSeparators = /[\s,;，；、]+/g

function appendNormalizedSalesExchangeLabelCode(
  targetLabelCodes: Set<string>,
  value: unknown
) {
  if (typeof value !== 'string') {
    return
  }

  const normalizedLabelCode =
    normalizeSalesExchangeLabelCodeForComparison(value)
  if (!normalizedLabelCode || normalizedLabelCode.length > 256) {
    return
  }

  targetLabelCodes.add(normalizedLabelCode)
}

function extractSalesExchangeLabelCodesFromUnknownPayload(
  payload: unknown,
  targetLabelCodes: Set<string>
) {
  if (typeof payload === 'string') {
    appendNormalizedSalesExchangeLabelCode(targetLabelCodes, payload)
    return
  }

  if (Array.isArray(payload)) {
    payload.forEach((item) =>
      extractSalesExchangeLabelCodesFromUnknownPayload(item, targetLabelCodes)
    )
    return
  }

  if (!payload || typeof payload !== 'object') {
    return
  }

  const payloadRecord = payload as Record<string, unknown>
  ;[
    'code',
    'barcode',
    'labelCode',
    'tagCode',
    'packageCode',
    'boxCode',
    'cartonCode',
    'outerCode',
  ].forEach((key) => {
    appendNormalizedSalesExchangeLabelCode(targetLabelCodes, payloadRecord[key])
  })
  ;[
    'codes',
    'barcodes',
    'labelCodes',
    'items',
    'children',
    'components',
  ].forEach((key) => {
    extractSalesExchangeLabelCodesFromUnknownPayload(
      payloadRecord[key],
      targetLabelCodes
    )
  })
}

function buildSalesExchangeLineSearchTokens(
  salesOrderLine: SalesOrderLine
): string[] {
  return [
    salesOrderLine.productCode,
    salesOrderLine.productModel,
    salesOrderLine.appearanceBarcodeCodeSnapshot,
    salesOrderLine.customerPartNo,
    salesOrderLine.jobNo,
  ]
    .map((value) =>
      typeof value === 'string'
        ? normalizeSalesExchangeLabelCodeForComparison(value)
        : ''
    )
    .filter((value) => value.length >= 3)
}

function findSalesExchangeLineMatchingLabelCode(
  salesOrderLines: SalesOrderLine[],
  normalizedLabelCode: string
) {
  const exactMatch = salesOrderLines.find((salesOrderLine) =>
    buildSalesExchangeLineSearchTokens(salesOrderLine).some(
      (token) => token === normalizedLabelCode
    )
  )
  if (exactMatch) {
    return exactMatch
  }

  return salesOrderLines.find((salesOrderLine) =>
    buildSalesExchangeLineSearchTokens(salesOrderLine).some((token) =>
      normalizedLabelCode.includes(token)
    )
  )
}

export function normalizeSalesExchangeLabelCodeForComparison(value: string) {
  return value.trim().toUpperCase()
}

export function extractSalesExchangeLabelCodesFromScannerInput(rawInput: string) {
  const extractedLabelCodes = new Set<string>()
  const trimmedInput = rawInput.trim()

  if (!trimmedInput) {
    return []
  }

  appendNormalizedSalesExchangeLabelCode(extractedLabelCodes, trimmedInput)

  try {
    extractSalesExchangeLabelCodesFromUnknownPayload(
      JSON.parse(trimmedInput),
      extractedLabelCodes
    )
  } catch {
    // Plain scanner text is expected most of the time.
  }

  trimmedInput
    .split(salesExchangeScannerTextSegmentSeparators)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const keyValueSeparatorIndex = segment.indexOf('=')
      if (
        keyValueSeparatorIndex > 0 &&
        keyValueSeparatorIndex < segment.length - 1
      ) {
        appendNormalizedSalesExchangeLabelCode(
          extractedLabelCodes,
          segment.slice(keyValueSeparatorIndex + 1)
        )
        return
      }

      segment
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) =>
          appendNormalizedSalesExchangeLabelCode(extractedLabelCodes, part)
        )
    })

  return Array.from(extractedLabelCodes)
}

export function buildSalesExchangeRecognizedLabelCodesFromScannerInput(
  rawInput: string
): SalesExchangeRecognizedLabelCode[] {
  const recognizedAt = new Date().toISOString()

  return extractSalesExchangeLabelCodesFromScannerInput(rawInput).map(
    (normalizedLabelCode) => ({
      rawLabelCode: normalizedLabelCode,
      normalizedLabelCode,
      recognizedAt,
      recognitionSource: 'scannerInput',
    })
  )
}

export function buildSalesExchangeLineDraftFromSalesOrderLine(
  salesOrderLine: SalesOrderLine,
  recognizedLabelCodes: SalesExchangeRecognizedLabelCode[] = []
): SalesExchangeLineDraft {
  const exchangeQuantity = Math.max(1, recognizedLabelCodes.length)

  return {
    lineDraftId: `sales-exchange-line-${salesOrderLine.id ?? salesOrderLine.lineNo}`,
    salesOrderLineId: Number(salesOrderLine.id),
    lineNo: salesOrderLine.lineNo,
    productId: salesOrderLine.productId,
    productCode: salesOrderLine.productCode,
    productModel: salesOrderLine.productModel,
    specification: salesOrderLine.specification,
    description: salesOrderLine.description,
    uom: salesOrderLine.uom,
    originalOrderQuantity: salesOrderLine.qty,
    deliveredQuantity: salesOrderLine.deliveredQty,
    exchangeQuantity,
    replacementMode: 'sameSalesOrderLineItem',
    replacementProductCode: salesOrderLine.productCode,
    replacementProductModel: salesOrderLine.productModel,
    issueCategory: '',
    issueDescription: '',
    recognizedLabelCodes,
  }
}

export function mergeSalesExchangeRecognizedLabelCodes(
  currentLabelCodes: SalesExchangeRecognizedLabelCode[],
  incomingLabelCodes: SalesExchangeRecognizedLabelCode[]
) {
  const mergedLabelCodesByNormalizedValue = new Map<
    string,
    SalesExchangeRecognizedLabelCode
  >()

  currentLabelCodes.forEach((labelCode) => {
    mergedLabelCodesByNormalizedValue.set(
      labelCode.normalizedLabelCode,
      labelCode
    )
  })
  incomingLabelCodes.forEach((labelCode) => {
    mergedLabelCodesByNormalizedValue.set(
      labelCode.normalizedLabelCode,
      labelCode
    )
  })

  return Array.from(mergedLabelCodesByNormalizedValue.values())
}

export function buildSalesExchangeLineDraftsFromRecognizedLabelCodes(params: {
  sourceSalesOrder: SalesOrder
  currentLineDrafts: SalesExchangeLineDraft[]
  incomingRecognizedLabelCodes: SalesExchangeRecognizedLabelCode[]
}) {
  const { sourceSalesOrder, currentLineDrafts, incomingRecognizedLabelCodes } =
    params
  const salesOrderLines = (sourceSalesOrder.lines ?? []).filter(
    (salesOrderLine) => typeof salesOrderLine.id === 'number'
  )
  const lineDraftsBySalesOrderLineId = new Map<number, SalesExchangeLineDraft>()
  const unmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[] = []

  currentLineDrafts.forEach((lineDraft) => {
    lineDraftsBySalesOrderLineId.set(lineDraft.salesOrderLineId, lineDraft)
  })

  incomingRecognizedLabelCodes.forEach((recognizedLabelCode) => {
    const matchedSalesOrderLine = findSalesExchangeLineMatchingLabelCode(
      salesOrderLines,
      recognizedLabelCode.normalizedLabelCode
    )

    if (!matchedSalesOrderLine || typeof matchedSalesOrderLine.id !== 'number') {
      unmatchedLabelCodes.push({
        ...recognizedLabelCode,
        unmatchedReason: 'Unable to automatically match label code to a sales order line',
      })
      return
    }

    const currentLineDraft = lineDraftsBySalesOrderLineId.get(
      matchedSalesOrderLine.id
    )
    const nextRecognizedLabelCodes = mergeSalesExchangeRecognizedLabelCodes(
      currentLineDraft?.recognizedLabelCodes ?? [],
      [recognizedLabelCode]
    )

    lineDraftsBySalesOrderLineId.set(
      matchedSalesOrderLine.id,
      currentLineDraft
        ? {
            ...currentLineDraft,
            exchangeQuantity: Math.max(
              currentLineDraft.exchangeQuantity,
              nextRecognizedLabelCodes.length
            ),
            recognizedLabelCodes: nextRecognizedLabelCodes,
          }
        : buildSalesExchangeLineDraftFromSalesOrderLine(
            matchedSalesOrderLine,
            nextRecognizedLabelCodes
          )
    )
  })

  return {
    lineDrafts: Array.from(lineDraftsBySalesOrderLineId.values()).sort(
      (left, right) => left.lineNo - right.lineNo
    ),
    unmatchedLabelCodes,
  }
}
