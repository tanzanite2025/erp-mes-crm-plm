import { type TranslationKey } from '@/locales'
import { toast } from 'sonner'
import { previewLineAmount, previewOrderTotals } from '@/lib/order-preview-calc'
import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'
import {
  DEFAULT_PURCHASE_ORDER,
  EMPTY_PURCHASE_ORDER_LINE,
} from './purchase-order-form-defaults'

type PurchaseOrderTranslate = (
  key: TranslationKey,
  params?: Record<string, string | number>
) => string

export function createNewPurchaseOrderDraft(
  purchaserName: string,
  exchangeRate: number
): PurchaseOrder {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const newId = `PO${now
    .toISOString()
    .replace(/[-:T.Z]/g, '')
    .slice(0, 14)}`

  return {
    ...DEFAULT_PURCHASE_ORDER,
    id: newId,
    orderNo: newId,
    orderDate: date,
    purchaser: purchaserName,
    currency: DEFAULT_PURCHASE_ORDER.currency || 'CNY',
    exchangeRate,
    lines: [EMPTY_PURCHASE_ORDER_LINE],
  }
}

export function appendPurchaseOrderLine(lines: PurchaseOrderLine[]): {
  lines: PurchaseOrderLine[]
  amount: number
} {
  const nextLines = [...lines, EMPTY_PURCHASE_ORDER_LINE]
  const { lines: reindexedLines, amount } = previewOrderTotals(nextLines)

  return {
    lines: reindexedLines as PurchaseOrderLine[],
    amount,
  }
}

export function removePurchaseOrderLine(
  lines: PurchaseOrderLine[],
  index: number
): {
  lines: PurchaseOrderLine[]
  amount: number
} {
  if (index < 0 || index >= lines.length) {
    throw new Error(
      `[CRITICAL] Cannot remove purchase order line at index ${index}: Lines missing or index out of bounds`
    )
  }

  const nextRawLines = lines.filter((_, lineIndex) => lineIndex !== index)
  const { lines: reindexedLines, amount } = previewOrderTotals(nextRawLines)

  return {
    lines: reindexedLines as PurchaseOrderLine[],
    amount,
  }
}

export function updatePurchaseOrderLine(
  lines: PurchaseOrderLine[],
  index: number,
  field: keyof PurchaseOrderLine,
  value: PurchaseOrderLine[keyof PurchaseOrderLine],
  extraData?: Partial<PurchaseOrderLine>
): {
  lines: PurchaseOrderLine[]
  amount: number
} {
  const nextLines = [...lines]
  const targetLine = nextLines[index]

  if (!targetLine) {
    throw new Error(
      `[CRITICAL] Update failed: Purchase line at index ${index} not found in state`
    )
  }

  nextLines[index] = { ...targetLine, [field]: value, ...extraData }

  if (field === 'qty' || field === 'price' || extraData) {
    const q = Number(nextLines[index].qty) || 0
    const p = Number(nextLines[index].price) || 0
    nextLines[index].amount = previewLineAmount(q, p)
  }

  const { lines: reindexedLines, amount } = previewOrderTotals(nextLines)

  return {
    lines: reindexedLines as PurchaseOrderLine[],
    amount,
  }
}

export function validatePurchaseOrderForm(
  formData: PurchaseOrder,
  t: PurchaseOrderTranslate,
  logValidationError: () => void
): boolean {
  if (!formData.supplierId) {
    logValidationError()
    toast.error(t('purchase.orders.validation.supplierRequired'))
    return false
  }

  if (!formData.lines || formData.lines.length === 0) {
    toast.error(t('purchase.orders.validation.linesRequired'))
    return false
  }

  const hasInvalidLine = formData.lines.some(
    (line) => !line.materialName || (Number(line.qty) || 0) <= 0
  )
  if (hasInvalidLine) {
    toast.error(t('purchase.orders.validation.lineInvalid'))
    return false
  }

  return true
}
