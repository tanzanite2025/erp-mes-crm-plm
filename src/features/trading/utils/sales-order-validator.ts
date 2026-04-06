import { type SalesOrder } from '../data/schema'

export interface SalesOrderValidationResult {
  isValid: boolean
  errorKey?: string
}

/**
 * 销售订单表单校验纯逻辑
 * 不包含 toast 触发，仅返回 isValid 状态与对应的多语言 Key
 */
export const validateSalesOrder = (
  formData: Partial<SalesOrder>,
  initialOrder: SalesOrder | null | undefined
): SalesOrderValidationResult => {
  const allowedEditStatuses = ['Draft', 'Pending']

  // 1. 状态锁定检查
  if (initialOrder && !allowedEditStatuses.includes(initialOrder.status)) {
    return { isValid: false, errorKey: 'tradingSalesOrder.headerFields.lockedMessage' }
  }

  // 2. 核心字段空值检查
  if (!formData.customerName) {
    return { isValid: false, errorKey: 'tradingSalesOrder.headerFields.customerPlaceholder' }
  }
  if (!formData.deliveryDate) {
    return { isValid: false, errorKey: 'tradingSalesOrder.headerFields.deliveryDeadline' }
  }

  // 3. 行项目完整性检查
  if (!formData.lines || formData.lines.length === 0) {
    return { isValid: false, errorKey: 'tradingSalesOrder.linesEditor.noLines' }
  }

  const hasInvalidLine = formData.lines.some(
    (line) => !line.productModel || (Number(line.qty) || 0) <= 0
  )
  if (hasInvalidLine) {
    return { isValid: false, errorKey: 'tradingSalesOrder.linesEditor.selectProduct' }
  }

  return { isValid: true }
}
