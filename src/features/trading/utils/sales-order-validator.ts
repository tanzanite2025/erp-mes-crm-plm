import { type SalesOrder, type SalesOrderFormValues } from '../data/schema'
import { isSalesOrderEditable } from './sales-order-actions'

export type SalesOrderValidationErrorKey =
  | 'tradingSalesOrder.headerFields.lockedMessage'
  | 'tradingSalesOrder.headerFields.customerPlaceholder'
  | 'tradingSalesOrder.headerFields.deliveryDeadline'
  | 'tradingSalesOrder.linesEditor.noLines'
  | 'tradingSalesOrder.linesEditor.selectProduct'

export interface SalesOrderValidationResult {
  isValid: boolean
  errorKey?: SalesOrderValidationErrorKey
}

/**
 * UI-side validation only. Backend lifecycle guards remain authoritative.
 */
export const validateSalesOrder = (
  formData: SalesOrderFormValues,
  initialOrder: SalesOrder | null | undefined
): SalesOrderValidationResult => {
  if (initialOrder && !isSalesOrderEditable(initialOrder)) {
    return {
      isValid: false,
      errorKey: 'tradingSalesOrder.headerFields.lockedMessage',
    }
  }

  if (!formData.customerName) {
    return {
      isValid: false,
      errorKey: 'tradingSalesOrder.headerFields.customerPlaceholder',
    }
  }
  if (!formData.deliveryDate) {
    return {
      isValid: false,
      errorKey: 'tradingSalesOrder.headerFields.deliveryDeadline',
    }
  }

  if (!formData.lines || formData.lines.length === 0) {
    return { isValid: false, errorKey: 'tradingSalesOrder.linesEditor.noLines' }
  }

  const hasInvalidLine = formData.lines.some(
    (line) => !line.productModel || (Number(line.qty) || 0) <= 0
  )
  if (hasInvalidLine) {
    return {
      isValid: false,
      errorKey: 'tradingSalesOrder.linesEditor.selectProduct',
    }
  }

  return { isValid: true }
}
