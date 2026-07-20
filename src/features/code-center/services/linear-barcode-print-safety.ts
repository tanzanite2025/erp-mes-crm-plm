export const MIN_LINEAR_BARCODE_PRINT_QUANTITY = 1
export const MAX_LINEAR_BARCODE_PRINT_QUANTITY = 200

export class LinearBarcodePrintQuantityError extends Error {
  readonly code = 'LINEAR_BARCODE_PRINT_QUANTITY_INVALID'

  constructor(readonly quantity: number) {
    super(
      `Linear barcode print quantity must be between ${MIN_LINEAR_BARCODE_PRINT_QUANTITY} and ${MAX_LINEAR_BARCODE_PRINT_QUANTITY}.`
    )
    this.name = 'LinearBarcodePrintQuantityError'
  }
}

export function isSupportedLinearBarcodePrintQuantity(quantity: number) {
  return (
    Number.isInteger(quantity) &&
    quantity >= MIN_LINEAR_BARCODE_PRINT_QUANTITY &&
    quantity <= MAX_LINEAR_BARCODE_PRINT_QUANTITY
  )
}

export function assertSupportedLinearBarcodePrintQuantity(quantity: number) {
  if (!isSupportedLinearBarcodePrintQuantity(quantity)) {
    throw new LinearBarcodePrintQuantityError(quantity)
  }
}

export function clampLinearBarcodePrintQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return MIN_LINEAR_BARCODE_PRINT_QUANTITY
  return Math.min(
    MAX_LINEAR_BARCODE_PRINT_QUANTITY,
    Math.max(MIN_LINEAR_BARCODE_PRINT_QUANTITY, Math.floor(quantity))
  )
}
