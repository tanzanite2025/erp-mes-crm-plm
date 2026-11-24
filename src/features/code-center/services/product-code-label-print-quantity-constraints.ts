export const MIN_PRODUCT_CODE_LABEL_PRINT_QUANTITY = 1
export const MAX_PRODUCT_CODE_LABEL_PRINT_QUANTITY = 200

export class ProductCodeLabelPrintQuantityError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_QUANTITY_INVALID'

  constructor(readonly quantity: number) {
    super(
      `Linear barcode print quantity must be between ${MIN_PRODUCT_CODE_LABEL_PRINT_QUANTITY} and ${MAX_PRODUCT_CODE_LABEL_PRINT_QUANTITY}.`
    )
    this.name = 'ProductCodeLabelPrintQuantityError'
  }
}

export function isSupportedProductCodeLabelPrintQuantity(quantity: number) {
  return (
    Number.isInteger(quantity) &&
    quantity >= MIN_PRODUCT_CODE_LABEL_PRINT_QUANTITY &&
    quantity <= MAX_PRODUCT_CODE_LABEL_PRINT_QUANTITY
  )
}

export function assertSupportedProductCodeLabelPrintQuantity(quantity: number) {
  if (!isSupportedProductCodeLabelPrintQuantity(quantity)) {
    throw new ProductCodeLabelPrintQuantityError(quantity)
  }
}

export function clampProductCodeLabelPrintQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return MIN_PRODUCT_CODE_LABEL_PRINT_QUANTITY
  return Math.min(
    MAX_PRODUCT_CODE_LABEL_PRINT_QUANTITY,
    Math.max(MIN_PRODUCT_CODE_LABEL_PRINT_QUANTITY, Math.floor(quantity))
  )
}
