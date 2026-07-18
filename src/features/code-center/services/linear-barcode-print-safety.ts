export const SUPPORTED_LINEAR_BARCODE_CODES_PER_PRINT = 1

export class LinearBarcodeUniqueCodesRequiredError extends Error {
  readonly code = 'LINEAR_BARCODE_UNIQUE_CODES_REQUIRED'

  constructor(readonly quantity: number) {
    super(
      `Cannot print ${quantity} labels from one linear-barcode serial number.`
    )
    this.name = 'LinearBarcodeUniqueCodesRequiredError'
  }
}

export function isSupportedLinearBarcodePrintQuantity(quantity: number) {
  return (
    Number.isInteger(quantity) &&
    quantity === SUPPORTED_LINEAR_BARCODE_CODES_PER_PRINT
  )
}

export function assertSupportedLinearBarcodePrintQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new RangeError(
      'Linear barcode print quantity must be a positive integer.'
    )
  }

  if (!isSupportedLinearBarcodePrintQuantity(quantity)) {
    throw new LinearBarcodeUniqueCodesRequiredError(quantity)
  }
}
