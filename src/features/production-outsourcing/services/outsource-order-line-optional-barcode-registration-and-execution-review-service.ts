import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'

export async function saveOutsourceOrderLineOptionalBarcodeRegistration(
  lineId: string,
  version: number,
  productBarcodes: string[]
) {
  await apiFetch<unknown>(
    `/production/outsourcing/order-lines/${encodeURIComponent(lineId)}/registered-barcodes`,
    { method: 'PUT', body: JSON.stringify({ version, productBarcodes }) }
  )
}

const outsourceExecutionDestinationSchema = z.object({
  routeStepId: z.string(),
  processName: z.string(),
  routeCompleted: z.boolean(),
  status: z.string(),
})
const outsourceExecutionBarcodeReviewSchema = z.object({
  lineId: z.string(),
  productBarcode: z.string(),
  productName: z.string(),
  action: z.enum(['SEND', 'RETURN', 'INSPECT']),
  routeStepId: z.string(),
  processName: z.string(),
  status: z.string(),
  availableQuantity: z.number().positive(),
  uom: z.string(),
  destinations: z.record(z.string(), outsourceExecutionDestinationSchema),
})
export type OutsourceExecutionBarcodeReview = z.infer<
  typeof outsourceExecutionBarcodeReviewSchema
>

export async function reviewOutsourceExecutionBarcodeForSelectedOrderLine(
  lineId: string,
  productBarcode: string,
  action: 'SEND' | 'RETURN' | 'INSPECT'
) {
  const normalizedBarcode = productBarcode.trim().toUpperCase()
  const response = outsourceExecutionBarcodeReviewSchema.parse(
    await apiFetch<unknown>(
      `/production/outsourcing/order-lines/${encodeURIComponent(lineId)}/barcode-review?${new URLSearchParams({ productBarcode: normalizedBarcode, action }).toString()}`
    )
  )
  if (
    response.lineId !== lineId ||
    response.productBarcode !== normalizedBarcode ||
    response.action !== action
  ) {
    throw new Error(
      'Barcode review does not match the selected outsource line, barcode or action'
    )
  }
  return response
}
