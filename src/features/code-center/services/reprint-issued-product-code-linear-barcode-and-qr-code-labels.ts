import type { IssuedProductCodeRecord } from '@/lib/product-code/issued-product-code-inventory-contracts'
import { openProductCodeLabelPrintPreview } from './product-code-label-print-preview'
import { assertSupportedProductCodeLabelPrintQuantity } from './product-code-label-print-quantity-constraints'

export function canReprintIssuedProductCodeLabel(
  item: IssuedProductCodeRecord,
  now = Date.now()
) {
  return (
    item.status === 'BOUND' ||
    (item.status === 'AVAILABLE' && Date.parse(item.expiresAt) > now)
  )
}

/** Reprints are presentation only: never reserve serials, mutate inventory, or scrap batches. */
export async function reprintIssuedProductCodeLinearBarcodeAndQrCodeLabels(
  items: readonly IssuedProductCodeRecord[]
) {
  assertSupportedProductCodeLabelPrintQuantity(items.length)
  if (items.some((item) => !canReprintIssuedProductCodeLabel(item))) {
    throw new Error('Only valid issued product codes can be reprinted.')
  }

  const preview = openProductCodeLabelPrintPreview()
  try {
    const labels = []
    for (const item of items) {
      const images = await preview.renderProductCodeSymbols(item.code)
      labels.push({
        ...images,
        batchNo: item.batchNo,
        code: item.code,
        fullText: item.code,
        templateName: `L${item.salesOrderLineNo}`,
      })
    }
    preview.showLabels(labels)
  } catch (error) {
    preview.showError(
      error instanceof Error
        ? error.message
        : 'Failed to reprint product-code labels.'
    )
    throw error
  }
}
