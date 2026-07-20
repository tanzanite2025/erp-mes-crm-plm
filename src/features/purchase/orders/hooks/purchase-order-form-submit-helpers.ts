import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'

function normalizePurchaseOrderLineForSubmit(
  line: PurchaseOrderLine,
  index: number
): PurchaseOrderLine {
  return {
    ...line,
    lineNo: index + 1,
    materialId: line.materialId || '',
    materialName: line.materialName?.trim() || '',
    materialCode: line.materialCode?.trim() || '',
    specification: line.specification?.trim() || '',
    uom: line.uom?.trim() || '',
    qty: Number(line.qty) || 0,
    price: Number(line.price) || 0,
    amount: Number(line.amount) || 0,
    receivedQty: Number(line.receivedQty) || 0,
    returnedQty: Number(line.returnedQty) || 0,
    note: line.note?.trim() || undefined,
  }
}

export function preparePurchaseOrderForSubmit(
  formData: PurchaseOrder
): PurchaseOrder {
  const normalizedLines = formData.lines.map(
    normalizePurchaseOrderLineForSubmit
  )

  return {
    ...formData,
    supplierId: formData.supplierId?.trim() || '',
    supplierName: formData.supplierName?.trim() || '',
    purchaser: formData.purchaser?.trim() || '',
    currency: formData.currency?.trim() || 'CNY',
    paymentMethod: formData.paymentMethod?.trim() || '',
    paymentMethodName: formData.paymentMethodName?.trim() || '',
    paymentTerm: formData.paymentTerm?.trim() || '',
    paymentTermName: formData.paymentTermName?.trim() || '',
    note: formData.note?.trim() || undefined,
    amount: Number(formData.amount) || 0,
    exchangeRate:
      formData.exchangeRate === undefined
        ? undefined
        : Number(formData.exchangeRate) || 0,
    lines: normalizedLines,
  }
}
